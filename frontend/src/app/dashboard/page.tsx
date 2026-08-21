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
    <div className="p-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center mb-8 bg-[#0a0f24] text-[#ffffff] p-6 rounded-2xl border border-[#1e295d] shadow-[0_4px_20px_rgba(10,15,36,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent to-transparent"></div>
        <div>
          <h1 className="text-3xl font-bold font-sans">
            Hello, Dr. {user && getFirstName(user.name)}!
          </h1>
          <p className="text-[#a0aec0] text-sm mt-1">
            Welcome back to Codexa. Here is a summary of the active examination sessions.
          </p>
        </div>
        <Link
          href="/dashboard/exams/create"
          className="bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-[0_4px_12px_rgba(23,128,115,0.2)] text-center w-full sm:w-auto"
        >
          + Create New Exam
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-[#0c1222] border border-[#1a2440] rounded-2xl p-5 shadow-sm hover:border-accent/40 transition-all">
          <div className="text-xs font-bold uppercase tracking-wider text-[#7b8aaa]">Total Exams</div>
          <div className="text-3xl font-extrabold text-[#f0f2f8] mt-2">{stats.totalExams}</div>
          <div className="text-xs text-[#7b8aaa] mt-1">{stats.draftExams} Drafts, {stats.activeExams} Active</div>
        </div>
        
        <div className="bg-[#0c1222] border border-[#1a2440] rounded-2xl p-5 shadow-sm hover:border-accent/40 transition-all border-l-4 border-l-accent">
          <div className="text-xs font-bold uppercase tracking-wider text-[#7b8aaa]">Active Sessions</div>
          <div className="text-3xl font-extrabold text-[#f0f2f8] mt-2">{stats.activeSessions}</div>
          <div className="text-xs text-[#7b8aaa] mt-1">Candidates currently online</div>
        </div>

        <div className="bg-[#0c1222] border border-[#1a2440] rounded-2xl p-5 shadow-sm hover:border-accent/40 transition-all">
          <div className="text-xs font-bold uppercase tracking-wider text-[#7b8aaa]">Completed Sessions</div>
          <div className="text-3xl font-extrabold text-[#f0f2f8] mt-2">{stats.completedSessions}</div>
          <div className="text-xs text-[#7b8aaa] mt-1">Exam submissions completed</div>
        </div>

        <div className="bg-[#0c1222] border border-[#1a2440] rounded-2xl p-5 shadow-sm hover:border-accent/40 transition-all border-l-4 border-l-red-500">
          <div className="text-xs font-bold uppercase tracking-wider text-red-400">Security Flags</div>
          <div className="text-3xl font-extrabold text-red-400 mt-2">{stats.warningCount}</div>
          <div className="text-xs text-[#7b8aaa] mt-1">Tab switches / violations</div>
        </div>

        <div className="bg-[#0c1222] border border-[#1a2440] rounded-2xl p-5 shadow-sm hover:border-accent/40 transition-all">
          <div className="text-xs font-bold uppercase tracking-wider text-[#7b8aaa]">Pending Reviews</div>
          <div className="text-3xl font-extrabold text-[#f0f2f8] mt-2">{stats.pendingReviews}</div>
          <div className="text-xs text-[#7b8aaa] mt-1">Theory answers to grade</div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-[#0c1222] border border-[#1a2440] rounded-2xl overflow-hidden shadow-md">
        <div className="px-6 py-4 border-b border-[#1a2440] flex justify-between items-center bg-[#070b18]">
          <h2 className="text-base font-bold text-[#f0f2f8]">Exam Management</h2>
          <Link href="/dashboard/exams" className="text-xs text-accent hover:underline font-semibold">
            View All Exams →
          </Link>
        </div>
        
        {loading ? (
          <div className="text-center py-12 text-[#7b8aaa]">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-2"></div>
            <p>Loading examinations data...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="p-12 text-center text-[#7b8aaa]">
            <p className="text-lg font-medium text-[#f0f2f8]">No examinations registered yet.</p>
            <p className="text-sm text-[#7b8aaa] mt-1">Create your first examination template to get started.</p>
            <Link
              href="/dashboard/exams/create"
              className="inline-block mt-4 bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-md"
            >
              New Exam Template
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#1a2440]">
            {exams.map((exam) => (
              <div key={exam.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#141c38]/40 transition-all">
                <div>
                  <h3 className="font-bold text-[#f0f2f8]">{exam.title}</h3>
                  <p className="text-xs text-[#7b8aaa] mt-1 font-mono">
                    Course Code: {exam.courseCode} • Created: {new Date(exam.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      exam.status === 'PUBLISHED'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
                    }`}
                  >
                    {exam.status}
                  </span>
                  
                  {exam.status === 'PUBLISHED' ? (
                    <Link
                      href={`/dashboard/exams/${exam.id}/monitor`}
                      className="bg-accent hover:bg-accent/90 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all"
                    >
                      Monitor Live
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/exams`}
                      className="text-[#7b8aaa] hover:text-white text-xs font-semibold hover:underline"
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
