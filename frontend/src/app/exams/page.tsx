'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/config/api';
import CodexaLogo from '@/components/CodexaLogo';

interface PublishedExam {
  id: string;
  title: string;
  courseCode: string;
  description?: string;
  duration: number;
  startDateTime: string;
  endDateTime: string;
  accessCode: string;
}

export default function PublishedExamsPage() {
  const [exams, setExams] = useState<PublishedExam[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchExams() {
      try {
        const res = await fetch(`${getApiUrl()}/exams/published`);
        if (res.ok) {
          const data = await res.json();
          setExams(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchExams();
  }, []);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-[#030712] text-[#f0f2f8]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#bf4507]/20 border-t-[#bf4507] rounded-full animate-spin" />
          <p className="text-sm font-mono text-[#7b8aaa] tracking-wider uppercase">Loading Examination Rooms...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030712] text-[#f0f2f8] selection:bg-[#bf4507]/30 selection:text-[#bf4507] p-6 md:p-12 relative overflow-hidden">
      {/* Subtle Background Glow Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1b2852]/20 via-[#030712]/80 to-[#030712] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[#1a2440] mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <CodexaLogo size="md" />
              <span className="text-[10px] bg-[#bf4507]/15 border border-[#bf4507]/30 text-[#bf4507] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                Assessment Gateway
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mt-2">Available Examinations</h1>
            <p className="text-sm text-[#7b8aaa] mt-1">Select an active examination room below to verify your credentials and begin.</p>
          </div>

          <button
            onClick={() => router.push('/')}
            className="self-start md:self-auto px-4 py-2.5 bg-[#0c1222] hover:bg-[#161e36] border border-[#1a2440] text-slate-300 text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Staff / Invigilator Portal
          </button>
        </div>

        {exams.length === 0 ? (
          <div className="text-center py-20 bg-[#0c1222] border border-[#1a2440] rounded-3xl shadow-2xl p-8 max-w-lg mx-auto">
            <div className="w-16 h-16 bg-[#161e36] text-[#7b8aaa] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#1a2440]">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Active Exams Found</h3>
            <p className="text-xs text-[#7b8aaa] leading-relaxed">
              There are currently no published examinations open for candidate participation. Please check with your instructor or invigilator.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-[#0c1222] border border-[#1a2440] rounded-3xl p-6 md:p-8 hover:border-[#bf4507]/60 hover:shadow-[0_8px_30px_rgba(191,69,7,0.15)] transition-all relative overflow-hidden backdrop-blur-xl group flex flex-col justify-between"
              >
                {/* Top Accent Gradient on Hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#bf4507]/30 group-hover:via-[#bf4507] to-transparent transition-all" />

                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-mono font-bold bg-[#bf4507]/15 border border-[#bf4507]/30 text-[#bf4507] px-3 py-1 rounded-lg">
                      {exam.courseCode}
                    </span>
                    <span className="text-[11px] font-mono text-[#7b8aaa] bg-[#070b18] border border-[#161e36] px-2.5 py-1 rounded-lg">
                      Code: {exam.accessCode}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-white transition-colors">
                    {exam.title}
                  </h3>

                  {exam.description && (
                    <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                      {exam.description}
                    </p>
                  )}

                  <div className="text-xs text-[#7b8aaa] space-y-2 bg-[#070b18] border border-[#161e36] p-3.5 rounded-2xl mb-6 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Duration:</span>
                      <span className="font-semibold text-white">{exam.duration} mins</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Opens:</span>
                      <span className="text-slate-200">{formatDateTime(exam.startDateTime)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Closes:</span>
                      <span className="text-slate-200">{formatDateTime(exam.endDateTime)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/exam/${exam.accessCode}`)}
                  className="w-full py-3 px-4 bg-[#bf4507] hover:bg-[#c24709] text-white font-bold rounded-xl transition-all shadow-[0_4px_16px_rgba(191,69,7,0.3)] active:scale-[0.98] text-xs tracking-wide flex items-center justify-center gap-2 mt-2"
                >
                  <span>Enter Examination Room</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
