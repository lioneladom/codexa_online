'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getApiUrl } from '@/config/api';

interface Exam {
  id: string;
  title: string;
  courseCode: string;
  status: string;
}

interface TestCaseResult {
  id: string;
  passed: boolean;
  actualOutput?: string;
  errorMessage?: string;
}

interface Submission {
  id: string;
  questionId: string;
  questionTitle?: string;
  code: string;
  language: string;
  score: number;
  totalMarks: number;
  status: string;
  errorMessage?: string;
  aiFeedback?: string;
  aiVerdict?: string;
  codeComplexity?: string;
  logicScore?: number;
  results: TestCaseResult[];
  semanticSimilarity?: number;
  astAnalysis?: any;
}

interface CandidateResult {
  studentName: string;
  studentNumber: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  status: string;
  warningCount: number;
  completedAt?: string;
  submissions: Submission[];
}

interface ReportData {
  examTitle: string;
  courseCode: string;
  summary: {
    totalCandidates: number;
    submittedCandidates: number;
    onlineCandidates: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
  };
  candidateResults: CandidateResult[];
}

interface ScoreEditorProps {
  submission: Submission;
  candidate: CandidateResult;
  onScoreUpdated: (updatedSubmission: Submission) => void;
}

function ScoreEditor({ submission, candidate, onScoreUpdated }: ScoreEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [scoreVal, setScoreVal] = useState<string>(String(submission.score));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const numScore = parseInt(scoreVal, 10);
    if (isNaN(numScore) || numScore < 0 || numScore > submission.totalMarks) {
      setError(`Must be between 0 and ${submission.totalMarks}`);
      return;
    }

    setSaving(true);
    setError('');

    const token = localStorage.getItem('codexa_token');
    try {
      const res = await fetch(`${getApiUrl()}/exams/submissions/${submission.id}/score`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ score: numScore }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to update score');
      }

      const updatedData = await res.json();
      onScoreUpdated({
        ...submission,
        score: updatedData.score,
        status: updatedData.status,
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error saving score');
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={submission.totalMarks}
            value={scoreVal}
            onChange={(e) => setScoreVal(e.target.value)}
            className="w-16 px-2 py-1 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent"
            disabled={saving}
          />
          <span className="text-slate-400 font-bold">/ {submission.totalMarks}</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? '...' : 'Save'}
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setScoreVal(String(submission.score));
              setError('');
            }}
            disabled={saving}
            className="bg-[#070b18] border border-[#1a2440] text-slate-300 hover:bg-[#161e36] font-semibold px-2 py-1 rounded-lg text-[10px] transition-all shadow-sm"
          >
            Cancel
          </button>
        </div>
        {error && <span className="text-[10px] text-red-400 font-medium">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-extrabold text-xs text-white bg-[#070b18] border border-[#1a2440] px-3 py-1.5 rounded-xl shadow-sm">
        {submission.score}/{submission.totalMarks} Marks
      </span>
      <button
        onClick={() => setIsEditing(true)}
        className="bg-[#070b18] border border-[#1a2440] hover:bg-[#161e36] text-slate-300 font-bold px-2.5 py-1.5 rounded-lg text-[10px] transition-all shadow-sm flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit Marks
      </button>
    </div>
  );
}

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [report, setReport] = useState<ReportData | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateResult | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [examSearchTerm, setExamSearchTerm] = useState('');
  
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [runningAiGrading, setRunningAiGrading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();

  const handleExportSubmissionsForGrading = () => {
    if (!report || !report.candidateResults || report.candidateResults.length === 0) {
      setError('No candidate submissions to export.');
      return;
    }

    const exportData = {
      examTitle: report.examTitle,
      courseCode: report.courseCode,
      instructions: 'Grade each submission below. For each submission, set "gradedScore" (integer 0 to totalMarks), "feedback" (string with remarks), and "verdict" (PASS/FAIL/PARTIAL). Return the same JSON structure with these fields filled in.',
      candidates: report.candidateResults.map((c) => ({
        studentName: c.studentName,
        studentNumber: c.studentNumber,
        submissions: c.submissions.map((s) => ({
          submissionId: s.id,
          questionTitle: s.questionTitle || 'Untitled',
          language: s.language,
          totalMarks: s.totalMarks,
          currentScore: s.score,
          testCasesPassed: s.results ? s.results.filter(r => r.passed).length : 0,
          totalTestCases: s.results ? s.results.length : 0,
          code: s.code,
          // Fields for the AI/grader to fill:
          gradedScore: null,
          feedback: '',
          verdict: '',
        })),
      })),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `codexa-grading-export-${report.courseCode || 'exam'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportGradedJson = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          let text = (event.target?.result as string).trim();
          // Strip markdown code fences
          if (text.startsWith('```json')) {
            text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (text.startsWith('```')) {
            text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          const graded = JSON.parse(text);
          const candidates = graded.candidates || [];

          const token = localStorage.getItem('codexa_token');
          if (!token) return;

          let updatedCount = 0;

          for (const candidate of candidates) {
            for (const sub of candidate.submissions || []) {
              if (sub.gradedScore !== null && sub.gradedScore !== undefined && sub.submissionId) {
                const res = await fetch(`${getApiUrl()}/exams/submissions/${sub.submissionId}/score`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ score: parseInt(sub.gradedScore, 10) }),
                });

                if (res.ok) {
                  updatedCount++;
                }
              }
            }
          }

          alert(`Successfully imported grades for ${updatedCount} submission(s).`);
          if (selectedExamId) {
            await fetchReport(selectedExamId);
          }
        } catch (err: any) {
          setError(`Error importing graded JSON: ${err.message || 'Invalid format'}`);
        }
      };
      reader.readAsText(file);
    };
    fileInput.click();
  };

  const fetchExams = async (token: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExams(data);
        if (data.length > 0) {
          setSelectedExamId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch exams list.');
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchReport = async (examId: string) => {
    const token = localStorage.getItem('codexa_token');
    if (!token || !examId) return;

    setLoadingReport(true);
    setReport(null);
    setSelectedCandidate(null);
    setError('');

    try {
      const res = await fetch(`${getApiUrl()}/exams/${examId}/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        throw new Error('Failed to retrieve performance report details.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch report.');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleLocalScoreUpdate = (studentNumber: string, updatedSub: Submission) => {
    if (!report) return;

    const updatedCandidateResults = report.candidateResults.map((candidate) => {
      if (candidate.studentNumber !== studentNumber) return candidate;

      const updatedSubmissions = candidate.submissions.map((sub) =>
        sub.id === updatedSub.id ? updatedSub : sub
      );

      const totalScore = updatedSubmissions.reduce((sum, s) => sum + s.score, 0);
      const percentage = (totalScore / candidate.maxScore) * 100;
      
      let grade = 'F';
      if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';

      const newCandidate = {
        ...candidate,
        submissions: updatedSubmissions,
        score: totalScore,
        percentage: Math.round(percentage),
        grade,
      };

      if (selectedCandidate && selectedCandidate.studentNumber === studentNumber) {
        setSelectedCandidate(newCandidate);
      }

      return newCandidate;
    });

    const totalCandidates = updatedCandidateResults.length;
    let totalScoreSum = 0;
    let highestScore = 0;
    let lowestScore = totalCandidates > 0 ? 100 : 0;
    let passCount = 0;

    updatedCandidateResults.forEach((c) => {
      const pct = c.percentage;
      totalScoreSum += pct;
      if (pct > highestScore) highestScore = pct;
      if (pct < lowestScore) lowestScore = pct;
      if (pct >= 50) passCount++;
    });

    const averageScore = totalCandidates > 0 ? Math.round(totalScoreSum / totalCandidates) : 0;
    const passRate = totalCandidates > 0 ? Math.round((passCount / totalCandidates) * 100) : 0;

    setReport({
      ...report,
      summary: {
        ...report.summary,
        averageScore,
        highestScore,
        lowestScore,
        passRate,
      },
      candidateResults: updatedCandidateResults,
    });
  };

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('codexa_token');
    if (!token) {
      router.replace('/');
    } else {
      fetchExams(token);
    }
  }, [router]);

  useEffect(() => {
    if (selectedExamId) {
      fetchReport(selectedExamId);
    }
  }, [selectedExamId]);

  if (!mounted) {
    return null;
  }

  const handleDownload = async (format: 'excel' | 'html') => {
    const token = localStorage.getItem('codexa_token');
    if (!token || !selectedExamId) return;
    
    try {
      const response = await fetch(`${getApiUrl()}/exams/${selectedExamId}/export/${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to download');
      
      if (format === 'excel') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'exam-results.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const html = await response.text();
        const width = 960;
        const height = 750;
        const left = Math.max(0, Math.floor((window.innerWidth - width) / 2));
        const top = Math.max(0, Math.floor((window.innerHeight - height) / 2));
        const reportWindow = window.open(
          '',
          'CodexaExamReport',
          `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
        );
        if (reportWindow) {
          reportWindow.document.open();
          reportWindow.document.write(html);
          reportWindow.document.close();
          reportWindow.focus();
        }
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="p-8 bg-[#030712] min-h-screen text-[#f0f2f8]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Results & Reports</h1>
          <p className="text-[#7b8aaa] text-sm mt-1">
            Analyze exam performance, check plagiarism markers, and download exports.
          </p>
        </div>

        {/* Past Exam Search Bar & Selector */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search past exams..."
              value={examSearchTerm}
              onChange={(e) => setExamSearchTerm(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 pl-9 bg-[#0c1222] border border-[#1a2440] text-[#f0f2f8] placeholder-slate-500 rounded-xl text-xs font-medium focus:outline-none focus:border-[#bf4507] transition-all"
            />
            <svg className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {loadingExams ? (
            <div className="text-xs text-[#7b8aaa] self-center">Loading exams list...</div>
          ) : (
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="px-4 py-2 bg-[#0c1222] border border-[#1a2440] text-[#f0f2f8] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#bf4507]"
            >
              <option value="">Select an Examination...</option>
              {exams
                .filter((ex) =>
                  ex.title.toLowerCase().includes(examSearchTerm.toLowerCase()) ||
                  ex.courseCode.toLowerCase().includes(examSearchTerm.toLowerCase())
                )
                .map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({ex.courseCode})
                  </option>
                ))}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm rounded-xl mb-6">
          {error}
        </div>
      )}

      {loadingReport ? (
        <div className="text-center py-16 bg-[#0c1222] border border-[#1a2440] rounded-2xl shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-2"></div>
          <p className="text-[#7b8aaa] text-sm">Compiling exam performance matrices...</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          
          {/* Stats Aggregations */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0c1222] border border-[#1a2440] p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] text-[#7b8aaa] font-bold uppercase tracking-wider block mb-1">Total Candidates</span>
              <p className="text-2xl font-black text-white">{report.summary.totalCandidates}</p>
              <p className="text-[10px] text-[#7b8aaa] mt-1">{report.summary.submittedCandidates} Submitted • {report.summary.onlineCandidates} Active</p>
            </div>
            <div className="bg-[#0c1222] border border-[#1a2440] p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] text-[#7b8aaa] font-bold uppercase tracking-wider block mb-1">Class Average</span>
              <p className="text-2xl font-black text-emerald-400">{report.summary.averageScore.toFixed(1)}%</p>
              <p className="text-[10px] text-[#7b8aaa] mt-1">Average percentage mark</p>
            </div>
            <div className="bg-[#0c1222] border border-[#1a2440] p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] text-[#7b8aaa] font-bold uppercase tracking-wider block mb-1">Pass Rate</span>
              <p className="text-2xl font-black text-blue-400">{report.summary.passRate.toFixed(1)}%</p>
              <p className="text-[10px] text-[#7b8aaa] mt-1">Candidates scored &ge; 50%</p>
            </div>
            <div className="bg-[#0c1222] border border-[#1a2440] p-4 rounded-2xl shadow-sm">
              <span className="text-[10px] text-[#7b8aaa] font-bold uppercase tracking-wider block mb-1">Highest / Lowest</span>
              <p className="text-2xl font-black text-amber-400">{report.summary.highestScore}% <span className="text-xs text-[#7b8aaa] font-normal">/ {report.summary.lowestScore}%</span></p>
              <p className="text-[10px] text-[#7b8aaa] mt-1">Overall range of performance</p>
            </div>
          </div>

          {/* Action Row */}
          <div className="bg-[#0c1222] border border-[#1a2440] p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleExportSubmissionsForGrading}
                className="bg-[#bf4507] hover:bg-[#c24709] text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Export Submissions for Grading</span>
              </button>
              <button
                onClick={handleImportGradedJson}
                className="bg-[#070b18] border border-[#1a2440] hover:bg-[#161e36] text-[#f0f2f8] font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-[#7b8aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Import Graded JSON</span>
              </button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleDownload('excel')}
                className="flex-1 sm:flex-initial bg-accent hover:bg-accent-hover text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to Excel
              </button>
              <button
                onClick={() => handleDownload('html')}
                className="flex-1 sm:flex-initial bg-[#070b18] border border-[#1a2440] hover:bg-[#161e36] text-[#f0f2f8] font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4 text-[#7b8aaa]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18" />
                </svg>
                Export HTML Report
              </button>
            </div>
          </div>

          {/* Candidate Results Pane */}
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left Column: Candidates Table */}
            <div className="flex-1 bg-[#0c1222] border border-[#1a2440] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1a2440] flex justify-between items-center">
                <h3 className="font-bold text-white">Student Performance Table</h3>
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 bg-[#070b18] border border-[#1a2440] text-[#f0f2f8] rounded-xl text-xs focus:outline-none focus:border-accent w-64"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#070b18] text-[#7b8aaa] border-b border-[#1a2440] text-left">
                      <th className="py-3.5 px-6 font-bold uppercase tracking-wider">Student Details</th>
                      <th className="py-3.5 px-6 font-bold uppercase tracking-wider text-center">Score</th>
                      <th className="py-3.5 px-6 font-bold uppercase tracking-wider text-center">Grade</th>
                      <th className="py-3.5 px-6 font-bold uppercase tracking-wider text-center">Warnings</th>
                      <th className="py-3.5 px-6 font-bold uppercase tracking-wider text-center">Status</th>
                      <th className="py-3.5 px-6 font-bold uppercase tracking-wider text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a2440]">
                    {report.candidateResults.filter(c => c.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || c.studentNumber.toLowerCase().includes(searchTerm.toLowerCase())).map((candidate, idx) => (
                      <tr key={idx} className="hover:bg-[#161e36] transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-white">{candidate.studentName}</div>
                          <div className="text-[10px] text-[#7b8aaa] font-mono">{candidate.studentNumber}</div>
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className="font-bold text-white">{candidate.score}/{candidate.maxScore}</span>
                          <span className="text-[#7b8aaa] ml-1">({candidate.percentage}%)</span>
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className="px-2 py-0.5 rounded font-bold font-mono bg-[#070b18] text-white border border-[#1a2440]">
                            {candidate.grade}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                            candidate.warningCount >= 3 ? 'bg-red-950/60 text-red-400 font-extrabold border border-red-800/40' : candidate.warningCount > 0 ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40' : 'bg-[#070b18] text-[#7b8aaa] border border-[#1a2440]'
                          }`}>
                            {candidate.warningCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            candidate.status === 'COMPLETED' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-blue-950/60 text-blue-400 border border-blue-800/40'
                          }`}>
                            {candidate.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <button
                            onClick={() => setSelectedCandidate(candidate)}
                            className="bg-[#070b18] border border-[#1a2440] text-[#f0f2f8] font-semibold px-3 py-1.5 rounded-lg hover:bg-[#161e36] transition-all shadow-sm"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Overlay for Candidate Detailed Submission Viewer */}
            {selectedCandidate && (
              <div className="fixed inset-0 z-50 bg-[#030712]/80 backdrop-blur-md flex justify-center items-center p-4 md:p-8 animate-fade-in">
                <div className="w-full max-w-4xl bg-[#0c1222] border border-[#1a2440] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                  
                  {/* Modal Header */}
                  <div className="px-6 py-4 bg-[#070b18] border-b border-[#1a2440] flex justify-between items-center">
                    <div>
                      <h3 className="font-extrabold text-base text-white">{selectedCandidate.studentName}</h3>
                      <p className="text-[10px] text-[#7b8aaa] font-mono font-bold uppercase tracking-wider mt-0.5">
                        {selectedCandidate.studentNumber} • Score: {selectedCandidate.score}/{selectedCandidate.maxScore} ({selectedCandidate.percentage}%) • Grade: {selectedCandidate.grade}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedCandidate(null)}
                      className="p-1.5 rounded-lg hover:bg-[#161e36] text-[#7b8aaa] hover:text-white transition-all border border-[#1a2440] bg-[#070b18]"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <h4 className="text-xs font-bold uppercase text-accent tracking-wider">Question Submissions & Evaluations</h4>
                    
                    {selectedCandidate.submissions.length === 0 ? (
                      <p className="text-xs text-[#7b8aaa] italic">No code submissions logged for this candidate.</p>
                    ) : (
                      <div className="space-y-6">
                        {selectedCandidate.submissions.map((sub: any, sIdx: number) => (
                          <div key={sIdx} className="bg-[#070b18] border border-[#1a2440] rounded-2xl p-5 text-xs space-y-4 relative overflow-hidden shadow-sm">
                            
                            {/* Header with Title and Score Editor */}
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#1a2440] pb-3">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-extrabold text-sm text-white block">{sub.questionTitle || `Question Ref #${sIdx + 1}`}</span>
                                  {sub.aiFeedback ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                                      <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span>AI Evaluated</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                                      <svg className="w-3 h-3 text-amber-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span>Pending AI Evaluation (Offline)</span>
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-[#7b8aaa] font-mono uppercase font-semibold">Language: {sub.language}</span>
                              </div>
                              <ScoreEditor
                                submission={sub}
                                candidate={selectedCandidate}
                                onScoreUpdated={(updatedSub) => {
                                  handleLocalScoreUpdate(selectedCandidate.studentNumber, updatedSub);
                                }}
                              />
                            </div>

                            {/* Gemini AI Evaluation Summary Card */}
                            {sub.aiFeedback && (
                              <div className="p-3.5 bg-gradient-to-r from-teal-950/30 to-slate-900/60 border border-teal-500/20 rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-teal-300 flex items-center space-x-1">
                                    <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <span>Gemini AI Evaluation Remarks</span>
                                  </span>
                                  {sub.codeComplexity && (
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                                      Complexity: {sub.codeComplexity}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-200 leading-relaxed">{sub.aiFeedback}</p>
                              </div>
                            )}

                            {/* Semantic similarity and AST analyses */}
                            {sub.semanticSimilarity !== undefined && sub.semanticSimilarity !== null && (
                              <div className="p-3.5 bg-[#0c1222] border border-[#1a2440] rounded-xl space-y-3 shadow-inner">
                                <div className="flex justify-between items-center">
                                  <span className="text-[#7b8aaa] font-semibold text-[10px] uppercase tracking-wider">Semantic Similarity:</span>
                                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                                    sub.semanticSimilarity >= 75 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' :
                                    sub.semanticSimilarity >= 45 ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40' : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                                  }`}>
                                    {sub.semanticSimilarity}% Match
                                  </span>
                                </div>

                                {/* Hardcoding / Plagiarism warning */}
                                {sub.semanticSimilarity < 40 && sub.score === sub.totalMarks && (
                                  <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg text-[10px] text-rose-300 font-medium flex items-start gap-2">
                                    <span>⚠️</span>
                                    <span><strong>High Plagiarism / Hardcoding Risk:</strong> Student achieved full marks but structural similarity to the reference solution is extremely low.</span>
                                  </div>
                                )}

                                {sub.astAnalysis && (
                                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[#1a2440] text-[10px] text-[#7b8aaa] font-mono">
                                    <div>Loops: <span className="font-semibold text-white">{sub.astAnalysis.usesLoops ? 'Yes' : 'No'}</span></div>
                                    <div>Recursion: <span className="font-semibold text-white">{sub.astAnalysis.usesRecursion ? 'Yes' : 'No'}</span></div>
                                    <div>Nesting Depth: <span className="font-semibold text-white">{sub.astAnalysis.depth}</span></div>
                                  </div>
                                )}
                              </div>
                            )}

                            <div>
                              <span className="text-[10px] text-[#7b8aaa] block mb-1 font-semibold uppercase tracking-wider">Candidate Code:</span>
                              <pre className="font-mono text-xs text-[#f0f2f8] bg-[#0c1222] p-3.5 rounded-xl border border-[#1a2440] overflow-x-auto max-h-60 whitespace-pre">
                                {sub.code}
                              </pre>
                            </div>

                            {sub.errorMessage && (
                              <div className="bg-rose-950/40 border border-rose-500/30 text-rose-300 p-3 rounded-xl font-mono text-[10px] break-all">
                                {sub.errorMessage}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      ) : (
        <div className="text-center py-16 text-[#7b8aaa] bg-[#0c1222] border border-[#1a2440] rounded-2xl">
          Select an exam from the upper right dropdown to view student evaluation reports.
        </div>
      )}
    </div>
  );
}
