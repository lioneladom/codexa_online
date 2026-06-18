'use client';

import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import RunTerminal from '@/components/RunTerminal';
import { getApiUrl } from '@/config/api';

interface TestCase {
  id?: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

interface Question {
  id: string;
  type: 'PROGRAMMING' | 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'FILL_IN_THE_BLANK';
  title: string;
  problemStatement: string;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  sampleInput?: string;
  sampleOutput?: string;
  options?: string;
  correctOption?: string;
  language?: string;
  marks: number;
  order: number;
}

interface Exam {
  id: string;
  title: string;
  courseCode: string;
  description?: string;
  duration: number;
  questions: Question[];
  studentPassword?: string;
}

export default function StudentExamPage({ params }: { params: { accessCode: string } }) {
  const [step, setStep] = useState<'entry' | 'exam' | 'completed'>('entry');
  const [activeTab, setActiveTab] = useState<'questions' | 'details' | 'code'>('questions');
  const [isQuestionsSidebarOpen, setIsQuestionsSidebarOpen] = useState(true);
  const [name, setName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [password, setPassword] = useState('');
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Exam workspace state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({});
  const [submissionStatuses, setSubmissionStatuses] = useState<{ [questionId: string]: 'DRAFT' | 'SAVING' | 'SAVED' | 'GRADED' }>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarningAlert, setShowWarningAlert] = useState(false);
  const [terminalRunId, setTerminalRunId] = useState(0);
  const [terminalRunning, setTerminalRunning] = useState(false);

  // References to track current values during tab switches
  const sessionIdRef = useRef(sessionId);
  const warningCountRef = useRef(warningCount);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    warningCountRef.current = warningCount;
  }, [warningCount]);

  // Fetch initial exam structure (anonymous access check)
  useEffect(() => {
    async function fetchExam() {
      try {
        const res = await fetch(`${getApiUrl()}/exams/access/${params.accessCode.toUpperCase()}`);
        if (res.ok) {
          const data = await res.json();
          setExam(data);
        } else {
          setError('Exam access code not found or is currently closed.');
        }
      } catch (err) {
        setError('Network error. Unable to connect to host server.');
      }
    }
    fetchExam();
  }, [params.accessCode]);

  // Load candidate details from sessionStorage if entering from the main gateway selection screen
  useEffect(() => {
    if (step === 'entry' && exam) {
      const savedName = sessionStorage.getItem('candidate_name');
      const savedNumber = sessionStorage.getItem('candidate_index');
      const savedPassword = sessionStorage.getItem('exam_password');
      if (savedName && savedNumber) {
        setName(savedName);
        setStudentNumber(savedNumber);
        if (savedPassword) {
          setPassword(savedPassword);
        }
        
        // Auto trigger connection logic
        const autoJoin = async () => {
          setLoading(true);
          setError('');
          try {
            const res = await fetch(`${getApiUrl()}/exams/access/${params.accessCode.toUpperCase()}/session`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: savedName, studentNumber: savedNumber, password: savedPassword || '' }),
            });

            if (res.ok) {
              const data = await res.json();
              setSessionId(data.session.id);
              const durationSeconds = data.exam.duration * 60;
              setTimeLeft(durationSeconds);

              const initialAnswers: { [key: string]: any } = {};
              const initialStatuses: { [key: string]: any } = {};

              data.exam.questions.forEach((q: Question) => {
                if (q.type === 'PROGRAMMING') {
                  initialAnswers[q.id] = { code: q.language === 'python' ? '# Write your python code here\n' : '// Write your code here\n', language: q.language || 'javascript' };
                } else {
                  initialAnswers[q.id] = '';
                }
                initialStatuses[q.id] = 'DRAFT';
              });

              setAnswers(initialAnswers);
              setSubmissionStatuses(initialStatuses);
              setStep('exam');
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              // Clear stored password if it failed so they can re-enter it manually
              sessionStorage.removeItem('exam_password');
            }
          } catch (err) {
            console.error('Auto join failed', err);
          } finally {
            setLoading(false);
          }
        };
        autoJoin();
      }
    }
  }, [step, exam, params.accessCode]);

  // Tab switch, focus loss, and shortcut blocks cheat prevention
  useEffect(() => {
    if (step !== 'exam') return;

    const reportBreach = async (eventType: string, metadata: string) => {
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId) {
        console.warn('Skipping breach report: No active session ID');
        return;
      }
      try {
        await fetch(`${getApiUrl()}/exams/access/${params.accessCode}/log-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSessionId,
            eventType,
            metadata: `${metadata}. Count: ${warningCountRef.current + 1}`,
          }),
        });
      } catch (e) {
        console.error('Failed to log event', e);
      }

      setWarningCount(prev => {
        const newCount = prev + 1;
        if (newCount >= 3) {
          alert('Exam Session Locked! Too many security violations detected. Your paper is being auto-submitted.');
          submitFinalExam(currentSessionId);
        } else {
          setShowWarningAlert(true);
        }
        return newCount;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reportBreach('TAB_SWITCH', 'User moved focus away from the exam tab/window');
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        if (!document.hasFocus()) {
          reportBreach('LOST_FOCUS', 'User interacted with another application or desktop element');
        }
      }, 200);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && ['c', 'v', 'x', 'a', 's'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        reportBreach('SHORTCUT_BLOCKED', `Attempted keyboard shortcut: ${e.key}`);
      }
      if (e.key === 'F12' || (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'i')) {
        e.preventDefault();
        reportBreach('DEV_TOOLS_BLOCKED', 'Attempted to open browser developer tools');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleFocus = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [step, params.accessCode]);

  // Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'exam' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            autoSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Format countdown string
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Join examination and create session
  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !studentNumber.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${getApiUrl()}/exams/access/${params.accessCode.toUpperCase()}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, studentNumber, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Verification failed. Double check your credentials.');
      }

      const data = await res.json();
      setSessionId(data.session.id);
      
      // Load duration and status
      const durationSeconds = data.exam.duration * 60;
      setTimeLeft(durationSeconds);
      
      // Initialize student questions answer map
      const initialAnswers: { [key: string]: any } = {};
      const initialStatuses: { [key: string]: any } = {};
      
      data.exam.questions.forEach((q: Question) => {
        if (q.type === 'PROGRAMMING') {
          initialAnswers[q.id] = { code: q.language === 'python' ? '# Write your python code here\n' : '// Write your code here\n', language: q.language || 'javascript' };
        } else {
          initialAnswers[q.id] = '';
        }
        initialStatuses[q.id] = 'DRAFT';
      });

      setAnswers(initialAnswers);
      setSubmissionStatuses(initialStatuses);
      setStep('exam');
      document.documentElement.requestFullscreen().catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Failed to initialize session.');
    } finally {
      setLoading(false);
    }
  };



  // Submit single question answer to backend (graded or saved)
  const handleSubmitAnswer = async (question: Question) => {
    const answerVal = answers[question.id];
    setSubmissionStatuses(prev => ({ ...prev, [question.id]: 'SAVING' }));

    try {
      const res = await fetch(`${getApiUrl()}/exams/access/${params.accessCode}/submit-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: question.id,
          answer: answerVal,
        }),
      });

      if (res.ok) {
        setSubmissionStatuses(prev => ({ ...prev, [question.id]: 'SAVED' }));
      } else {
        setSubmissionStatuses(prev => ({ ...prev, [question.id]: 'DRAFT' }));
      }
    } catch (e) {
      setSubmissionStatuses(prev => ({ ...prev, [question.id]: 'DRAFT' }));
    }
  };

  // Complete exam session manual triggers
  const handleFinishExam = async () => {
    const confirmSubmit = window.confirm('Are you sure you want to finalize and submit your examination paper? You will not be able to modify your answers after this.');
    if (!confirmSubmit) return;

    submitFinalExam();
  };

  const autoSubmitExam = () => {
    alert('Examination timer expired! Your answers are being auto-submitted.');
    submitFinalExam();
  };

  const submitFinalExam = async (sid?: string) => {
    const idToUse = sid || sessionId || sessionIdRef.current;
    if (!idToUse) return;
    setLoading(true);
    try {
      await fetch(`${getApiUrl()}/exams/access/${params.accessCode}/submit-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: idToUse }),
      });
      
      setStep('completed');
    } catch (err) {
      console.error(err);
      setError('Connection lost. Please contact the invigilator immediately to log your completion.');
    } finally {
      setLoading(false);
    }
  };

  const handleMCQChange = (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const currentQuestion = exam?.questions[currentQuestionIndex];

  // Inline Blank Replacer Logic
  const renderBlankStatement = (q: Question) => {
    const text = q.problemStatement;
    if (!text.includes('[blank]')) return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>;

    const parts = text.split('[blank]');
    const currentAnswer = answers[q.id] || '';
    const answersArray = currentAnswer ? currentAnswer.split(',') : [];

    const handleBlankTextChange = (index: number, val: string) => {
      const updated = [...answersArray];
      updated[index] = val.trim();
      setAnswers(prev => ({ ...prev, [q.id]: updated.join(',') }));
    };

    return (
      <div className="whitespace-pre-wrap leading-relaxed text-sm">
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < parts.length - 1 && (
              <input
                type="text"
                value={answersArray[index] || ''}
                onChange={(e) => handleBlankTextChange(index, e.target.value)}
                placeholder={`blank ${index + 1}`}
                className="mx-1 px-3 py-1 bg-white border border-[#e2e8f0] text-[#0a0f24] font-mono text-sm focus:outline-none focus:border-accent rounded-lg w-32 shadow-sm transition-all"
              />
            )}
          </span>
        ))}
      </div>
    );
  };

  /* Screen 1: Candidate Access Page */
  if (step === 'entry') {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-slate-50 text-slate-800">
        <div className="w-full max-w-md bg-white border border-slate-200/80 p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          
          <form className="space-y-5" onSubmit={handleStartExam}>
            <div className="text-center mb-6">
              <h1 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-slate-900 to-[#1b2554] bg-clip-text text-transparent font-sans">
                CODEXA
              </h1>
              <span className="inline-block mt-2 text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Student Exam Verification
              </span>
              {exam && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700">
                  {exam.title} ({exam.courseCode})
                </div>
              )}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Candidate Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Candidate Index / Student Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20261908"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>

              {exam?.studentPassword && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                    Exam Room Session Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0a0f24] hover:bg-[#1b2554] text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Starting Examination Room...' : 'Start Assessment'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  /* Screen 2: Finished Page */
  if (step === 'completed') {
    return (
      <main className="min-h-screen bg-[#f7fafc] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 flex justify-center">
              <svg className="w-20 h-20 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[#0a0f24]">Examination Completed</h1>
            <p className="text-slate-500 mt-2">
              Thank you. Your answers have been uploaded to the Codexa host database successfully.
            </p>
          </div>

          <div className="text-center bg-white rounded-2xl shadow-sm border border-[#e2e8f0] p-8">
            <p className="text-slate-500 mb-6">Results will be available at a later time.</p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-xl transition-all shadow-md"
            >
              Sign Out
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400 uppercase tracking-widest">
            Security Status: Verified • Session Saved
          </div>
        </div>
      </main>
    );
  }

  /* Screen 3: Exam Workspace Screen */
  return (
    <div className="flex flex-col h-screen bg-[#f7fafc]">
      {/* Warning Overlay banner */}
      {showWarningAlert && (
        <div className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-red-950 border border-red-500 rounded-2xl max-w-md p-6 text-center text-white">
            <div className="flex justify-center mb-3">
              <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">EXAM SECURITY WARNING</h3>
            <p className="text-sm text-red-200 mt-2">
              Tab switching or unfocusing the exam window is strictly forbidden. 
              This event has been logged and broadcasted to the invigilator dashboard.
            </p>
            <p className="text-xs text-red-300/80 mt-1 uppercase font-mono tracking-wider">
              Total Violations: {warningCount}
            </p>
            <button
              onClick={() => setShowWarningAlert(false)}
              className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all"
            >
              Acknowledge and Resume Exam
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Header */}
      <header className="bg-[#0a0f24] text-white px-6 py-4 border-b border-[#1e295d] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
        <div>
          <h1 className="text-lg font-bold font-sans tracking-wide text-[#ffffff]">{exam?.title}</h1>
          <div className="flex flex-wrap gap-2 text-xs text-slate-400 mt-0.5 font-mono">
            <span>Course: {exam?.courseCode}</span>
            <span>•</span>
            <span>Candidate: {name} ({studentNumber})</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between md:justify-end gap-6 w-full md:w-auto">
          <div className="text-lg font-mono flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-400">Time Left:</span>
            <span className={`font-bold px-3 py-1 rounded-lg ${timeLeft < 300 ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' : 'bg-[#1b2554] border border-[#2b3a7a]'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          
          <button
            onClick={handleFinishExam}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-md w-full md:w-auto"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Workspace Panel Split */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Left Navigator Side */}
        <aside
          className={`${
            isQuestionsSidebarOpen ? 'lg:w-72 lg:opacity-100' : 'lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-r-0'
          } bg-[#0d1430] border-r border-[#1e295d] p-4 flex flex-col justify-between overflow-y-auto transition-all duration-300 ${
            activeTab === 'questions' ? 'flex flex-1 w-full lg:flex-none' : 'hidden lg:flex'
          }`}
        >
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 font-mono">Questions</h2>
            <div className="space-y-2">
              {exam?.questions.map((q, idx) => {
                const status = submissionStatuses[q.id] || 'DRAFT';
                const isActive = idx === currentQuestionIndex;

                let indicatorColor = 'bg-slate-500/25 text-slate-400';
                if (status === 'SAVED') {
                  indicatorColor = 'bg-accent/20 text-accent border border-accent/30';
                } else if (status === 'SAVING') {
                  indicatorColor = 'bg-yellow-500/20 text-yellow-400 animate-pulse';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      if (window.innerWidth < 1024) {
                        setActiveTab('details');
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex justify-between items-center border ${
                      isActive 
                        ? 'bg-[#1b2554] border-accent text-white shadow-md' 
                        : 'bg-transparent border-transparent text-slate-300 hover:bg-[#11193a]'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm">Q{idx + 1}</div>
                      <div className="text-xs opacity-60 truncate max-w-[140px] mt-0.5">{q.title}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[10px] font-semibold">{q.marks}m</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${indicatorColor}`}>
                        {status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security alerts log status */}
          <div className="pt-4 border-t border-[#1e295d] text-xs text-slate-400 mt-6">
            <div className="flex justify-between items-center">
              <span>Violations logged:</span>
              <span className={warningCount > 0 ? 'text-red-400 font-bold' : 'text-green-400'}>{warningCount}</span>
            </div>
          </div>
        </aside>

        {/* Center / Right Content Panel */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Mobile Tab Selector */}
          <div className="flex lg:hidden bg-[#0d1430] border-b border-[#1e295d] text-slate-300 font-mono select-none flex-shrink-0">
            <button
              onClick={() => setActiveTab('questions')}
              className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'questions' ? 'border-accent text-white bg-[#11193a]' : 'border-transparent text-slate-400'
              }`}
            >
              Questions ({exam?.questions.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'details' ? 'border-accent text-white bg-[#11193a]' : 'border-transparent text-slate-400'
              }`}
            >
              Details
            </button>
            {currentQuestion && currentQuestion.type === 'PROGRAMMING' && (
              <button
                onClick={() => setActiveTab('code')}
                className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all ${
                  activeTab === 'code' ? 'border-accent text-white bg-[#11193a]' : 'border-transparent text-slate-400'
                }`}
              >
                Code & Run
              </button>
            )}
          </div>

          {currentQuestion && (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              
              {/* Split left side: Question description */}
              <div
                className={`w-full lg:w-1/2 p-6 overflow-y-auto border-r border-[#e2e8f0] bg-white flex flex-col justify-between ${
                  activeTab === 'details' ? 'flex flex-1 flex-col' : 'hidden lg:flex lg:flex-col'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsQuestionsSidebarOpen(!isQuestionsSidebarOpen)}
                        className="hidden lg:block text-slate-500 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        title={isQuestionsSidebarOpen ? "Hide Questions List" : "Show Questions List"}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {isQuestionsSidebarOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                          )}
                        </svg>
                      </button>
                      <h2 className="text-xl font-bold text-[#0a0f24]">
                        Q{currentQuestionIndex + 1}: {currentQuestion.title}
                      </h2>
                    </div>
                    <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0">
                      {currentQuestion.marks} Marks
                    </span>
                  </div>

                  {/* Dynamic Blank / Text Statement */}
                  <div className="mb-6">
                    {currentQuestion.type === 'FILL_IN_THE_BLANK' ? (
                      renderBlankStatement(currentQuestion)
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed text-sm text-[#2d3748]">
                        {currentQuestion.problemStatement}
                      </p>
                    )}
                  </div>

                  {/* Extra programming details */}
                  {currentQuestion.type === 'PROGRAMMING' && (
                    <div className="space-y-4 text-xs">
                      {currentQuestion.constraints && (
                        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                          <h4 className="font-semibold text-slate-700 mb-1">Constraints</h4>
                          <pre className="whitespace-pre-wrap font-sans text-slate-600">{currentQuestion.constraints}</pre>
                        </div>
                      )}
                      {currentQuestion.inputFormat && (
                        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                          <h4 className="font-semibold text-slate-700 mb-1">Input Format</h4>
                          <pre className="whitespace-pre-wrap font-sans text-slate-600">{currentQuestion.inputFormat}</pre>
                        </div>
                      )}
                      {currentQuestion.outputFormat && (
                        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                          <h4 className="font-semibold text-slate-700 mb-1">Output Format</h4>
                          <pre className="whitespace-pre-wrap font-sans text-slate-600">{currentQuestion.outputFormat}</pre>
                        </div>
                      )}
                      {currentQuestion.sampleInput && (
                        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                          <h4 className="font-semibold text-slate-700 mb-1">Sample Input</h4>
                          <pre className="font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 mt-1">{currentQuestion.sampleInput}</pre>
                        </div>
                      )}
                      {currentQuestion.sampleOutput && (
                        <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                          <h4 className="font-semibold text-slate-700 mb-1">Sample Output</h4>
                          <pre className="font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 mt-1">{currentQuestion.sampleOutput}</pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MCQ Selector list */}
                  {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options && (
                    <div className="space-y-3 mt-4">
                      {JSON.parse(currentQuestion.options).map((option: string, idx: number) => {
                        const isSelected = answers[currentQuestion.id] === option;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleMCQChange(currentQuestion.id, option)}
                            className={`w-full text-left p-4 rounded-xl border transition-all text-sm flex items-center gap-3 ${
                              isSelected
                                ? 'bg-accent/10 border-accent text-[#0a0f24] font-semibold shadow-sm'
                                : 'bg-transparent border-[#e2e8f0] text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center text-[10px] ${
                              isSelected ? 'border-accent bg-accent text-white font-bold' : 'border-slate-300'
                            }`}>
                              {isSelected && '✓'}
                            </span>
                            <span>{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer input field */}
                  {currentQuestion.type === 'SHORT_ANSWER' && (
                    <div className="mt-4">
                      <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Your Answer</label>
                      <input
                        type="text"
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                        placeholder="Type your answer here..."
                        className="w-full px-4 py-2 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:border-accent shadow-sm"
                      />
                    </div>
                  )}

                  {/* Long Answer textarea */}
                  {currentQuestion.type === 'LONG_ANSWER' && (
                    <div className="mt-4">
                      <label className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Write your explanation / essay response</label>
                      <textarea
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                        placeholder="Write your answer details..."
                        className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:border-accent shadow-sm"
                        rows={8}
                      />
                    </div>
                  )}
                </div>

                {/* Non-programming answer submit actions */}
                {currentQuestion.type !== 'PROGRAMMING' && (
                  <div className="pt-4 border-t border-slate-100 flex justify-end mt-6">
                    <button
                      onClick={() => handleSubmitAnswer(currentQuestion)}
                      className="bg-accent hover:bg-accent/90 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-all shadow-sm"
                    >
                      Save Answer
                    </button>
                  </div>
                )}
              </div>

              {/* Split right side: Monaco editor / run terminal (Only for PROGRAMMING) */}
              <div
                className={`w-full lg:w-1/2 flex flex-col overflow-hidden bg-slate-900 ${
                  activeTab === 'code' ? 'flex flex-1 flex-col' : 'hidden lg:flex lg:flex-col'
                }`}
              >
                {currentQuestion.type === 'PROGRAMMING' ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Editor header options */}
                    <div className="bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-400 border-b border-slate-800 flex justify-between items-center">
                      <span>Monaco Code Workspace ({currentQuestion.language})</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">VS-Dark</span>
                    </div>
                    
                    {/* Monaco Code Editor */}
                    <div className="flex-1 min-h-[300px]">
                      <Editor
                        height="100%"
                        language={currentQuestion.language || 'javascript'}
                        theme="vs-dark"
                        value={answers[currentQuestion.id]?.code || ''}
                        onChange={(val) => {
                          setAnswers(prev => ({
                            ...prev,
                            [currentQuestion.id]: {
                              code: val || '',
                              language: currentQuestion.language || 'javascript'
                            }
                          }));
                        }}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          lineNumbers: 'on',
                          automaticLayout: true,
                          scrollbar: {
                            vertical: 'visible',
                            horizontal: 'visible',
                          }
                        }}
                      />
                    </div>

                    {/* Console / Submission Controls */}
                    <div className="h-64 border-t border-slate-800 bg-[#060814] flex flex-col">
                      <div className="bg-[#0b0f24] border-b border-slate-800 px-4 py-2 flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-400 font-mono">Terminal Console</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (terminalRunning) {
                                  setTerminalRunning(false);
                                } else {
                                  setTerminalRunId(prev => prev + 1);
                                  setTerminalRunning(true);
                                }
                            }}
                            className={`text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                              terminalRunning
                                ? 'bg-red-950 border-red-800 hover:bg-red-900'
                                : 'bg-[#1b2554] border-[#2b3a7a] hover:bg-[#2c3d82]'
                            }`}
                          >
                            {terminalRunning ? 'Stop Code' : 'Run Code'}
                          </button>
                          <button
                            onClick={() => handleSubmitAnswer(currentQuestion)}
                            className="bg-accent hover:bg-accent/90 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm"
                          >
                            Submit Answer
                          </button>
                        </div>
                      </div>
                      
                      {/* Console Body */}
                      <div className="flex-1 min-h-0 relative bg-[#060814]">
                        {terminalRunning ? (
                          <RunTerminal
                            code={answers[currentQuestion.id]?.code || ''}
                            language={currentQuestion.language || 'javascript'}
                            runId={terminalRunId}
                            timeLimitSec={15}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-500 text-xs font-mono">
                            Press &quot;Run Code&quot; to compile and execute program in interactive console.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Non programming instruction message */
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-sm p-8 text-center bg-slate-900">
                    <div>
                      <div className="text-4xl mb-2 flex justify-center">
                        <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <p className="text-slate-300">This is a text-based input question.</p>
                      <p className="text-xs text-slate-500 mt-1">Please provide your solution in the left editor response panels.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}