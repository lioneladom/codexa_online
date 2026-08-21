'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { getApiUrl } from '@/config/api';

interface Exam {
  id: string;
  title: string;
  courseCode: string;
  status: string;
  createdAt: string;
  activeSessionsCount?: number;
}

export default function SessionsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchSessionsData = async () => {
    const token = localStorage.getItem('codexa_token');
    if (!token) {
      router.replace('/');
      return;
    }

    try {
      const res = await fetch(`${getApiUrl()}/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const examsData: Exam[] = await res.json();
        
        // Fetch session counts
        const updatedExams = await Promise.all(
          examsData.map(async (exam) => {
            if (exam.status !== 'PUBLISHED') return { ...exam, activeSessionsCount: 0 };
            try {
              const sessionsRes = await fetch(`${getApiUrl()}/exams/${exam.id}/sessions`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (sessionsRes.ok) {
                const sessions = await sessionsRes.json();
                const activeCount = sessions.filter((s: any) => s.status === 'ACTIVE').length;
                return { ...exam, activeSessionsCount: activeCount };
              }
            } catch (e) {
              console.error(e);
            }
            return { ...exam, activeSessionsCount: 0 };
          })
        );
        
        setExams(updatedExams.filter(e => e.status === 'PUBLISHED'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionsData();
  }, []);

  return (
    <div className="p-8 bg-[#030712] min-h-screen text-[#f0f2f8]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wide">Active Sessions</h1>
        <p className="text-[#7b8aaa] text-sm mt-1">Manage and monitor running examinations in real time.</p>
      </div>

      <div className="bg-[#0c1222] border border-[#1a2440] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-[#7b8aaa]">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-2"></div>
            <p>Loading sessions...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="p-12 text-center text-[#7b8aaa]">
            <p className="text-lg font-bold text-white">No active sessions.</p>
            <p className="text-sm text-[#7b8aaa] mt-1">Publish an exam from the Exams page to start a session.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#070b18] text-[#7b8aaa] text-xs font-semibold uppercase tracking-wider border-b border-[#1a2440]">
                  <th className="px-6 py-4">Exam Details</th>
                  <th className="px-6 py-4">Course Code</th>
                  <th className="px-6 py-4">Active Candidates</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2440]">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-[#161e36] transition-all text-sm text-[#f0f2f8]">
                    <td className="px-6 py-4 font-semibold text-white">{exam.title}</td>
                    <td className="px-6 py-4 font-mono text-[#7b8aaa]">{exam.courseCode}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/15 text-accent font-semibold border border-accent/30">
                        <span className="h-2 w-2 rounded-full bg-accent animate-ping"></span>
                        {exam.activeSessionsCount} Online
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                        Running
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/exams/${exam.id}/monitor`}
                        className="bg-accent hover:bg-accent-hover text-white font-semibold px-4 py-2 rounded-lg text-xs transition-all shadow-md"
                      >
                        Open Dashboard
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
