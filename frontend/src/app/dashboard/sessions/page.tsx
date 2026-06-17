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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0a0f24]">Active Sessions</h1>
        <p className="text-slate-500 text-sm mt-1">Manage and monitor running examinations in real time.</p>
      </div>

      <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-2"></div>
            <p>Loading sessions...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg">No active sessions.</p>
            <p className="text-sm text-slate-400 mt-1">Publish an exam from the Exams page to start a session.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-[#e2e8f0]">
                  <th className="px-6 py-4">Exam Details</th>
                  <th className="px-6 py-4">Course Code</th>
                  <th className="px-6 py-4">Active Candidates</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/50 transition-all text-sm text-[#1a202c]">
                    <td className="px-6 py-4 font-semibold text-[#0a0f24]">{exam.title}</td>
                    <td className="px-6 py-4 font-mono">{exam.courseCode}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent font-semibold">
                        <span className="h-2 w-2 rounded-full bg-accent animate-ping"></span>
                        {exam.activeSessionsCount} Online
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                        Running
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/exams/${exam.id}/monitor`}
                        className="bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-all shadow-sm"
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
