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
  duration: number;
  createdAt: string;
  studentPassword?: string;
  invigilatorPassword?: string;
  studentAccessUrl?: string;
  invigilatorAccessUrl?: string;
  accessCode?: string;
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishLoading, setPublishLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showStopConfirm, setShowStopConfirm] = useState<string | null>(null);
  const [stopLoading, setStopLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [networkIps, setNetworkIps] = useState<{ interface: string; address: string; type: string }[]>([]);
  const [selectedHost, setSelectedHost] = useState<string>('localhost');
  const [currentSsid, setCurrentSsid] = useState<string | null>(null);
  const router = useRouter();

  const fetchExams = async (token: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/exams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNetworkIps = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/network/ips`);
      if (res.ok) {
        const data = await res.json();
        const ips = data.ips || [];
        setNetworkIps(ips);
        setCurrentSsid(data.ssid || null);
        
        // Auto-select the first Wi-Fi/Hotspot or Ethernet IP
        const preferred = ips.find((ip: any) => ip.type === 'Wi-Fi / Hotspot' || ip.type === 'Ethernet / Wired');
        if (preferred) {
          setSelectedHost(preferred.address);
        } else if (ips.length > 0) {
          setSelectedHost(ips[0].address);
        }
      }
    } catch (err) {
      console.error('Failed to fetch network IPs:', err);
    }
  };

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('codexa_token');
    if (!token) {
      router.replace('/');
    } else {
      fetchExams(token);
      fetchNetworkIps();
    }
  }, [router]);

  if (!mounted) {
    return null;
  }

  const handlePublish = async (examId: string) => {
    const token = localStorage.getItem('codexa_token');
    if (!token) return;
    setPublishLoading(examId);
    try {
      const res = await fetch(`${getApiUrl()}/exams/${examId}/publish`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setExams((prev) =>
          prev.map((exam) =>
            exam.id === examId ? { ...exam, ...data.exam, ...data } : exam
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPublishLoading(null);
    }
  };

  const getUrls = (exam: Exam) => {
    let origin = 'http://localhost:3000';
    if (selectedHost === 'localhost') {
      origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    } else {
      origin = `http://${selectedHost}:3000`;
    }
    const code = exam.accessCode || '';
    return {
      studentAccessUrl: `${origin}/exam/${code}`,
      invigilatorAccessUrl: `${origin}/invigilate/${code}`,
    };
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStopExam = async (examId: string) => {
    const token = localStorage.getItem('codexa_token');
    if (!token) return;
    setStopLoading(examId);
    try {
      const res = await fetch(`${getApiUrl()}/exams/${examId}/archive`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setExams((prev) =>
          prev.map((exam) =>
            exam.id === examId ? { ...exam, status: 'ARCHIVED' } : exam
          )
        );
        setShowStopConfirm(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStopLoading(null);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    const token = localStorage.getItem('codexa_token');
    if (!token) return;
    setDeleteLoading(examId);
    try {
      const res = await fetch(`${getApiUrl()}/exams/${examId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setExams((prev) => prev.filter((exam) => exam.id !== examId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div className="p-8 bg-[#030712] min-h-screen text-[#f0f2f8]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Exams Directory</h1>
          <p className="text-[#7b8aaa] text-sm mt-1">Create, publish, monitor, and manage your examination sessions.</p>
        </div>
        <Link
          href="/dashboard/exams/create"
          className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Create Exam
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 font-medium text-sm">Loading examination records...</div>
      ) : (
        <div className="space-y-4">
          {exams.length === 0 ? (
            <div className="border border-[#1a2440] bg-[#0c1222] rounded-2xl p-12 text-center">
              <p className="text-slate-400 text-sm">No exam sessions found. Click 'Create Exam' to set up your first examination.</p>
            </div>
          ) : (
            exams.map((exam) => (
              <div key={exam.id} className="border border-[#1a2440] bg-[#0c1222] rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white">{exam.title}</h3>
                    <p className="text-xs text-accent font-mono font-semibold mt-0.5">{exam.courseCode}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                      exam.status === 'PUBLISHED'
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400'
                        : exam.status === 'DRAFT'
                        ? 'bg-amber-950/60 border border-amber-500/40 text-amber-400'
                        : 'bg-slate-900 border border-slate-700 text-slate-400'
                    }`}
                  >
                    {exam.status === 'ARCHIVED' ? 'CLOSED' : exam.status}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-slate-300 bg-[#070b18] p-3 rounded-xl border border-[#161e36]">
                  <div>
                    <span className="text-slate-500 font-semibold">Duration:</span> {exam.duration} minutes
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">Created Date:</span>{' '}
                    {new Date(exam.createdAt).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">Status:</span> {exam.status}
                  </div>
                </div>

                 {exam.status === 'PUBLISHED' && exam.accessCode && (
                  <div className="mt-4 border-t border-[#1a2440] pt-4">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-4">
                      <div>
                        <h4 className="font-bold text-sm text-white">LAN Network Credentials</h4>
                        {currentSsid && (
                          <p className="text-xs text-emerald-400 font-medium mt-0.5">
                            Connected Wi-Fi / Hotspot: <strong className="underline">{currentSsid}</strong>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 bg-[#070b18] border border-[#161e36] px-3 py-1.5 rounded-xl">
                        <span className="text-xs text-slate-400 font-semibold">Broadcast IP:</span>
                        <select
                          value={selectedHost}
                          onChange={(e) => setSelectedHost(e.target.value)}
                          className="bg-transparent text-xs font-semibold text-white focus:outline-none border-none cursor-pointer"
                        >
                          <option value="localhost" className="bg-[#0c1222] text-white">Localhost (This Machine Only)</option>
                          {networkIps.map((ip) => (
                            <option key={ip.address} value={ip.address} className="bg-[#0c1222] text-white">
                              {ip.type} ({ip.interface}) - {ip.address}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-[#070b18] p-4 rounded-xl border border-[#161e36]">
                        <p className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Student Access Room</p>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={getUrls(exam).studentAccessUrl}
                            readOnly
                            className="flex-1 px-3 py-2 border border-[#1a2440] rounded-xl bg-[#0c1222] text-white text-xs font-mono"
                          />
                          <button
                            onClick={() => copyToClipboard(getUrls(exam).studentAccessUrl, `student-${exam.id}`)}
                            className="px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                          >
                            {copiedId === `student-${exam.id}` ? 'Copied!' : 'Copy Link'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-400">
                          Session Password: <strong className="text-white font-mono">{exam.studentPassword || 'None'}</strong>
                        </p>
                      </div>
                      <div className="bg-[#070b18] p-4 rounded-xl border border-[#161e36]">
                        <p className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Invigilator Monitoring</p>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={getUrls(exam).invigilatorAccessUrl}
                            readOnly
                            className="flex-1 px-3 py-2 border border-[#1a2440] rounded-xl bg-[#0c1222] text-white text-xs font-mono"
                          />
                          <button
                            onClick={() => copyToClipboard(getUrls(exam).invigilatorAccessUrl, `invigilate-${exam.id}`)}
                            className="px-3 py-2 bg-[#1b2852] hover:bg-[#2a3a5c] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                          >
                            {copiedId === `invigilate-${exam.id}` ? 'Copied!' : 'Copy Link'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-400">
                          Invigilator Key: <strong className="text-white font-mono">{exam.invigilatorPassword || 'None'}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex gap-2">
                  {exam.status === 'DRAFT' && (
                    <>
                      <Link
                        href={`/dashboard/exams/create?edit=${exam.id}`}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Edit Draft
                      </Link>
                      <button
                        onClick={() => handlePublish(exam.id)}
                        disabled={publishLoading === exam.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl disabled:opacity-50 text-xs font-bold transition-all shadow-sm"
                      >
                        {publishLoading === exam.id ? 'Publishing...' : 'Publish Exam'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(exam.id)}
                        disabled={deleteLoading === exam.id}
                        className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 text-xs font-bold transition-all shadow-sm"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {exam.status === 'PUBLISHED' && (
                    <>
                      <Link
                        href={`/dashboard/exams/${exam.id}/monitor`}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Live Operations Center
                      </Link>
                      <Link
                        href={`/dashboard/exams/create?edit=${exam.id}`}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Edit Session
                      </Link>
                      <button
                        onClick={() => setShowStopConfirm(exam.id)}
                        disabled={stopLoading !== null}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl disabled:opacity-50 text-xs font-bold transition-all shadow-sm"
                      >
                        Stop Exam
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(exam.id)}
                        disabled={deleteLoading === exam.id}
                        className="px-4 py-2 bg-red-900/60 hover:bg-red-800 text-red-200 rounded-xl disabled:opacity-50 text-xs font-bold transition-all shadow-sm"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {exam.status === 'ARCHIVED' && (
                    <>
                      <Link
                        href={`/dashboard/exams/create?edit=${exam.id}`}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Edit Archived
                      </Link>
                      <button
                        onClick={() => setShowDeleteConfirm(exam.id)}
                        disabled={deleteLoading === exam.id}
                        className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 text-xs font-bold transition-all shadow-sm"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1222] border border-[#1a2440] rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white">Delete Exam Draft</h3>
            <p className="text-xs text-slate-400 mt-2">
              Are you sure you want to permanently delete this exam draft? This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-[#1a2440] text-slate-300 text-xs font-bold rounded-xl hover:bg-[#161e36] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const examId = showDeleteConfirm;
                  setShowDeleteConfirm(null);
                  handleDeleteExam(examId);
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stop Confirmation Modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1222] border border-[#1a2440] rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white">Stop Ongoing Exam</h3>
            <p className="text-xs text-slate-400 mt-2">
              Are you sure you want to stop this ongoing exam? This will immediately lock the workspace for all active students and submit their current answers.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowStopConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-[#1a2440] text-slate-300 text-xs font-bold rounded-xl hover:bg-[#161e36] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStopExam(showStopConfirm)}
                disabled={stopLoading !== null}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
              >
                {stopLoading === showStopConfirm ? 'Stopping...' : 'Stop Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
