'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

import { getApiUrl, getSocketUrl } from '@/config/api';

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

export default function ExamMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [examInfo, setExamInfo] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const socketRef = useRef<Socket | null>(null);

  const fetchInitialData = async () => {
    const token = localStorage.getItem('codexa_token');
    if (!token) {
      router.replace('/');
      return;
    }

    try {
      // Fetch exam details
      const examRes = await fetch(`${getApiUrl()}/exams/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (examRes.ok) {
        const examData = await examRes.json();
        setExamInfo(examData);
      }

      // Fetch active sessions
      const sessionsRes = await fetch(`${getApiUrl()}/exams/${params.id}/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to seed initial monitor sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [params.id]);

  useEffect(() => {
    if (!examInfo) return;

    // Connect to WebSocket server
    const socket = io(getSocketUrl());
    socketRef.current = socket;

    socket.on('connect', () => {
      // Join exam room
      socket.emit('joinExam', {
        examId: examInfo.id,
        userType: 'LECTURER',
        name: 'Exam Owner',
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
              details: `Submitted question "${data.questionTitle}" • Scored ${data.score}/${data.totalMarks}`,
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
              details: `Security Violation! Tab Switch detected. Total warnings: ${data.warningCount}`,
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
              details: 'Completed and submitted the examination.',
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
  }, [examInfo]);

  return (
    <div className="p-8">
      {/* Header bar */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0a0f24]">Live Exam Monitor</h1>
          {examInfo && (
            <p className="text-slate-500 text-sm mt-1">
              Currently monitoring: <span className="font-semibold text-slate-700">{examInfo.title}</span> ({examInfo.courseCode})
            </p>
          )}
        </div>
        <button
          onClick={() => router.back()}
          className="bg-white border border-[#e2e8f0] text-slate-700 font-semibold px-4 py-2 rounded-xl text-xs hover:bg-slate-50 transition-all shadow-sm"
        >
          ← Back to Exams
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 bg-white border border-[#e2e8f0] rounded-2xl shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-2"></div>
          <p>Seeding active exam room gateway...</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Candidates Status Grid */}
          <div className="flex-1 bg-white border border-[#e2e8f0] p-6 rounded-2xl shadow-sm">
            <h2 className="text-sm font-bold text-[#0a0f24] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Active Candidates ({sessions.length})
            </h2>

            {sessions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-[#e2e8f0] rounded-xl">
                No candidates have connected to this exam room yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessions.map((student) => {
                  const isViolator = student.warningCount >= 3;
                  const isCompleted = student.status === 'COMPLETED';

                  return (
                    <div
                      key={student.id}
                      className={`p-4 border rounded-xl transition-all relative overflow-hidden ${
                        isViolator
                          ? 'bg-red-50 border-red-200'
                          : isCompleted
                          ? 'bg-slate-50 border-slate-200 opacity-75'
                          : 'bg-white border-[#e2e8f0] hover:shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-sm text-[#0a0f24]">{student.studentName}</h4>
                          <p className="text-xs text-slate-500 font-mono">{student.studentNumber}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          isCompleted
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {student.status}
                        </span>
                      </div>

                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                        <span>Answers: <strong className="text-slate-700">{student.submissions.length}</strong></span>
                        <div className="flex items-center gap-1">
                          <span>Warnings:</span>
                          <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                            student.warningCount > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {student.warningCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live activity feed sidebar */}
          <div className="w-full lg:w-80 bg-white border border-[#e2e8f0] p-6 rounded-2xl shadow-sm flex flex-col h-[500px]">
            <h2 className="text-sm font-bold text-[#0a0f24] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Live Feed Stream
            </h2>
            <div className="flex-1 overflow-y-auto space-y-3">
              {activityLogs.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center pt-8">Real-time candidate actions will display here.</p>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-[#e2e8f0] rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">{log.studentName}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-500 text-[10px] leading-relaxed">{log.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
