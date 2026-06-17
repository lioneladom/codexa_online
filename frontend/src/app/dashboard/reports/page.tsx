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
  questionId: string;
  code: string;
  language: string;
  score: number;
  totalMarks: number;
  status: string;
  errorMessage?: string;
  results: TestCaseResult[];
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

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [report, setReport] = useState<ReportData | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateResult | null>(null);
  
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();

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
        const blob = new Blob([html], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0a0f24]">Results & Reports</h1>
          <p className="text-slate-500 text-sm mt-1">
            Analyze exam performance, check plagiarism markers, and download exports.
          </p>
        </div>

        {/* Selector Dropdown */}
        <div className="flex gap-3 w-full md:w-auto">
          {loadingExams ? (
            <div className="text-xs text-slate-500">Loading exams list...</div>
          ) : (
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="px-4 py-2 bg-white border border-[#e2e8f0] text-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Select an Examination...</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.courseCode})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl mb-6">
          {error}
        </div>
      )}

      {loadingReport ? (
        <div className="text-center py-16 bg-white border border-[#e2e8f0] rounded-2xl shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-2"></div>
          <p className="text-slate-500 text-sm">Compiling exam performance matrices...</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          
          {/* Stats Aggregations */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-[#e2e8f0] p-5 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pass Rate</span>
              <div className="text-2xl font-bold mt-1 text-[#0a0f24]">{report.summary.passRate}%</div>
              <p className="text-[10px] text-slate-500 mt-1">Passing standard is set to 50%</p>
            </div>

            <div className="bg-white border border-[#e2e8f0] p-5 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Average Score</span>
              <div className="text-2xl font-bold mt-1 text-[#0a0f24]">{report.summary.averageScore}%</div>
              <p className="text-[10px] text-slate-500 mt-1">Average candidate percentage</p>
            </div>

            <div className="bg-white border border-[#e2e8f0] p-5 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Candidates</span>
              <div className="text-2xl font-bold mt-1 text-[#0a0f24]">{report.summary.totalCandidates}</div>
              <p className="text-[10px] text-slate-500 mt-1">
                {report.summary.submittedCandidates} Completed • {report.summary.onlineCandidates} Active
              </p>
            </div>

            <div className="bg-white border border-[#e2e8f0] p-5 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">High / Low Score</span>
              <div className="text-2xl font-bold mt-1 text-[#0a0f24]">
                {report.summary.highestScore}% / {report.summary.lowestScore}%
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Overall range of performance</p>
            </div>
          </div>

          {/* Action Row */}
          <div className="bg-white border border-[#e2e8f0] p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <span className="text-xs font-semibold text-slate-700">Export Options:</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleDownload('excel')}
                className="flex-1 sm:flex-initial bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to Excel
              </button>
              <button
                onClick={() => handleDownload('html')}
                className="flex-1 sm:flex-initial bg-white border border-[#e2e8f0] hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18" />
                </svg>
                Export HTML Report
              </button>
            </div>
          </div>

          {/* Candidate Results Pane */}
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left Column: Candidates Table */}
            <div className="flex-1 bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-bold text-[#0a0f24]">Student Performance Table</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 text-left">
                      <th className="py-3.5 px-6 font-bold uppercase tracking-wider">Student Details</th>
                      <th className="py-3.5 px-6 font-bold uppercase tracking-wider text-center">Score</th>
                      <th className="py-3.5 px-6 font-bold uppercase tracking-wider text-center">Grade</th>
                      <th className="py-3.5 px-6 font-bold uppercase tracking-wider text-center">Warnings</th>
                      <th className="py-3.5 px-6 font-bold uppercase tracking-wider text-center">Status</th>
                      <th className="py-3.5 px-6 font-bold uppercase tracking-wider text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.candidateResults.map((candidate, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-slate-800">{candidate.studentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{candidate.studentNumber}</div>
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className="font-bold text-slate-800">{candidate.score}/{candidate.maxScore}</span>
                          <span className="text-slate-400 ml-1">({candidate.percentage}%)</span>
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className="px-2 py-0.5 rounded font-bold font-mono bg-slate-100 text-slate-800">
                            {candidate.grade}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                            candidate.warningCount >= 3 ? 'bg-red-100 text-red-700 font-extrabold' : candidate.warningCount > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {candidate.warningCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            candidate.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {candidate.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <button
                            onClick={() => setSelectedCandidate(candidate)}
                            className="bg-white border border-[#e2e8f0] text-slate-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all shadow-sm"
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

            {/* Right Column: Expanded Candidate Code Submission Viewer */}
            {selectedCandidate && (
              <div className="w-full lg:w-96 bg-white border border-[#e2e8f0] p-6 rounded-2xl shadow-sm flex flex-col space-y-4">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-[#0a0f24]">{selectedCandidate.studentName}</h3>
                    <p className="text-xs text-slate-400 font-mono">{selectedCandidate.studentNumber}</p>
                  </div>
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    <svg className="w-5 h-5 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto max-h-[500px]">
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Question Submissions</h4>
                  {selectedCandidate.submissions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No code submissions logged for this candidate.</p>
                  ) : (
                    selectedCandidate.submissions.map((sub: any, sIdx) => (
                      <div key={sIdx} className="bg-slate-50 border border-[#e2e8f0] rounded-xl p-4 text-xs space-y-3 relative overflow-hidden">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                          <div>
                            <span className="font-bold text-slate-800 block">{sub.questionTitle || `Question Ref #${sIdx + 1}`}</span>
                            <span className="text-[10px] text-slate-400 font-mono uppercase">{sub.language}</span>
                          </div>
                          <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                            {sub.score}/{sub.totalMarks} Marks
                          </span>
                        </div>

                        {/* Semantic similarity and AST analyses */}
                        {sub.semanticSimilarity !== undefined && sub.semanticSimilarity !== null && (
                          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-semibold text-[10px] uppercase">Semantic Similarity:</span>
                              <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                                sub.semanticSimilarity >= 75 ? 'bg-green-50 text-green-700' :
                                sub.semanticSimilarity >= 45 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-600'
                              }`}>
                                {sub.semanticSimilarity}% Match
                              </span>
                            </div>

                            {/* Hardcoding / Plagiarism warning */}
                            {sub.semanticSimilarity < 40 && sub.score === sub.totalMarks && (
                              <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[10px] text-rose-700 font-medium">
                                ⚠️ High Plagiarism / Hardcoding Risk: Student achieved full marks but structural similarity to the reference solution is extremely low.
                              </div>
                            )}

                            {sub.astAnalysis && (
                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                                <div>Loops: <span className="font-semibold text-slate-700">{sub.astAnalysis.usesLoops ? 'Yes' : 'No'}</span></div>
                                <div>Recursion: <span className="font-semibold text-slate-700">{sub.astAnalysis.usesRecursion ? 'Yes' : 'No'}</span></div>
                                <div>Nesting Depth: <span className="font-semibold text-slate-700">{sub.astAnalysis.depth}</span></div>
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Candidate Code:</span>
                          <pre className="font-mono text-[10px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 overflow-x-auto max-h-40 whitespace-pre">
                            {sub.code}
                          </pre>
                        </div>

                        {sub.errorMessage && (
                          <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl font-mono text-[9px] break-all">
                            {sub.errorMessage}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>

        </div>
      ) : (
        <div className="text-center py-16 text-slate-500 bg-white border border-[#e2e8f0] rounded-2xl">
          Select an exam from the upper right dropdown to view student evaluation reports.
        </div>
      )}
    </div>
  );
}
