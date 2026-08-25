'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiUrl, getSocketUrl } from '@/config/api';
import CodexaLogo from '@/components/CodexaLogo';

interface Submission {
  id: string;
  questionId: string;
  score: number;
  totalMarks: number;
  status: string;
}

interface ExamSession {
  id: string;
  studentName: string;
  studentNumber: string;
  startedAt?: string;
  completedAt?: string;
  status: string;
  warningCount: number;
  submissions: Submission[];
}

interface ActivityLog {
  id: string;
  studentName: string;
  studentNumber: string;
  activityType: string;
  details: string;
  timestamp: Date;
}

export default function InvigilatorPage({ params }: { params: { accessCode: string } }) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [examInfo, setExamInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'candidates' | 'feed'>('candidates');
  
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const socketRef = useRef<Socket | null>(null);

  const [showStopModal, setShowStopModal] = useState(false);
  const [stoppingExam, setStoppingExam] = useState(false);

  const handleStopExam = async () => {
    const passwordToUse = password || sessionStorage.getItem(`invigilator_password_${params.accessCode.toUpperCase()}`) || '';
    setStoppingExam(true);
    try {
      const res = await fetch(`${getApiUrl()}/exams/access/${params.accessCode.toUpperCase()}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invigilatorPassword: passwordToUse }),
      });
      if (res.ok) {
        setExamInfo((prev: any) => prev ? { ...prev, status: 'ARCHIVED' } : prev);
        setShowStopModal(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || 'Failed to stop exam room.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error while stopping exam.');
    } finally {
      setStoppingExam(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent, bypassPassword?: string) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    const passwordToUse = bypassPassword || password;

    try {
      const examRes = await fetch(`${getApiUrl()}/exams/access/${params.accessCode.toUpperCase()}`);
      if (!examRes.ok) {
        throw new Error('Exam not found or has been closed.');
      }
      const examData = await examRes.json();
      setExamInfo(examData);

      const res = await fetch(`${getApiUrl()}/exams/access/${params.accessCode.toUpperCase()}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invigilatorPassword: passwordToUse }),
      });

      if (!res.ok) {
        throw new Error('Authentication failed. Invalid invigilator password.');
      }

      const sessionsData = await res.json();
      setSessions(sessionsData);
      setIsAuthenticated(true);
      sessionStorage.setItem(`invigilator_password_${params.accessCode.toUpperCase()}`, passwordToUse);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cachedPassword = sessionStorage.getItem(`invigilator_password_${params.accessCode.toUpperCase()}`);
    if (cachedPassword) {
      handleLogin(undefined, cachedPassword);
    }
  }, [params.accessCode]);

  useEffect(() => {
    if (!isAuthenticated || !examInfo) return;

    const socket = io(getSocketUrl());
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinExam', {
        examId: examInfo.id,
        userType: 'INVIGILATOR',
        name: 'Room Invigilator',
      });
    });

    socket.on('activity', (event: { activity: string; data: any; timestamp: string }) => {
      const { activity, data, timestamp } = event;
      const logTime = new Date(timestamp);

      setSessions(prevSessions => {
        const studentIndex = prevSessions.findIndex(
          s => s.studentNumber === data.studentNumber
        );

        const updated = [...prevSessions];

        if (activity === 'STUDENT_JOIN') {
          if (studentIndex === -1) {
            updated.push({
              id: data.sessionId || Math.random().toString(),
              studentName: data.studentName,
              studentNumber: data.studentNumber,
              status: 'ACTIVE',
              warningCount: 0,
              submissions: [],
              startedAt: logTime.toISOString(),
            });
          } else {
            updated[studentIndex].status = 'ACTIVE';
          }

          setActivityLogs(prev => [
            {
              id: Math.random().toString(),
              studentName: data.studentName,
              studentNumber: data.studentNumber,
              activityType: 'JOIN',
              details: 'Entered the examination room.',
              timestamp: logTime,
            },
            ...prev,
          ]);
        } 
        
        else if (activity === 'STUDENT_SUBMISSION') {
          if (studentIndex !== -1) {
            const existingSubIndex = updated[studentIndex].submissions.findIndex(
              sub => sub.questionId === data.questionId
            );
            
            const submissionDetails = {
              id: Math.random().toString(),
              questionId: data.questionId || '',
              score: data.score,
              totalMarks: data.totalMarks,
              status: 'GRADED',
            };

            if (existingSubIndex === -1) {
              updated[studentIndex].submissions.push(submissionDetails);
            } else {
              updated[studentIndex].submissions[existingSubIndex] = submissionDetails;
            }
          }

          setActivityLogs(prev => [
            {
              id: Math.random().toString(),
              studentName: data.studentName,
              studentNumber: data.studentNumber,
              activityType: 'SUBMIT',
              details: `Submitted answer for "${data.questionTitle}"`,
              timestamp: logTime,
            },
            ...prev,
          ]);
        } 
        
        else if (activity === 'STUDENT_WARNING') {
          if (studentIndex !== -1) {
            updated[studentIndex].warningCount = data.warningCount;
          }

          setActivityLogs(prev => [
            {
              id: Math.random().toString(),
              studentName: data.studentName,
              studentNumber: data.studentNumber,
              activityType: 'WARNING',
              details: `Security Warning! Tab Switch/Unfocus detected. Total: ${data.warningCount}`,
              timestamp: logTime,
            },
            ...prev,
          ]);
        } 
        
        else if (activity === 'STUDENT_COMPLETED') {
          if (studentIndex !== -1) {
            updated[studentIndex].status = 'COMPLETED';
            updated[studentIndex].completedAt = logTime.toISOString();
          }

          setActivityLogs(prev => [
            {
              id: Math.random().toString(),
              studentName: data.studentName,
              studentNumber: data.studentNumber,
              activityType: 'COMPLETE',
              details: 'Finalized and submitted the examination.',
              timestamp: logTime,
            },
            ...prev,
          ]);
        }

        return updated;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, examInfo]);

  /* Screen 1: Access Verification */
  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-sys-background text-white" style={{ colorScheme: 'dark' }}>
        <div className="w-full max-w-md bg-[#0c1222] border border-[#1a2440] p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#bf4507] to-transparent" />
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="text-center mb-6 flex flex-col items-center">
              <CodexaLogo size="lg" layout="vertical" className="mb-2" />
              <span className="inline-block mt-2 text-[10px] bg-[#bf4507]/15 border border-[#bf4507]/30 text-[#bf4507] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Invigilator Operations Center
              </span>
              <div className="mt-4 p-3 bg-[#070b18] border border-[#161e36] rounded-xl text-xs font-mono font-bold text-slate-300">
                ROOM CODE: <span className="text-[#bf4507]">{params.accessCode.toUpperCase()}</span>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-[10px] uppercase tracking-widest text-[#bf4507] font-extrabold mb-2">
                Invigilator Passcode
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#070b18] border border-[#161e36] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#bf4507] transition-all text-center font-mono tracking-widest text-sm"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#bf4507] hover:bg-[#c24709] text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(191,69,7,0.3)] text-sm tracking-wide"
            >
              {loading ? 'Verifying Gateway...' : 'Enter Operations Center'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  /* Screen 2: Operations Center Real-time Monitor Desk */
  return (
    <div className="flex flex-col h-screen bg-[#030712] text-slate-100 overflow-hidden font-sans">
      {/* Operations Header Bar */}
      <header className="bg-[#0c1222] border-b border-[#1a2440] px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] bg-[#bf4507]/15 border border-[#bf4507]/30 text-[#bf4507] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
              OPERATIONS CENTER
            </span>
          </div>
          <h1 className="text-lg font-black tracking-wide text-white">{examInfo?.title}</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Access Code: <span className="text-[#bf4507] font-bold">{params.accessCode.toUpperCase()}</span> · Live Socket Gateway
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {examInfo?.status === 'PUBLISHED' && (
            <button
              onClick={() => setShowStopModal(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Stop Exam Room</span>
            </button>
          )}
          {examInfo?.status === 'ARCHIVED' && (
            <span className="px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-400 text-xs font-bold font-mono">
              EXAM TERMINATED
            </span>
          )}
          <div className="bg-[#070b18] border border-emerald-500/30 rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 text-emerald-400">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px]">Live Sync Connected</span>
          </div>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden bg-[#0c1222] border-b border-[#1a2440] text-slate-300 font-mono select-none flex-shrink-0">
        <button
          onClick={() => setActiveTab('candidates')}
          className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition-all ${
            activeTab === 'candidates' ? 'border-[#bf4507] text-white bg-[#1b2852]/40' : 'border-transparent text-slate-500'
          }`}
        >
          Candidates ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition-all ${
            activeTab === 'feed' ? 'border-[#bf4507] text-white bg-[#1b2852]/40' : 'border-transparent text-slate-500'
          }`}
        >
          Live Feed ({activityLogs.length})
        </button>
      </div>

      {/* Main Split Dashboard Pane */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Candidates Grid Status */}
        <main className={`w-full lg:w-2/3 p-8 overflow-y-auto border-r border-[#1a2440] ${
          activeTab === 'candidates' ? 'block' : 'hidden lg:block'
        }`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#bf4507]">
              Active Candidates ({sessions.length})
            </h2>
          </div>
          
          {sessions.length === 0 ? (
            <div className="h-[360px] flex flex-col items-center justify-center border border-dashed border-[#1a2440] rounded-3xl text-slate-500 text-xs font-mono">
              <div className="w-10 h-10 rounded-full bg-[#161e36] flex items-center justify-center text-slate-400 mb-3">
                ?
              </div>
              <p>Waiting for candidates to join the examination room...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {sessions.map((student) => {
                const isViolator = student.warningCount >= 3;
                const isCompleted = student.status === 'COMPLETED';

                return (
                  <div
                    key={student.id}
                    className={`p-6 rounded-3xl border transition-all relative overflow-hidden shadow-lg ${
                      isViolator
                        ? 'bg-red-950/20 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                        : isCompleted
                        ? 'bg-[#0c1222] border-[#1a2440] opacity-85'
                        : 'bg-[#0c1222] border-[#1a2440] hover:border-[#2a3a5c]'
                    }`}
                  >
                    {/* Glowing highlight indicator line */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${
                      isViolator ? 'bg-red-500' : isCompleted ? 'bg-[#bf4507]' : 'bg-emerald-500'
                    }`} />

                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-sm text-white">{student.studentName}</h3>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{student.studentNumber}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono tracking-wider ${
                        isCompleted
                          ? 'bg-[#bf4507]/20 text-[#bf4507] border border-[#bf4507]/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {student.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#1a2440] text-xs font-mono">
                      <div>
                        <span className="text-slate-400">Answers: </span>
                        <span className="font-bold text-white">{student.submissions.length}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Violations:</span>
                        <span className={`font-bold px-2 py-0.5 rounded-md ${
                          student.warningCount > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[#070b18] text-slate-400 border border-[#161e36]'
                        }`}>
                          {student.warningCount} / 3
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Right Side: Live Activity Feed */}
        <aside className={`w-full lg:w-1/3 p-6 overflow-y-auto bg-[#070b18] flex flex-col ${
          activeTab === 'feed' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#bf4507]">
              Live Room Stream
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">{activityLogs.length} events</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center pt-12 font-mono">No live activity events recorded yet.</p>
            ) : (
              activityLogs.map((log) => {
                let badgeColor = 'bg-slate-800 text-slate-400';
                if (log.activityType === 'WARNING') badgeColor = 'bg-red-500/20 text-red-400 border border-red-500/30';
                if (log.activityType === 'COMPLETE') badgeColor = 'bg-[#bf4507]/20 text-[#bf4507] border border-[#bf4507]/30';
                if (log.activityType === 'JOIN') badgeColor = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';

                return (
                  <div key={log.id} className="p-3.5 bg-[#0c1222] border border-[#1a2440] rounded-2xl text-xs space-y-1.5 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{log.studentName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-extrabold uppercase ${badgeColor}`}>
                        {log.activityType}
                      </span>
                      <p className="text-slate-300 text-[11px] leading-tight flex-1">{log.details}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* Stop Exam Confirmation Modal */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1222] border border-[#1a2440] rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center relative overflow-hidden">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white">Stop Ongoing Examination</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Are you sure you want to stop <strong className="text-white">{examInfo?.title}</strong>? All student sessions in this room will be immediately locked and their answers submitted.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowStopModal(false)}
                className="flex-1 px-4 py-2.5 border border-[#1a2440] text-slate-300 text-xs font-bold rounded-xl hover:bg-[#161e36] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleStopExam}
                disabled={stoppingExam}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {stoppingExam ? 'Stopping...' : 'Stop Exam Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
