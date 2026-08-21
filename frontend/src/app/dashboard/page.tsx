'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrl } from '@/config/api';

interface Exam {
  id: string;
  title: string;
  courseCode: string;
  status: string;
  createdAt: string;
}

interface DashboardStats {
  totalExams: number;
  activeExams: number;
  draftExams: number;
  activeSessions: number;
  completedSessions: number;
  warningCount: number;
  pendingReviews: number;
}

export default function DashboardPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalExams: 0,
    activeExams: 0,
    draftExams: 0,
    activeSessions: 0,
    completedSessions: 0,
    warningCount: 0,
    pendingReviews: 0,
  });
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const fetchDashboardData = async (token: string) => {
    try {
      const [examsRes, statsRes] = await Promise.all([
        fetch(`${getApiUrl()}/exams`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${getApiUrl()}/exams/dashboard-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (examsRes.ok) {
        setExams(await examsRes.json());
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('codexa_token');
    const userStr = localStorage.getItem('codexa_user');
    if (!token || !userStr) {
      router.replace('/');
      return;
    }
    const parsedUser = JSON.parse(userStr);
    setUser(parsedUser);
    fetchDashboardData(token);
  }, [router]);

  if (!mounted) {
    return null;
  }

  const getFirstName = (name: string) => {
    return name ? name.split(' ')[0] : 'Lecturer';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Hero Banner */}
      <div className="flex flex-col sm:flex-row gap-6 justify-between sm:items-center p-8 bg-[#0c1222] text-white rounded-3xl border border-[#1a2440] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#bf4507] to-transparent" />
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] bg-[#bf4507]/15 border border-[#bf4507]/30 text-[#bf4507] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              OVERVIEW
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
            Hello, {user && getFirstName(user.name)}!
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Welcome back to Codexa. Active examination overview and live monitoring portal.
          </p>
        </div>
        <Link
          href="/dashboard/exams/create"
          className="bg-[#bf4507] hover:bg-[#c24709] text-white font-bold px-5 py-3 rounded-xl text-sm transition-all shadow-[0_4px_16px_rgba(191,69,7,0.3)] text-center w-full sm:w-auto flex items-center justify-center gap-2"
        >
          <span>+ Create New Exam</span>
        </Link>
      </div>

      {/* Stats Grid — 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#0c1222] border border-[#1a2440] rounded-2xl p-6 shadow-sm hover:border-[#2a3a5c] transition-all">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Exams</div>
          <div className="text-3xl font-black text-white mt-2 font-mono">{stats.totalExams}</div>
          <div className="text-xs text-slate-500 mt-1.5">{stats.draftExams} Drafts, {stats.activeExams} Active</div>
        </div>

        <div className="bg-[#0c1222] border border-[#1a2440] rounded-2xl p-6 shadow-sm hover:border-[#2a3a5c] transition-all border-l-4 border-l-[#bf4507]">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Sessions</div>
          <div className="text-3xl font-black text-white mt-2 font-mono">{stats.activeSessions}</div>
          <div className="text-xs text-[#bf4507] mt-1.5 font-semibold">Candidates online</div>
        </div>

        <div className="bg-[#0c1222] border border-[#1a2440] rounded-2xl p-6 shadow-sm hover:border-[#2a3a5c] transition-all">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Sessions</div>
          <div className="text-3xl font-black text-white mt-2 font-mono">{stats.completedSessions}</div>
          <div className="text-xs text-slate-500 mt-1.5">Submissions finalized</div>
        </div>

        <div className="bg-[#0c1222] border border-[#1a2440] rounded-2xl p-6 shadow-sm hover:border-[#2a3a5c] transition-all border-l-4 border-l-emerald-500">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pass Rate</div>
          <div className="text-3xl font-black text-emerald-400 mt-2 font-mono">{(stats as any).passRate ?? 0}%</div>
          <div className="text-xs text-emerald-500/80 mt-1.5 font-semibold">Candidate pass percentage</div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-[#0c1222] border border-[#1a2440] rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-[#1a2440] flex justify-between items-center bg-[#070b18]">
          <div>
            <h2 className="text-base font-bold text-white">Examination Registry</h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage and monitor published assessments</p>
          </div>
          <Link href="/dashboard/exams" className="text-xs text-[#bf4507] hover:underline font-bold">
            View All Exams →
          </Link>
        </div>
        
        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#bf4507] border-t-transparent mb-3"></div>
            <p className="text-xs font-mono">Loading examination records...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <p className="text-base text-slate-300 font-bold">No examinations registered yet.</p>
            <p className="text-xs text-slate-500 mt-1">Create your first examination to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a2440]">
            {exams.map((exam) => (
              <div key={exam.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#161e36]/40 transition-colors">
                <div>
                  <h3 className="font-bold text-white text-sm">{exam.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Course Code: <span className="text-slate-200">{exam.courseCode}</span> · Created: {new Date(exam.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      exam.status === 'PUBLISHED'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {exam.status}
                  </span>
                  
                  {exam.status === 'PUBLISHED' ? (
                    <Link
                      href={`/dashboard/exams/${exam.id}/monitor`}
                      className="bg-[#bf4507] hover:bg-[#c24709] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                    >
                      <span>Monitor Live</span>
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/exams`}
                      className="text-slate-400 hover:text-white text-xs font-semibold hover:underline"
                    >
                      Publish Exam
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
