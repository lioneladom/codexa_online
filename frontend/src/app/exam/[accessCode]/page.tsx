'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import RunTerminal from '@/components/RunTerminal';
import { getApiUrl } from '@/config/api';
import CodexaLogo from '@/components/CodexaLogo';
import { TINT_PRESETS, getActiveMode, getActiveTint, applyThemeMode, getActiveTheme } from '@/config/themes';

interface TestCase {
  id?: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

interface Question {
  id: string;
  type: 'PROGRAMMING' | 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'FILL_IN_THE_BLANK' | 'TRUE_FALSE';
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

  // States for panel resizability and submit dialog
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [editorWidthPercent, setEditorWidthPercent] = useState(50);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExamStoppedModal, setShowExamStoppedModal] = useState(false);
  const [activeTheme, setActiveTheme] = useState('dark');
  const [showThemeModal, setShowThemeModal] = useState(false);
  
  const isResizingSidebar = useRef(false);
  const isResizingEditor = useRef(false);
  const lastSavedAnswersRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    applyThemeMode('dark', '#bf4507');
    setActiveTheme('dark');
    const handleThemeChange = () => {
      setActiveTheme(getActiveTheme());
    };
    window.addEventListener('codexa_theme_change', handleThemeChange);
    return () => window.removeEventListener('codexa_theme_change', handleThemeChange);
  }, []);

  const startResizeSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingSidebar.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const startResizeEditor = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingEditor.current = true;
    document.body.style.cursor = 'col-resize';
  };

  // Resize handler listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar.current) {
        const newWidth = Math.max(160, Math.min(450, e.clientX));
        setSidebarWidth(newWidth);
      } else if (isResizingEditor.current) {
        const workspaceLeft = isQuestionsSidebarOpen ? sidebarWidth : 0;
        const totalWorkspaceWidth = window.innerWidth - workspaceLeft;
        if (totalWorkspaceWidth > 0) {
          const editorLeft = e.clientX - workspaceLeft;
          const percentage = Math.max(20, Math.min(80, (editorLeft / totalWorkspaceWidth) * 100));
          setEditorWidthPercent(100 - percentage);
        }
      }
    };

    const handleMouseUp = () => {
      isResizingSidebar.current = false;
      isResizingEditor.current = false;
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [sidebarWidth, isQuestionsSidebarOpen]);

  // Debounced auto-save hook
  useEffect(() => {
    if (step !== 'exam' || !sessionId || !exam) return;

    if (!lastSavedAnswersRef.current) {
      lastSavedAnswersRef.current = JSON.parse(JSON.stringify(answers));
      return;
    }

    const changedQuestionIds: string[] = [];
    exam.questions.forEach((q) => {
      const curr = answers[q.id];
      const prev = lastSavedAnswersRef.current[q.id];
      if (JSON.stringify(curr) !== JSON.stringify(prev)) {
        changedQuestionIds.push(q.id);
      }
    });

    if (changedQuestionIds.length === 0) return;

    changedQuestionIds.forEach((id) => {
      setSubmissionStatuses((prev) => ({ ...prev, [id]: 'SAVING' }));
    });

    const timer = setTimeout(async () => {
      for (const qId of changedQuestionIds) {
        const question = exam.questions.find((q) => q.id === qId);
        if (!question) continue;

        try {
          const answerVal = answers[qId];
          const res = await fetch(`${getApiUrl()}/exams/access/${params.accessCode}/submit-question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              questionId: qId,
              answer: answerVal,
            }),
          });
          if (res.ok) {
            setSubmissionStatuses((prev) => ({ ...prev, [qId]: 'SAVED' }));
            if (lastSavedAnswersRef.current) {
              lastSavedAnswersRef.current[qId] = JSON.parse(JSON.stringify(answerVal));
            }
          } else {
            setSubmissionStatuses((prev) => ({ ...prev, [qId]: 'DRAFT' }));
            if (res.status === 403) {
              setShowExamStoppedModal(true);
            }
          }
        } catch (e) {
          setSubmissionStatuses((prev) => ({ ...prev, [qId]: 'DRAFT' }));
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [answers, step, sessionId, exam, params.accessCode]);

  // References to track current values during tab switches
  const sessionIdRef = useRef(sessionId);
  const warningCountRef = useRef(warningCount);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    warningCountRef.current = warningCount;
  }, [warningCount]);

  // Reset terminal console when switching questions
  useEffect(() => {
    setTerminalRunning(false);
    setTerminalRunId(0);
  }, [currentQuestionIndex]);

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
              lastSavedAnswersRef.current = JSON.parse(JSON.stringify(initialAnswers));
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
      lastSavedAnswersRef.current = JSON.parse(JSON.stringify(initialAnswers));
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
        if (res.status === 403) {
          setShowExamStoppedModal(true);
        }
      }
    } catch (e) {
      setSubmissionStatuses(prev => ({ ...prev, [question.id]: 'DRAFT' }));
    }
  };

  // Complete exam session manual triggers
  const handleFinishExam = async () => {
    setShowSubmitConfirm(true);
  };

  const autoSubmitExam = () => {
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
    if (!text.includes('[blank]')) return <p className="whitespace-pre-wrap leading-relaxed text-sm text-[#f0f2f8]">{text}</p>;

    const parts = text.split('[blank]');
    const currentAnswer = answers[q.id] || '';
    const answersArray = currentAnswer ? currentAnswer.split(',') : [];

    const handleBlankTextChange = (index: number, val: string) => {
      const updated = [...answersArray];
      updated[index] = val;
      setAnswers(prev => ({ ...prev, [q.id]: updated.join(',') }));
    };

    return (
      <div className="whitespace-pre-wrap leading-relaxed text-sm text-[#f0f2f8]">
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < parts.length - 1 && (
              <input
                type="text"
                value={answersArray[index] || ''}
                onChange={(e) => handleBlankTextChange(index, e.target.value)}
                placeholder={`blank ${index + 1}`}
                className="mx-1 px-3 py-1 bg-[#070b18] border border-[#1a2440] text-white font-mono text-sm focus:outline-none focus:border-[#bf4507] rounded-lg w-32 shadow-sm transition-all"
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
      <main className="flex min-h-screen items-center justify-center p-6 bg-[#030712] text-[#f0f2f8] selection:bg-[#bf4507]/30 selection:text-[#bf4507] relative overflow-hidden" style={{ colorScheme: 'dark' }}>
        {/* Subtle Background Glow Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1b2852]/20 via-[#030712]/80 to-[#030712] pointer-events-none" />

        <div className="w-full max-w-md bg-[#0c1222] border border-[#1a2440] p-8 rounded-3xl shadow-2xl relative z-10 overflow-hidden backdrop-blur-xl">
          {/* Top Accent Gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#bf4507] to-transparent" />
          
          <form className="space-y-5" onSubmit={handleStartExam}>
            <div className="text-center mb-6 flex flex-col items-center">
              <CodexaLogo size="lg" layout="vertical" className="mb-2" />
              <span className="inline-block mt-2 text-[10px] bg-[#bf4507]/15 border border-[#bf4507]/30 text-[#bf4507] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                Student Exam Verification
              </span>
              {exam && (
                <div className="mt-4 p-3 bg-[#070b18] border border-[#1a2440] rounded-xl text-sm font-semibold text-white w-full">
                  {exam.title} ({exam.courseCode})
                </div>
              )}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-2xl flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#bf4507] font-extrabold mb-2">
                  Candidate Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#070b18] border border-[#161e36] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#bf4507] transition-all text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#bf4507] font-extrabold mb-2">
                  Candidate Index / Student Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20261908"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-[#070b18] border border-[#161e36] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#bf4507] transition-all text-sm font-mono"
                  required
                />
              </div>

              {exam?.studentPassword && (
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#bf4507] font-extrabold mb-2">
                    Exam Room Session Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-[#070b18] border border-[#161e36] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#bf4507] transition-all text-sm"
                    required
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#bf4507] hover:bg-[#c24709] text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(191,69,7,0.3)] active:scale-[0.98] disabled:opacity-50 text-sm tracking-wide mt-2"
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
      <main className="min-h-screen bg-[#030712] text-[#f0f2f8] selection:bg-[#bf4507]/30 selection:text-[#bf4507] p-6 flex items-center justify-center relative overflow-hidden" style={{ colorScheme: 'dark' }}>
        {/* Subtle Background Glow Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1b2852]/20 via-[#030712]/80 to-[#030712] pointer-events-none" />

        <div className="max-w-md w-full bg-[#0c1222] border border-[#1a2440] rounded-3xl p-8 text-center shadow-2xl relative z-10 overflow-hidden backdrop-blur-xl">
          {/* Top Accent Gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#bf4507] to-transparent" />

          <div className="text-6xl mb-4 flex justify-center">
            <svg className="w-16 h-16 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Examination Completed</h1>
          <p className="text-[#7b8aaa] text-sm mt-2 mb-6">
            Thank you. Your answers have been uploaded to the Codexa host database successfully.
          </p>

          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = `/exam/${params.accessCode}`;
            }}
            className="w-full bg-[#bf4507] hover:bg-[#c24709] text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-[0_4px_20px_rgba(191,69,7,0.3)] text-sm tracking-wide"
          >
            Sign Out
          </button>

          <div className="mt-6 text-center text-[10px] text-[#7b8aaa] uppercase tracking-widest font-mono">
            Security Status: Verified • Session Saved
          </div>
        </div>
      </main>
    );
  }

  /* Screen 3: Exam Workspace Screen */
  return (
    <div className="flex flex-col h-screen bg-[#030712] text-[#f0f2f8]">
      {/* Warning Overlay banner */}
      {showWarningAlert && (
        <div className="fixed inset-0 z-50 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-red-950/90 border border-red-500 rounded-2xl max-w-md p-6 text-center text-white shadow-2xl">
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
              className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md"
            >
              Acknowledge and Resume Exam
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Header */}
      <header className="bg-[#070b18] text-white px-6 py-4 border-b border-[#1a2440] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
        <div>
          <h1 className="text-lg font-bold font-sans tracking-wide text-white">{exam?.title}</h1>
          <div className="flex flex-wrap gap-2 text-xs text-[#7b8aaa] mt-0.5 font-mono">
            <span>Course: {exam?.courseCode}</span>
            <span>•</span>
            <span>Candidate: {name} ({studentNumber})</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between md:justify-end gap-6 w-full md:w-auto">
          <div className="text-lg font-mono flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-[#7b8aaa]">Time Left:</span>
            <span className={`font-bold px-3 py-1 rounded-lg ${timeLeft < 300 ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' : 'bg-[#0c1222] border border-[#1a2440] text-white'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs text-[#7b8aaa] font-mono">
              {Object.values(submissionStatuses).includes('SAVING') ? 'Saving changes...' : 'All answers saved'}
            </span>
            <button
              onClick={handleFinishExam}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-md w-full md:w-auto"
            >
              Submit Exam
            </button>
            <button
              type="button"
              onClick={() => setShowThemeModal(true)}
              className="p-2 bg-[#0c1222] hover:bg-[#161e36] border border-[#1a2440] text-white rounded-xl transition-all shadow-md"
              title="Appearance Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Panel Split */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Left Navigator Side */}
        <aside
          style={{ width: isQuestionsSidebarOpen && typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${sidebarWidth}px` : undefined }}
          className={`${
            isQuestionsSidebarOpen ? 'lg:opacity-100' : 'lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-r-0'
          } bg-[#070b18] border-r border-[#1a2440] p-4 flex flex-col justify-between overflow-y-auto transition-all duration-300 ${
            activeTab === 'questions' ? 'flex flex-1 w-full lg:flex-none' : 'hidden lg:flex'
          }`}
        >
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7b8aaa] mb-4 font-mono">Questions</h2>
            <div className="grid grid-cols-4 gap-2">
              {exam?.questions.map((q, idx) => {
                const status = submissionStatuses[q.id] || 'DRAFT';
                const isActive = idx === currentQuestionIndex;
                const isSaved = status === 'SAVED';

                let bgClass = 'bg-[#0c1222] border-[#1a2440] text-[#7b8aaa] hover:bg-[#161e36]';
                if (isActive) {
                  bgClass = 'bg-[#bf4507] border-[#bf4507] text-white shadow-md ring-2 ring-[#bf4507]/35';
                } else if (isSaved) {
                  bgClass = 'bg-emerald-950/45 border-emerald-500 text-emerald-300 hover:bg-emerald-950/60';
                } else if (status === 'SAVING') {
                  bgClass = 'bg-yellow-950/45 border-yellow-500 text-yellow-300 animate-pulse';
                }

                return (
                  <button
                    key={q.id}
                    title={`${q.title} (${q.marks} marks)`}
                    onClick={() => {
                      setCurrentQuestionIndex(idx);
                      if (window.innerWidth < 1024) {
                        setActiveTab('details');
                      }
                    }}
                    className={`aspect-square w-full rounded-xl transition-all flex flex-col items-center justify-center border font-mono font-semibold text-xs ${bgClass}`}
                  >
                    <span>{idx + 1}</span>
                    <span className="text-[9px] opacity-75 mt-0.5">{q.marks}m</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security alerts log status */}
          <div className="pt-4 border-t border-[#1a2440] text-xs text-[#7b8aaa] mt-6">
            <div className="flex justify-between items-center">
              <span>Violations logged:</span>
              <span className={warningCount > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}>{warningCount}</span>
            </div>
          </div>
        </aside>

        {isQuestionsSidebarOpen && (
          <div
            onMouseDown={startResizeSidebar}
            className="hidden lg:block w-1 hover:w-1.5 bg-[#1a2440] hover:bg-[#bf4507] cursor-col-resize transition-all h-full self-stretch select-none"
          />
        )}

        {/* Center / Right Content Panel */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#030712]">
          {/* Mobile Tab Selector */}
          <div className="flex lg:hidden bg-[#070b18] border-b border-[#1a2440] text-slate-300 font-mono select-none flex-shrink-0">
            <button
              onClick={() => setActiveTab('questions')}
              className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'questions' ? 'border-[#bf4507] text-white bg-[#0c1222]' : 'border-transparent text-[#7b8aaa]'
              }`}
            >
              Questions ({exam?.questions.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'details' ? 'border-[#bf4507] text-white bg-[#0c1222]' : 'border-transparent text-[#7b8aaa]'
              }`}
            >
              Details
            </button>
            {currentQuestion && currentQuestion?.type === 'PROGRAMMING' && (
              <button
                onClick={() => setActiveTab('code')}
                className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all ${
                  activeTab === 'code' ? 'border-[#bf4507] text-white bg-[#0c1222]' : 'border-transparent text-[#7b8aaa]'
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
                style={{ width: currentQuestion?.type === 'PROGRAMMING' && typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${100 - editorWidthPercent}%` : undefined }}
                className={`w-full p-6 overflow-y-auto border-r border-[#1a2440] bg-[#0c1222] text-[#f0f2f8] flex flex-col justify-between ${
                  activeTab === 'details' ? 'flex flex-1 flex-col' : 'hidden lg:flex lg:flex-col'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center border-b border-[#1a2440] pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsQuestionsSidebarOpen(!isQuestionsSidebarOpen)}
                        className="hidden lg:block text-[#7b8aaa] hover:text-white p-1.5 rounded-lg hover:bg-[#161e36] transition-colors"
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
                      <h2 className="text-base font-bold text-white">
                        Question {currentQuestionIndex + 1}: {currentQuestion.title}
                      </h2>
                    </div>
                    <span className="text-xs font-mono bg-[#161e36] text-[#bf4507] px-2.5 py-1 rounded-md border border-[#1e295d] font-bold">
                      {currentQuestion.marks} Marks
                    </span>
                  </div>

                  {/* Problem statement / blank renderer */}
                  <div className="mb-6">
                    {currentQuestion.type === 'FILL_IN_THE_BLANK' ? (
                      renderBlankStatement(currentQuestion)
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed text-sm text-[#f0f2f8]">
                        {currentQuestion.problemStatement}
                      </p>
                    )}
                  </div>

                  {/* MCQ or TRUE_FALSE Options */}
                  {(currentQuestion.type === 'MULTIPLE_CHOICE' || currentQuestion.type === 'TRUE_FALSE') && (
                    <div className="space-y-3 mb-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#bf4507] font-mono">
                        Select Option:
                      </p>
                      {currentQuestion.options?.split('|||').map((option, idx) => {
                        const trimmedOption = option.trim();
                        const isSelected = answers[currentQuestion.id] === trimmedOption;
                        return (
                          <label
                            key={idx}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#bf4507]/15 border-[#bf4507] text-white font-semibold ring-1 ring-[#bf4507]/50'
                                : 'bg-[#070b18] hover:bg-[#161e36] border-[#1a2440] text-[#f0f2f8]'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`mcq-${currentQuestion.id}`}
                              value={trimmedOption}
                              checked={isSelected}
                              onChange={() => handleMCQChange(currentQuestion.id, trimmedOption)}
                              className="w-4 h-4 accent-[#bf4507]"
                            />
                            <span className="text-sm">{trimmedOption}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* SHORT_ANSWER Input */}
                  {currentQuestion.type === 'SHORT_ANSWER' && (
                    <div className="mb-6 space-y-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#bf4507] font-mono">
                        Your Answer:
                      </label>
                      <input
                        type="text"
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                        placeholder="Type short answer here..."
                        className="w-full px-4 py-3 bg-[#070b18] border border-[#1a2440] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#bf4507] transition-all text-sm"
                      />
                    </div>
                  )}

                  {/* LONG_ANSWER Textarea */}
                  {currentQuestion.type === 'LONG_ANSWER' && (
                    <div className="mb-6 space-y-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#bf4507] font-mono">
                        Comprehensive Answer Response:
                      </label>
                      <textarea
                        rows={8}
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                        placeholder="Write your explanation or detailed response here..."
                        className="w-full p-4 bg-[#070b18] border border-[#1a2440] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-[#bf4507] transition-all text-sm leading-relaxed"
                      />
                    </div>
                  )}
                </div>

                {/* Footer question navigator buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-[#1a2440] mt-6">
                  <button
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    className="bg-[#070b18] hover:bg-[#161e36] text-[#7b8aaa] hover:text-white border border-[#1a2440] disabled:opacity-40 disabled:hover:bg-[#070b18] disabled:hover:text-[#7b8aaa] px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                  >
                    ← Previous
                  </button>

                  <button
                    disabled={!exam || currentQuestionIndex === exam.questions.length - 1}
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="bg-[#bf4507] hover:bg-[#c24709] text-white disabled:opacity-40 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md"
                  >
                    Next Question →
                  </button>
                </div>
              </div>

              {/* Split right side: Monaco editor / run terminal (Only for PROGRAMMING) */}
              <div
                style={{ width: currentQuestion?.type === 'PROGRAMMING' && typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${editorWidthPercent}%` : undefined }}
                className={`w-full flex flex-col overflow-hidden bg-slate-900 ${
                  activeTab === 'code' ? 'flex flex-1 flex-col' : 'hidden lg:flex lg:flex-col'
                }`}
              >
                {currentQuestion?.type === 'PROGRAMMING' ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Editor header options */}
                    <div className="bg-[#070b18] px-4 py-2 text-xs font-semibold text-slate-400 border-b border-[#1a2440] flex justify-between items-center">
                      <span>Monaco Code Workspace ({currentQuestion?.language || 'javascript'})</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">VS-Dark</span>
                    </div>
                    
                    {/* Monaco Code Editor */}
                    <div className="flex-1 min-h-[300px]">
                      <Editor
                        height="100%"
                        language={currentQuestion?.language || 'javascript'}
                        theme="vs-dark"
                        value={answers[currentQuestion?.id]?.code || ''}
                        onChange={(val) => {
                          setAnswers(prev => ({
                            ...prev,
                            [currentQuestion?.id]: {
                              code: val || '',
                              language: currentQuestion?.language || 'javascript'
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

                    {/* Interactive Execution Console panel */}
                    <div className="h-64 border-t border-[#1a2440] flex flex-col bg-[#070b18]">
                      {/* Terminal Header */}
                      <div className="bg-[#070b18] border-b border-[#1a2440] px-4 py-2 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Output & Test Runner Console
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setTerminalRunning(prev => !prev);
                              setTerminalRunId(Date.now());
                            }}
                            className={`px-4 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                              terminalRunning 
                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            {terminalRunning ? 'Stop Code' : 'Run Code'}
                          </button>
                          <span className="text-xs text-[#7b8aaa] font-mono self-center">
                            {submissionStatuses[currentQuestion?.id] === 'SAVING' ? 'Saving...' : 'Auto-saved'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Console Body */}
                      <div className="flex-1 min-h-0 relative bg-[#060814]">
                        {terminalRunId > 0 ? (
                          <RunTerminal
                            code={answers[currentQuestion?.id]?.code || ''}
                            language={currentQuestion?.language || 'javascript'}
                            runId={terminalRunId}
                            timeLimitSec={300}
                            isRunning={terminalRunning}
                            onExit={() => setTerminalRunning(false)}
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
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-sm p-8 text-center bg-[#070b18]">
                    <div>
                      <div className="text-4xl mb-2 flex justify-center">
                        <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c102b] border border-[#1e295d] rounded-2xl max-w-md w-full p-6 shadow-2xl text-center text-white">
            <div className="w-12 h-12 bg-amber-950 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/35">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">Finalize & Submit Exam</h3>
            <p className="text-sm text-slate-300 mt-2">
              Are you sure you want to submit your examination paper? You will not be able to modify your answers after this.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-2 bg-[#1b2554] border border-[#2b3a7a] text-slate-300 text-xs font-semibold rounded-xl hover:bg-[#2c3d82] transition-all"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  submitFinalExam();
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md"
              >
                Submit Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exam Stopped Modal */}
      {showExamStoppedModal && (
        <div className="fixed inset-0 z-[100] bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c102b] border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center text-white">
            <div className="w-12 h-12 bg-red-950 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/35">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">Exam Stopped by Invigilator</h3>
            <p className="text-sm text-slate-300 mt-2">
              This exam session has been terminated by the lecturer. Your current answers have been successfully captured and submitted.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  setShowExamStoppedModal(false);
                  setStep('completed');
                }}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Settings Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#bf4507]/15 flex items-center justify-center text-[#bf4507]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Appearance &amp; Tint</h3>
                  <p className="text-xs text-[#7b8aaa]">Choose workspace mode and tint color</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Workspace Theme</label>
                <div className="p-4 rounded-xl border border-[#bf4507]/40 bg-[#bf4507]/10 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#bf4507] animate-pulse" />
                    <span className="text-xs font-bold">Dark Mode (Enforced)</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono font-bold bg-[#bf4507]/20 text-[#bf4507] px-2 py-0.5 rounded">Active</span>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => setShowThemeModal(false)}
                className="w-full py-2.5 bg-[#bf4507] hover:bg-[#c24709] text-white text-sm font-semibold rounded-xl transition-all shadow-md"
              >
                Apply &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}