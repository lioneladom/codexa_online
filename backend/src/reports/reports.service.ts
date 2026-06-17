import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';

const RISK_WEIGHTS: Record<string, number> = {
  "focus lost": 2,
  "lost window focus": 2,
  "window/tab switched": 2,
  "browser opened": 15,
  "browser launched": 15,
  "ai tool detected": 20,
  "usb inserted": 15,
  "large paste": 10,
  "prohibited shortcut": 5,
  "clipboard paste": 5,
  "monitor changed": 15,
  "session crash": 10,
};

function riskWeight(eventType: string): number {
  const normalized = (eventType || "").trim().toLowerCase();
  for (const [key, score] of Object.entries(RISK_WEIGHTS)) {
    if (normalized.includes(key)) {
      return score;
    }
  }
  return 5;
}

function riskCategory(score: number): "Normal" | "Review" | "Suspicious" | "High Risk" {
  if (score <= 20) return "Normal";
  if (score <= 50) return "Review";
  if (score <= 80) return "Suspicious";
  return "High Risk";
}

function riskRecommendation(score: number): string {
  const category = riskCategory(score);
  if (category === "Normal") return "No integrity review needed unless other evidence exists.";
  if (category === "Review") return "Review the event timeline before releasing final marks.";
  if (category === "Suspicious") return "Manual review advised before confirming the result.";
  return "High-priority integrity review required.";
}

function percent(score: number, maxScore: number): number {
  return maxScore ? Math.round((score / maxScore) * 100 * 100) / 100 : 0;
}

function difficultyLabel(value: number): "Easy" | "Moderate" | "Hard" | "Very Hard" {
  if (value < 0.25) return "Easy";
  if (value < 0.5) return "Moderate";
  if (value < 0.75) return "Hard";
  return "Very Hard";
}

export interface FullExamReport {
  exam: any;
  exam_summary: any;
  analytics: any;
  rankings: any[];
  clean_rankings: any[];
  question_stats: any[];
  insights: string[];
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async buildExamReport(examId: string): Promise<FullExamReport | null> {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: { orderBy: { position: 'asc' } },
        examSessions: true,
      }
    });

    if (!exam) return null;

    const submissions = await this.prisma.examSession.findMany({
      where: { examId },
      include: { submissions: { include: { question: true, results: true } }, activityLogs: true },
      orderBy: { startedAt: 'asc' }
    });

    const maxScore = exam.questions.reduce((sum, q) => sum + q.marks, 0);
    const questionMarks: Record<string, number> = {};
    const questionMeta: Record<string, any> = {};
    exam.questions.forEach(q => {
      questionMarks[q.id] = q.marks;
      questionMeta[q.id] = { id: q.id, position: q.position, type: q.type, marks: q.marks, questionText: q.questionText };
    });

    const rows: any[] = [];
    const questionScores: Record<string, number[]> = {};
    const questionAttempts: Record<string, number> = {};
    const questionFullMarks: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const riskCounts: Record<string, number> = {};
    const eventCounts: Record<string, number> = {};

    for (const sub of submissions) {
      let score = 0;
      let answered = 0;
      const answerRows: any[] = [];

      for (const submission of sub.submissions) {
        const qid = submission.questionId;
        const marks = questionMarks[qid] || 0;
        const earned = submission.score || 0;
        score += earned;
        answered += 1;
        if (!questionScores[qid]) questionScores[qid] = [];
        questionScores[qid].push(earned);
        questionAttempts[qid] = (questionAttempts[qid] || 0) + 1;
        if (marks && earned >= marks) {
          questionFullMarks[qid] = (questionFullMarks[qid] || 0) + 1;
        }
        answerRows.push({
          questionId: qid,
          type: submission.question?.type,
          score: earned,
          maxScore: marks
        });
      }

      const timeline: any[] = [];
      let riskScore = 0;
      for (const event of sub.activityLogs) {
        const weight = riskWeight(event.eventType);
        riskScore += weight;
        eventCounts[event.eventType] = (eventCounts[event.eventType] || 0) + 1;
        timeline.push({ id: event.id, timestamp: event.timestamp, eventType: event.eventType, description: event.metadata, weight });
      }
      riskScore = Math.min(riskScore, 100);
      const category = riskCategory(riskScore);
      riskCounts[category] = (riskCounts[category] || 0) + 1;

      const status = sub.completedAt ? (sub.warningCount > 3 ? "Auto-submitted" : "Submitted") : "In Progress";
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const percentage = percent(score, maxScore);

      rows.push({
        submissionId: sub.id,
        studentId: sub.studentNumber,
        studentName: sub.studentName,
        startedAt: sub.startedAt,
        submittedAt: sub.completedAt,
        status,
        score,
        maxScore,
        percentage,
        answeredQuestions: answered,
        questionCount: exam.questions.length,
        violationsCount: sub.warningCount,
        riskScore,
        riskCategory: category,
        recommendation: riskRecommendation(riskScore),
        answers: answerRows,
        timeline
      });
    }

    const ranked = [...rows].sort((a, b) => {
      if (a.percentage !== b.percentage) return b.percentage - a.percentage;
      if (a.studentName !== b.studentName) return a.studentName.localeCompare(b.studentName);
      return a.studentId.localeCompare(b.studentId);
    });

    let previousScore: number | null = null;
    let currentRank = 0;
    const cleanRankings = ranked.map((row, index) => {
      if (previousScore === null || row.percentage !== previousScore) {
        currentRank = index + 1;
        previousScore = row.percentage;
      }
      return {
        rank: currentRank,
        studentId: row.studentId,
        studentName: row.studentName,
        scorePercent: row.percentage
      };
    });

    const submitted = ranked.filter(r => r.submittedAt);
    const scores = ranked.map(r => r.score);
    const scorePercents = ranked.map(r => r.percentage);
    const passMark = maxScore * 0.5;
    const passCount = ranked.filter(r => maxScore && r.score >= passMark).length;

    const questionStats: any[] = [];
    for (const qid of Object.keys(questionMeta)) {
      const meta = questionMeta[qid];
      const scoresForQ = questionScores[qid] || [];
      const attempts = questionAttempts[qid] || 0;
      const avg = attempts ? Math.round((scoresForQ.reduce((a, b) => a + b, 0) / attempts) * 100) / 100 : 0;
      const marks = meta.marks;
      const passRate = attempts ? Math.round(((questionFullMarks[qid] || 0) / attempts) * 100 * 100) / 100 : 0;
      const difficulty = marks ? Math.round((1 - (avg / marks)) * 100) / 100 : 0;
      questionStats.push({
        ...meta,
        questionNumber: meta.position,
        attempts,
        averageScore: avg,
        averagePercent: percent(avg, marks),
        fullMarkCount: questionFullMarks[qid] || 0,
        passRate,
        difficulty,
        difficultyLevel: difficultyLabel(difficulty),
        mostCommonMistake: "No common mistake identified"
      });
    }

    const insights: string[] = [];
    const hardest = questionStats.length > 0 ? questionStats.reduce((a, b) => a.difficulty > b.difficulty ? a : b) : null;
    const easiest = questionStats.length > 0 ? questionStats.reduce((a, b) => a.difficulty < b.difficulty ? a : b) : null;

    if (hardest) insights.push(`Question ${hardest.questionNumber} had the lowest average performance.`);
    if (easiest) insights.push(`Question ${easiest.questionNumber} was the easiest question by average score.`);
    const passRate = ranked.length ? Math.round((passCount / ranked.length) * 100 * 100) / 100 : 0;
    insights.push(`Overall pass rate was ${passRate}%.`);

    const examSummary = {
      course: exam.courseCode || "Unspecified Course",
      exam: exam.title,
      date: exam.startAt ? new Date(exam.startAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }),
      totalStudents: ranked.length,
      submissionsReceived: submitted.length,
      averageScorePercent: scorePercents.length ? Math.round((scorePercents.reduce((a, b) => a + b, 0) / scorePercents.length) * 100) / 100 : 0,
      highestScorePercent: scorePercents.length ? Math.max(...scorePercents) : 0,
      lowestScorePercent: scorePercents.length ? Math.min(...scorePercents) : 0,
      passRatePercent: passRate
    };

    return {
      exam: { id: exam.id, title: exam.title, courseCode: exam.courseCode, durationMinutes: exam.durationMinutes, status: exam.status, createdAt: exam.createdAt, maxScore, questionCount: exam.questions.length },
      exam_summary: examSummary,
      analytics: { submissionCount: ranked.length, submittedCount: submitted.length, averageScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : 0, highestScore: scores.length ? Math.max(...scores) : 0, lowestScore: scores.length ? Math.min(...scores) : 0, passRate, statusCounts, riskCounts, eventCounts },
      rankings: ranked,
      clean_rankings: cleanRankings,
      question_stats: questionStats,
      insights
    };
  }

  async exportToExcel(report: FullExamReport, res: Response) {
    const workbook = new ExcelJS.Workbook();

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Exam Summary');
    summarySheet.addRow(['Metric', 'Value']);
    summarySheet.addRow(['Course', report.exam_summary.course]);
    summarySheet.addRow(['Exam', report.exam_summary.exam]);
    summarySheet.addRow(['Date', report.exam_summary.date]);
    summarySheet.addRow(['Total Students', report.exam_summary.totalStudents]);
    summarySheet.addRow(['Submissions Received', report.exam_summary.submissionsReceived]);
    summarySheet.addRow(['Average Score (%)', report.exam_summary.averageScorePercent]);
    summarySheet.addRow(['Highest Score (%)', report.exam_summary.highestScorePercent]);
    summarySheet.addRow(['Lowest Score (%)', report.exam_summary.lowestScorePercent]);
    summarySheet.addRow(['Pass Rate (%)', report.exam_summary.passRatePercent]);

    // Rankings
    const rankingsSheet = workbook.addWorksheet('Rankings');
    rankingsSheet.addRow(['Rank', 'Student ID', 'Student Name', 'Score (%)']);
    rankingsSheet.addRows(report.clean_rankings.map(r => [r.rank, r.studentId, r.studentName, r.scorePercent]));

    // Question Analytics
    const questionsSheet = workbook.addWorksheet('Question Analytics');
    questionsSheet.addRow(['Question Number', 'Average Score', 'Difficulty Level', 'Pass Rate (%)', 'Most Common Mistake']);
    questionsSheet.addRows(report.question_stats.map(q => [q.questionNumber, `${q.averageScore}/${q.marks}`, q.difficultyLevel, q.passRate, q.mostCommonMistake]));

    // Insights
    const insightsSheet = workbook.addWorksheet('Insights');
    insightsSheet.addRow(['Insight']);
    insightsSheet.addRows(report.insights.map(i => [i]));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="codexa-exam-${report.exam.id}-report.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  async exportToHtml(report: FullExamReport, res: Response) {
    const summary = report.exam_summary;
    const summaryCards = [
      ["Course", "course"],
      ["Exam", "exam"],
      ["Date", "date"],
      ["Total Students", "totalStudents"],
      ["Submissions Received", "submissionsReceived"],
      ["Average Score", "averageScorePercent"],
      ["Highest Score", "highestScorePercent"],
      ["Lowest Score", "lowestScorePercent"],
      ["Pass Rate", "passRatePercent"],
    ].map(([label, key]) => `<div class='card'><span>${this.escapeHtml(label)}</span><strong>${this.escapeHtml(String(summary[key]))}</strong></div>`).join('');

    const rankingRows = report.clean_rankings.map(r => `<tr><td>${r.rank}</td><td>${this.escapeHtml(r.studentId)}</td><td>${this.escapeHtml(r.studentName)}</td><td>${r.scorePercent}</td></tr>`).join('');
    const questionRows = report.question_stats.map(q => `<tr><td>Question ${q.questionNumber}</td><td>${q.averageScore}/${q.marks}</td><td>${this.escapeHtml(q.difficultyLevel)}</td><td>${q.passRate}</td><td>${this.escapeHtml(q.mostCommonMistake)}</td></tr>`).join('');
    const insightsHtml = report.insights.map(i => `<li>${this.escapeHtml(i)}</li>`).join('');

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${this.escapeHtml(summary.exam)} - Codexa Report</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 0; color: #1f2937; background: #f8fafc; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 20px; }
    h1 { margin: 0 0 6px; font-size: 28px; }
    h2 { margin-top: 32px; font-size: 18px; }
    .muted { color: #64748b; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 20px; }
    .card { border: 1px solid #dbe3ef; background: white; border-radius: 8px; padding: 14px; display: grid; gap: 4px; }
    .card span { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
    .card strong { font-size: 18px; }
    .table-wrap { overflow-x: auto; border: 1px solid #dbe3ef; border-radius: 8px; background: white; }
    table { width: 100%; border-collapse: collapse; min-width: 620px; }
    th, td { text-align: left; padding: 11px 12px; border-bottom: 1px solid #e5edf6; }
    th { background: #eef4fb; font-size: 12px; text-transform: uppercase; color: #475569; }
    li { margin: 8px 0; }
    @media print { body { background: white; } main { max-width: none; padding: 16px; } .card, .table-wrap { break-inside: avoid; } }
  </style>
</head>
<body>
  <main>
    <h1>Codexa Examination Result Sheet</h1>
    <p class="muted">${this.escapeHtml(summary.exam)}</p>
    <h2>Examination Summary</h2>
    <section class="summary-grid">${summaryCards}</section>
    <h2>Student Rankings</h2>
    <div class="table-wrap"><table><thead><tr><th>Rank</th><th>Student ID</th><th>Student Name</th><th>Score (%)</th></tr></thead><tbody>${rankingRows}</tbody></table></div>
    <h2>Question Analytics</h2>
    <div class="table-wrap"><table><thead><tr><th>Question Number</th><th>Average Score</th><th>Difficulty Level</th><th>Pass Rate (%)</th><th>Most Common Mistake</th></tr></thead><tbody>${questionRows}</tbody></table></div>
    <h2>Examination Insights</h2>
    <ul>${insightsHtml}</ul>
  </main>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="codexa-exam-${report.exam.id}-report.html"`);
    res.send(html);
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return (text || '').toString().replace(/[&<>"]/g, m => map[m]);
  }
}
