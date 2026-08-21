'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiUrl } from '@/config/api';
import { CustomDatePicker, CustomTimePicker } from '@/components/CustomPickers';
import AiQuestionModal, { GeneratedQuestionItem } from '@/components/AiQuestionModal';
import QuestionSlip, { SelectedQuestionItem } from '@/components/QuestionSlip';

interface TestCase {
  id?: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  weight?: number;
  description?: string;
}

interface Question {
  id?: string;
  type: 'PROGRAMMING' | 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'FILL_IN_THE_BLANK' | 'TRUE_FALSE';
  title: string;
  problemStatement: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  sampleInput: string;
  sampleOutput: string;
  marks: number;
  order: number;
  referenceSolution: string;
  options: string[];
  correctOption: string;
  language: string;
  testCases: TestCase[];
}

interface QuestionBankItem {
  id: string;
  type: string;
  title: string;
  problemStatement: string;
  referenceSolution?: string;
  options?: string;
  correctOption?: string;
  language?: string;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  sampleInput?: string;
  sampleOutput?: string;
  marks: number;
  tags?: string;
  createdAt: string;
  testCases?: TestCase[];
}

interface Exam {
  id: string;
  title: string;
  courseCode: string;
  description: string;
  duration: number;
  startDateTime: string;
  endDateTime: string;
  studentPassword?: string;
  invigilatorPassword?: string;
  enableMonitoring: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  lockAfterSubmit: boolean;
  showResults: boolean;
  questions: Question[];
}

function CreateExamInner() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [showInvigilatorPassword, setShowInvigilatorPassword] = useState(false);
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>([]);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankTypeFilter, setBankTypeFilter] = useState<string>('ALL');
  const [bankLoading, setBankLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [slipItems, setSlipItems] = useState<SelectedQuestionItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fetchingExam, setFetchingExam] = useState(false);
  const [generatingTC, setGeneratingTC] = useState<Record<number, boolean>>({});
  // Test-case generator state: per-question
  type GenResult = { input: string; expectedOutput: string; success: boolean; error?: string; confirmed: boolean };
  const [tcGenerator, setTcGenerator] = useState<Record<number, { rawInputs: string; results: GenResult[]; phase: 'idle' | 'running' | 'preview' }>>({});


  // Initialize with current date and default times
  const today = new Date().toISOString().slice(0, 10);
  const defaultStartTime = '09:00';
  const defaultEndTime = '11:00';

  const [examData, setExamData] = useState<{
    title: string;
    courseCode: string;
    description: string;
    examDate: string;
    startTime: string;
    endTime: string;
    duration: number;
    studentPassword?: string;
    invigilatorPassword?: string;
    enableMonitoring: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    lockAfterSubmit: boolean;
    questions: Question[];
  }>({
    title: '',
    courseCode: '',
    description: '',
    examDate: today,
    startTime: defaultStartTime,
    endTime: defaultEndTime,
    duration: 120,
    studentPassword: '',
    invigilatorPassword: '',
    enableMonitoring: true,
    shuffleQuestions: false,
    shuffleOptions: false,
    lockAfterSubmit: true,
    questions: [],
  });

  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchExam = async (id: string, token: string) => {
    setFetchingExam(true);
    try {
      const res = await fetch(`${getApiUrl()}/exams/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const exam: Exam = await res.json();
        const startDate = exam.startDateTime ? new Date(exam.startDateTime) : new Date();
        const endDate = exam.endDateTime ? new Date(exam.endDateTime) : new Date();
        const isValidStart = !isNaN(startDate.getTime());
        const isValidEnd = !isNaN(endDate.getTime());
        
        setExamData({
          title: exam.title || '',
          courseCode: exam.courseCode || '',
          description: exam.description || '',
          examDate: isValidStart ? startDate.toISOString().slice(0, 10) : today,
          startTime: isValidStart ? startDate.toTimeString().slice(0, 5) : defaultStartTime,
          endTime: isValidEnd ? endDate.toTimeString().slice(0, 5) : defaultEndTime,
          duration: exam.duration || 120,
          studentPassword: exam.studentPassword || '',
          invigilatorPassword: exam.invigilatorPassword || '',
          enableMonitoring: exam.enableMonitoring ?? true,
          shuffleQuestions: exam.shuffleQuestions ?? false,
          shuffleOptions: exam.shuffleOptions ?? false,
          lockAfterSubmit: exam.lockAfterSubmit ?? true,
          questions: (exam.questions || []).map((q: any) => ({
            ...q,
            title: q.title || '',
            problemStatement: q.problemStatement || '',
            marks: q.marks || 10,
            options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
          })),
        });
        setEditingId(id);
      }
    } catch (err) {
      console.error('Failed to fetch exam', err);
    } finally {
      setFetchingExam(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('codexa_token');
    if (!token) {
      router.replace('/');
      return;
    }
    fetchQuestionBank(token);
    const editId = searchParams ? searchParams.get('edit') : null;
    if (editId) {
      fetchExam(editId, token);
    }
  }, []);

  const fetchQuestionBank = async (token: string) => {
    setBankLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/question-bank`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQuestionBank(data);
      }
    } catch (err) {
      console.error('Failed to fetch question bank', err);
    } finally {
      setBankLoading(false);
    }
  };



  const addQuestionFromBank = (item: QuestionBankItem) => {
    const newQuestion: Question = {
      type: item.type as any,
      title: item.title,
      problemStatement: item.problemStatement,
      constraints: item.constraints || '',
      inputFormat: item.inputFormat || '',
      outputFormat: item.outputFormat || '',
      sampleInput: item.sampleInput || '',
      sampleOutput: item.sampleOutput || '',
      marks: item.marks,
      order: examData.questions.length + 1,
      referenceSolution: item.referenceSolution || '',
      options: item.options ? JSON.parse(item.options) : [],
      correctOption: item.correctOption || '',
      language: item.language || 'javascript',
      testCases: item.testCases
        ? item.testCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden || false,
          }))
        : [],
    };
    setExamData({ ...examData, questions: [...examData.questions, newQuestion] });
    setShowQuestionBank(false);
  };

  const handleToggleSlipItem = (bankItem: QuestionBankItem) => {
    setSlipItems(prev => {
      const exists = prev.some(item => item.id === bankItem.id);
      if (exists) {
        return prev.filter(item => item.id !== bankItem.id);
      } else {
        const newItem: SelectedQuestionItem = {
          id: bankItem.id,
          title: bankItem.title,
          type: bankItem.type,
          marks: bankItem.marks,
          problemStatement: bankItem.problemStatement,
          language: bankItem.language,
          constraints: bankItem.constraints,
          inputFormat: bankItem.inputFormat,
          outputFormat: bankItem.outputFormat,
          sampleInput: bankItem.sampleInput,
          sampleOutput: bankItem.sampleOutput,
          referenceSolution: bankItem.referenceSolution,
          options: bankItem.options,
          correctOption: bankItem.correctOption,
          testCases: bankItem.testCases,
        };
        return [...prev, newItem];
      }
    });
  };

  const handleRemoveSlipItem = (id: string) => {
    setSlipItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearSlip = () => {
    setSlipItems([]);
  };

  const handleConfirmAddSlipToExam = (items: SelectedQuestionItem[]) => {
    const newQuestions: Question[] = items.map((item, idx) => ({
      type: item.type as any,
      title: item.title,
      problemStatement: item.problemStatement,
      constraints: item.constraints || '',
      inputFormat: item.inputFormat || '',
      outputFormat: item.outputFormat || '',
      sampleInput: item.sampleInput || '',
      sampleOutput: item.sampleOutput || '',
      marks: item.marks,
      order: examData.questions.length + idx + 1,
      referenceSolution: item.referenceSolution || '',
      options: item.options ? (typeof item.options === 'string' ? JSON.parse(item.options) : item.options) : [],
      correctOption: item.correctOption || '',
      language: item.language || 'javascript',
      testCases: item.testCases
        ? item.testCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden || false,
          }))
        : [],
    }));

    setExamData(prev => ({
      ...prev,
      questions: [...prev.questions, ...newQuestions],
    }));

    setSlipItems([]);
    setShowQuestionBank(false);
  };

  const handleApplyAiQuestions = (aiQuestions: GeneratedQuestionItem[]) => {
    const newQuestions: Question[] = aiQuestions.map((q, idx) => ({
      type: q.type as any,
      title: q.title,
      problemStatement: q.problemStatement,
      constraints: q.constraints || '',
      inputFormat: q.inputFormat || '',
      outputFormat: q.outputFormat || '',
      sampleInput: q.sampleInput || '',
      sampleOutput: q.sampleOutput || '',
      marks: q.marks || 10,
      order: examData.questions.length + idx + 1,
      referenceSolution: q.referenceSolution || '',
      options: q.options || [],
      correctOption: q.correctOption || '',
      language: q.language || 'python',
      testCases: q.testCases
        ? q.testCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden || false,
          }))
        : [],
    }));

    setExamData(prev => ({ ...prev, questions: [...prev.questions, ...newQuestions] }));
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      type: 'PROGRAMMING',
      title: '',
      problemStatement: '',
      constraints: '',
      inputFormat: '',
      outputFormat: '',
      sampleInput: '',
      sampleOutput: '',
      marks: 10,
      order: examData.questions.length + 1,
      referenceSolution: '',
      options: [],
      correctOption: '',
      language: 'javascript',
      testCases: [{ input: '', expectedOutput: '', isHidden: false }],
    };
    setExamData({ ...examData, questions: [...examData.questions, newQuestion] });
  };

  const removeQuestion = (index: number) => {
    const newQuestions = [...examData.questions];
    newQuestions.splice(index, 1);
    setExamData({ ...examData, questions: newQuestions });
  };

  const addToQuestionBank = async (question: Question) => {
    const token = localStorage.getItem('codexa_token');
    if (!token) {
      router.replace('/');
      return;
    }

    try {
      const payload = {
        type: question.type,
        title: question.title,
        problemStatement: question.problemStatement,
        constraints: question.constraints,
        inputFormat: question.inputFormat,
        outputFormat: question.outputFormat,
        sampleInput: question.sampleInput,
        sampleOutput: question.sampleOutput,
        referenceSolution: question.referenceSolution,
        options: question.options.length > 0 ? JSON.stringify(question.options) : undefined,
        correctOption: question.correctOption,
        language: question.language,
        marks: question.marks,
        testCases: question.testCases.map((tc, idx) => ({ ...tc, order: idx })),
      };

      const res = await fetch(`${getApiUrl()}/question-bank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert('Question added to question bank successfully!');
      } else {
        const errorText = await res.text();
        alert(`Failed to add question: ${errorText}`);
      }
    } catch (err) {
      console.error('Error adding to question bank:', err);
      alert(`Error: ${err}`);
    }
  };

  const addTestCase = (questionIndex: number) => {
    const newQuestions = [...examData.questions];
    newQuestions[questionIndex].testCases.push({
      input: '',
      expectedOutput: '',
      isHidden: false,
    });
    setExamData({ ...examData, questions: newQuestions });
  };

  const removeTestCase = (questionIndex: number, testCaseIndex: number) => {
    const newQuestions = [...examData.questions];
    newQuestions[questionIndex].testCases.splice(testCaseIndex, 1);
    setExamData({ ...examData, questions: newQuestions });
  };

  // -----------------------------------------------------------------------
  // Test-case generator: run reference solution → preview → confirm
  // -----------------------------------------------------------------------
  const openGenerator = (qIndex: number) => {
    setTcGenerator(prev => ({
      ...prev,
      [qIndex]: prev[qIndex] ?? { rawInputs: '', results: [], phase: 'idle' },
    }));
  };

  const runGenerator = async (qIndex: number) => {
    const question = examData.questions[qIndex];
    if (!question.referenceSolution.trim()) {
      alert('Please provide a Reference Solution before generating test cases.');
      return;
    }
    const gen = tcGenerator[qIndex];
    if (!gen) return;

    // Parse inputs: split by blank line OR numbered lines (1. ...) OR just newlines
    const rawLines = gen.rawInputs
      .split(/\n{2,}|^\d+\.\s*/m)
      .map(s => s.trim())
      .filter(Boolean);

    if (rawLines.length === 0) {
      alert('Please enter at least one input.');
      return;
    }

    setTcGenerator(prev => ({ ...prev, [qIndex]: { ...gen, phase: 'running', results: [] } }));
    const token = localStorage.getItem('codexa_token');

    try {
      const res = await fetch(`${getApiUrl()}/exams/run-reference-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          language: question.language,
          referenceSolution: question.referenceSolution,
          inputs: rawLines,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const results: Array<{ input: string; expectedOutput: string; success: boolean; error?: string }> = await res.json();
      const genResults: GenResult[] = results.map(r => ({ ...r, confirmed: r.success }));
      setTcGenerator(prev => ({ ...prev, [qIndex]: { ...gen, phase: 'preview', results: genResults } }));
    } catch (err: any) {
      alert(`Generation failed: ${err.message}`);
      setTcGenerator(prev => ({ ...prev, [qIndex]: { ...gen, phase: 'idle' } }));
    }
  };

  const updateGenResult = (qIndex: number, rIndex: number, field: 'expectedOutput' | 'confirmed', value: any) => {
    setTcGenerator(prev => {
      const gen = prev[qIndex];
      if (!gen) return prev;
      const results = [...gen.results];
      results[rIndex] = { ...results[rIndex], [field]: value };
      return { ...prev, [qIndex]: { ...gen, results } };
    });
  };

  const confirmGeneratedCases = (qIndex: number) => {
    const gen = tcGenerator[qIndex];
    if (!gen) return;
    const toAdd: TestCase[] = gen.results
      .filter(r => r.confirmed)
      .map(r => ({ input: r.input, expectedOutput: r.expectedOutput, isHidden: false }));
    if (toAdd.length === 0) { alert('No test cases selected. Tick the cases you want to add.'); return; }
    const newQuestions = [...examData.questions];
    // Replace all existing test cases (or append — user's choice). Here we REPLACE.
    newQuestions[qIndex].testCases = toAdd;
    setExamData({ ...examData, questions: newQuestions });
    setTcGenerator(prev => ({ ...prev, [qIndex]: { rawInputs: gen.rawInputs, results: [], phase: 'idle' } }));
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...examData.questions];
    newQuestions[questionIndex].options.push('');
    setExamData({ ...examData, questions: newQuestions });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...examData.questions];
    newQuestions[questionIndex].options.splice(optionIndex, 1);
    setExamData({ ...examData, questions: newQuestions });
  };

  const handleQuestionChange = (
    questionIndex: number,
    field: keyof Question,
    value: any
  ) => {
    const newQuestions = [...examData.questions];
    (newQuestions[questionIndex] as any)[field] = value;
    setExamData({ ...examData, questions: newQuestions });
  };

  const handleTestCaseChange = (
    questionIndex: number,
    testCaseIndex: number,
    field: keyof TestCase,
    value: any
  ) => {
    const newQuestions = [...examData.questions];
    (newQuestions[questionIndex].testCases[testCaseIndex] as any)[field] = value;
    setExamData({ ...examData, questions: newQuestions });
  };

  const handleOptionChange = (
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    const newQuestions = [...examData.questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setExamData({ ...examData, questions: newQuestions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(3)) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('codexa_token');
      
      // Combine date and time into valid ISO strings
      const startDateTime = new Date(`${examData.examDate}T${examData.startTime}`).toISOString();
      const endDateTime = new Date(`${examData.examDate}T${examData.endTime}`).toISOString();
      
      const payload = {
        title: examData.title,
        courseCode: examData.courseCode,
        description: examData.description,
        duration: examData.duration,
        startDateTime,
        endDateTime,
        studentPassword: examData.studentPassword,
        invigilatorPassword: examData.invigilatorPassword,
        enableMonitoring: examData.enableMonitoring,
        shuffleQuestions: examData.shuffleQuestions,
        shuffleOptions: examData.shuffleOptions,
        lockAfterSubmit: examData.lockAfterSubmit,
        questions: examData.questions.map(q => ({
          ...q,
          options: q.options.length > 0 ? JSON.stringify(q.options) : undefined,
        })),
      };

      console.log('Sending payload:', payload);

      const url = editingId 
        ? `${getApiUrl()}/exams/${editingId}` 
        : `${getApiUrl()}/exams`;
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      console.log('Response status:', res.status);
      const responseData = await res.text();
      console.log('Response data:', responseData);
      
      if (res.ok) {
        router.push('/dashboard/exams');
      } else {
        alert(`Error: ${res.status} - ${responseData}`);
      }
    } catch (err) {
      console.error('Error creating exam:', err);
      alert(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: 'Basic Info', desc: 'Title, course code, duration' },
    { num: 2, title: 'Security & Access', desc: 'Lockdown, passwords, options' },
    { num: 3, title: 'Questions', desc: 'Problem statements, test cases' },
    { num: 4, title: 'Review & Publish', desc: 'Final check and publication' },
  ];

  const [validationError, setValidationError] = useState<string | null>(null);

  const isStep1Complete = !!(examData.title || '').trim() && !!(examData.courseCode || '').trim() && !!examData.examDate && !!examData.startTime && !!examData.endTime && Number(examData.duration) > 0;
  const isStep2Complete = isStep1Complete;
  const isStep3Complete = isStep1Complete && (examData.questions || []).length > 0;

  const isStepComplete = (stepNum: number) => {
    if (stepNum === 1) return isStep1Complete && step > 1;
    if (stepNum === 2) return isStep2Complete && step > 2;
    if (stepNum === 3) return isStep3Complete;
    if (stepNum === 4) return isStep3Complete;
    return false;
  };

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      const missing: string[] = [];
      if (!(examData.title || '').trim()) missing.push('Exam Title');
      if (!(examData.courseCode || '').trim()) missing.push('Course Code');
      if (!examData.examDate) missing.push('Exam Date');
      if (!examData.startTime) missing.push('Start Time');
      if (!examData.endTime) missing.push('End Time');
      if (!examData.duration || Number(examData.duration) <= 0) missing.push('Duration');

      if (missing.length > 0) {
        setValidationError(`Please fill out all required fields before proceeding: ${missing.join(', ')}.`);
        return false;
      }
    }

    if (currentStep === 3) {
      if (examData.questions.length === 0) {
        setValidationError('Please add at least one question to the exam before proceeding to Review & Publish.');
        return false;
      }
    }

    setValidationError(null);
    return true;
  };

  const handleSetStep = (targetStep: number) => {
    if (targetStep > step) {
      for (let s = step; s < targetStep; s++) {
        if (!validateStep(s)) return;
      }
    }
    setValidationError(null);
    setStep(targetStep);
  };

  if (!mounted) {
    return (
      <div className="p-12 text-center text-[#7b8aaa] text-sm">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#bf4507] border-t-transparent mb-3" />
        <p>Loading Authoring Studio...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Single Unified Authoring Studio Card ── */}
      <div className="bg-[#0c1222] border border-[#1a2440] rounded-3xl shadow-2xl overflow-hidden">

        {/* ── Top Bar ── */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-[#1a2440] bg-[#070b18]">
          {/* Accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#bf4507]/70 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#bf4507]/20 border border-[#bf4507]/40 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#bf4507]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-base font-black text-white">
              {editingId ? 'Edit Examination' : 'Create Examination'}
            </h1>
          </div>
          <button
            onClick={() => router.push('/dashboard/exams')}
            className="px-3.5 py-2 bg-[#0c1222] border border-[#1a2440] text-slate-400 hover:text-white hover:border-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel & Exit
          </button>
        </div>

        {/* ── Body: Sidebar Rail + Content Panel (side by side inside same card) ── */}
        <div className="flex min-h-[600px]">

          {/* Left Rail: Steps */}
          <div className="w-56 flex-shrink-0 border-r border-[#1a2440] bg-[#070b18]/60 p-4 flex flex-col gap-1">
            <p className="text-[9px] font-extrabold text-[#3a4460] uppercase tracking-widest px-2 mb-2">Steps</p>
            {steps.map((s) => {
              const isActive = s.num === step;
              const isCompleted = isStepComplete(s.num);
              return (
                <button
                  key={s.num}
                  onClick={() => handleSetStep(s.num)}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3 ${
                    isActive
                      ? 'bg-[#bf4507]/15 text-white'
                      : isCompleted
                      ? 'text-slate-300 hover:bg-[#0c1222]/80'
                      : 'text-[#3a4460] hover:text-slate-400'
                  }`}
                >
                  {/* Step number / check indicator */}
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 transition-all ${
                      isActive
                        ? 'bg-[#bf4507] text-white shadow-[0_0_10px_rgba(191,69,7,0.5)]'
                        : isCompleted
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                        : 'bg-[#0c1222] border border-[#1a2440] text-[#3a4460]'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : s.num}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-[11px] font-bold leading-none ${
                      isActive ? 'text-white' : isCompleted ? 'text-slate-300' : 'text-[#3a4460]'
                    }`}>
                      {s.title}
                    </div>
                    <div className="text-[9px] text-[#3a4460] mt-0.5 truncate">{s.desc}</div>
                  </div>
                  {/* Active indicator bar on right */}
                  {isActive && (
                    <div className="ml-auto w-0.5 h-5 bg-[#bf4507] rounded-full flex-shrink-0" />
                  )}
                </button>
              );
            })}

            {/* Spacer + exam quick-stats at bottom of sidebar */}
            <div className="mt-auto pt-4 border-t border-[#1a2440] space-y-2">
              <div className="px-2">
                <p className="text-[9px] font-bold text-[#3a4460] uppercase tracking-widest mb-2">Exam Stats</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#7b8aaa]">Questions</span>
                    <span className="text-[10px] font-bold text-white">{examData.questions.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#7b8aaa]">Total Marks</span>
                    <span className="text-[10px] font-bold text-white">{examData.questions.reduce((s, q) => s + q.marks, 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#7b8aaa]">Duration</span>
                    <span className="text-[10px] font-bold text-white">{Math.floor(examData.duration / 60)}h {examData.duration % 60}m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content Panel */}
          <div className="flex-1 min-w-0 p-7 overflow-y-auto">
            {validationError && (
              <div className="mb-6 p-4 bg-amber-950/70 border border-amber-500/50 rounded-2xl text-amber-200 text-xs font-semibold flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <span>{validationError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setValidationError(null)}
                  className="text-amber-400 hover:text-white transition-colors text-xs font-bold px-2 py-1 rounded-lg hover:bg-amber-900/40 ml-4 flex-shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Exam Title *</label>
                <input
                  type="text"
                  value={examData.title}
                  onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Course Code *</label>
                <input
                  type="text"
                  value={examData.courseCode}
                  onChange={(e) => setExamData({ ...examData, courseCode: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Description</label>
              <textarea
                value={examData.description}
                onChange={(e) => setExamData({ ...examData, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                rows={4}
              />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Exam Date *</label>
                <CustomDatePicker
                  value={examData.examDate}
                  onChange={(val) => setExamData({ ...examData, examDate: val })}
                  className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Start Time *</label>
                <CustomTimePicker
                  value={examData.startTime}
                  onChange={(val) => setExamData({ ...examData, startTime: val })}
                  className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">End Time *</label>
                <CustomTimePicker
                  value={examData.endTime}
                  onChange={(val) => setExamData({ ...examData, endTime: val })}
                  className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                  required
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2 text-slate-300">Duration (minutes) *</label>
              <input
                type="number"
                value={examData.duration || ''}
                onChange={(e) => setExamData({ ...examData, duration: e.target.value === '' ? ('' as any) : parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                min={1}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Current duration: {Math.floor(examData.duration / 60)}h {examData.duration % 60}m
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Security &amp; Access</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Student Password (leave blank to auto-generate)
                </label>
                <div className="relative">
                  <input
                    type={showStudentPassword ? 'text' : 'password'}
                    value={examData.studentPassword}
                    onChange={(e) => setExamData({ ...examData, studentPassword: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] placeholder-slate-500 focus:outline-none focus:border-[#bf4507] transition-all text-sm font-medium"
                    placeholder="Auto-generated if left blank"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStudentPassword(!showStudentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showStudentPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Invigilator Password (leave blank to auto-generate)
                </label>
                <div className="relative">
                  <input
                    type={showInvigilatorPassword ? 'text' : 'password'}
                    value={examData.invigilatorPassword}
                    onChange={(e) => setExamData({ ...examData, invigilatorPassword: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] placeholder-slate-500 focus:outline-none focus:border-[#bf4507] transition-all text-sm font-medium"
                    placeholder="Auto-generated if left blank"
                  />
                  <button
                    type="button"
                    onClick={() => setShowInvigilatorPassword(!showInvigilatorPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showInvigilatorPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl border border-[#1a2440] bg-[#070b18] hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={examData.enableMonitoring}
                  onChange={(e) => setExamData({ ...examData, enableMonitoring: e.target.checked })}
                  className="w-4 h-4 accent-[#bf4507] cursor-pointer flex-shrink-0"
                />
                <span className="text-sm font-medium text-slate-200">Enable Monitoring</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl border border-[#1a2440] bg-[#070b18] hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={examData.shuffleQuestions}
                  onChange={(e) => setExamData({ ...examData, shuffleQuestions: e.target.checked })}
                  className="w-4 h-4 accent-[#bf4507] cursor-pointer flex-shrink-0"
                />
                <span className="text-sm font-medium text-slate-200">Shuffle Questions</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl border border-[#1a2440] bg-[#070b18] hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={examData.shuffleOptions}
                  onChange={(e) => setExamData({ ...examData, shuffleOptions: e.target.checked })}
                  className="w-4 h-4 accent-[#bf4507] cursor-pointer flex-shrink-0"
                />
                <span className="text-sm font-medium text-slate-200">Shuffle Multiple Choice Options</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl border border-[#1a2440] bg-[#070b18] hover:border-slate-700 transition-all">
                <input
                  type="checkbox"
                  checked={examData.lockAfterSubmit}
                  onChange={(e) => setExamData({ ...examData, lockAfterSubmit: e.target.checked })}
                  className="w-4 h-4 accent-[#bf4507] cursor-pointer flex-shrink-0"
                />
                <span className="text-sm font-medium text-slate-200">Lock Exam After Submission</span>
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            {/* Step 3 Header — unified action toolbar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Questions</h2>
                  <p className="text-[11px] text-[#7b8aaa] mt-0.5">
                    {examData.questions.length === 0 ? 'No questions added yet' : `${examData.questions.length} question${examData.questions.length !== 1 ? 's' : ''} · ${examData.questions.reduce((s, q) => s + q.marks, 0)} total marks`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Question Bank */}
                  <button
                    type="button"
                    onClick={() => {
                      const token = localStorage.getItem('token') || '';
                      fetchQuestionBank(token);
                      setBankSearch('');
                      setBankTypeFilter('ALL');
                      setShowQuestionBank(true);
                    }}
                    className="px-3.5 py-2 bg-[#161e36] border border-[#1a2440] text-slate-300 hover:text-white hover:bg-[#1f2b4d] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    From Bank
                  </button>
                  {/* Custom question */}
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="px-3.5 py-2 bg-[#bf4507] hover:bg-[#c24709] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Custom
                  </button>
                </div>
              </div>
            </div>

            {/* Full-Screen Question Bank Overlay Modal */}
            {showQuestionBank && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
                <div className="bg-[#070b18] border border-[#1a2440] rounded-2xl p-6 shadow-2xl max-w-5xl w-full h-[88vh] flex flex-col">
                  {/* Modal Header */}
                  <div className="flex justify-between items-center pb-4 border-b border-[#1a2440] flex-shrink-0">
                    <div>
                      <h3 className="font-extrabold text-white text-lg">Question Bank Repository</h3>
                      <p className="text-xs text-[#7b8aaa]">Browse complete questions and select items for your Question Slip.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowQuestionBank(false)}
                        className="px-3 py-1.5 text-xs border border-[#1a2440] bg-[#0c1222] text-slate-300 rounded-xl hover:bg-[#161e36] font-bold"
                      >
                        Close Repository
                      </button>
                    </div>
                  </div>

                  {/* Search + Filter Row */}
                  <div className="flex items-center gap-3 mt-4 flex-shrink-0">
                    <div className="relative flex-1">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7b8aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search by title or topic..."
                        value={bankSearch}
                        onChange={e => setBankSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#0c1222] border border-[#1a2440] rounded-xl text-xs text-[#f0f2f8] placeholder-[#3a4460] focus:outline-none focus:border-[#bf4507]/60 transition-colors"
                      />
                    </div>
                    <select
                      value={bankTypeFilter}
                      onChange={e => setBankTypeFilter(e.target.value)}
                      className="px-3 py-2 bg-[#0c1222] border border-[#1a2440] rounded-xl text-xs text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]/60 transition-colors"
                    >
                      <option value="ALL">All Types</option>
                      <option value="PROGRAMMING">Programming</option>
                      <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                      <option value="SHORT_ANSWER">Short Answer</option>
                      <option value="LONG_ANSWER">Long Answer</option>
                      <option value="FILL_IN_THE_BLANK">Fill in Blank</option>
                    </select>
                    <span className="text-[10px] text-[#7b8aaa] whitespace-nowrap flex-shrink-0">
                      {questionBank.filter(item =>
                        (bankTypeFilter === 'ALL' || item.type === bankTypeFilter) &&
                        (bankSearch === '' || item.title.toLowerCase().includes(bankSearch.toLowerCase()) || (item.tags || '').toLowerCase().includes(bankSearch.toLowerCase()))
                      ).length} / {questionBank.length} shown
                    </span>
                  </div>

                  {/* Question Cards Grid — flex-1 + overflow-y-auto = scrollable */}
                  <div className="flex-1 overflow-y-auto py-4 grid grid-cols-1 md:grid-cols-2 gap-4 pr-1 content-start">
                    {bankLoading ? (
                      <div className="col-span-2 flex items-center justify-center py-16 text-[#7b8aaa] text-sm gap-3">
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading questions...
                      </div>
                    ) : questionBank.filter(item =>
                        (bankTypeFilter === 'ALL' || item.type === bankTypeFilter) &&
                        (bankSearch === '' || item.title.toLowerCase().includes(bankSearch.toLowerCase()) || (item.tags || '').toLowerCase().includes(bankSearch.toLowerCase()))
                      ).length === 0 ? (
                      <div className="col-span-2 flex flex-col items-center justify-center py-16 text-[#7b8aaa]">
                        <svg className="w-10 h-10 mb-3 text-[#3a4460]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm font-semibold">No questions match your filters</p>
                        <p className="text-xs mt-1">Try a different search or type filter</p>
                      </div>
                    ) : questionBank.filter(item =>
                        (bankTypeFilter === 'ALL' || item.type === bankTypeFilter) &&
                        (bankSearch === '' || item.title.toLowerCase().includes(bankSearch.toLowerCase()) || (item.tags || '').toLowerCase().includes(bankSearch.toLowerCase()))
                      ).map((item) => {
                      const isSelectedInSlip = slipItems.some((s) => s.id === item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleSlipItem(item)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                            isSelectedInSlip
                              ? 'bg-[#bf4507]/15 border-[#bf4507] text-white shadow-lg'
                              : 'bg-[#0c1222] border-[#1a2440] text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#161e36] text-[#bf4507] border border-[#1a2440]">
                                {item.type.replace('_', ' ')}
                              </span>
                              <span className="text-xs font-extrabold text-white bg-[#070b18] px-2 py-0.5 rounded border border-[#1a2440]">
                                {item.marks} Marks
                              </span>
                            </div>

                            <h4 className="font-bold text-base text-white">{item.title}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{item.problemStatement}</p>
                          </div>

                          <div className="pt-2 border-t border-[#1a2440]/60 flex items-center justify-between">
                            <span className="text-[11px] font-mono text-[#7b8aaa]">
                              {item.language ? `Lang: ${item.language}` : 'General Theory'}
                            </span>

                            <button
                              type="button"
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                                isSelectedInSlip
                                  ? 'bg-[#bf4507] text-white'
                                  : 'bg-[#161e36] text-slate-300 hover:bg-[#bf4507] hover:text-white'
                              }`}
                            >
                              {isSelectedInSlip ? (
                                <>
                                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Selected</span>
                                </>
                              ) : (
                                <span>Select (+)</span>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {examData.questions.length === 0 ? (
              <div className="p-12 text-center bg-[#070b18] border border-[#1a2440] rounded-2xl shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-[#bf4507]/15 border border-[#bf4507]/30 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#bf4507]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white mb-1">No Questions Added Yet</h3>
                <p className="text-xs text-[#7b8aaa] max-w-md mx-auto">
                  Click <strong className="text-white font-semibold">"Add From Question Bank"</strong> to choose existing questions or <strong className="text-white font-semibold">"Add Custom Question"</strong> above to compose a new question from scratch.
                </p>
              </div>
            ) : (
              examData.questions.map((question, qIndex) => (
                <div key={qIndex} className="border border-[#1a2440] bg-[#0c1222] rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-white">Question {qIndex + 1}</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => addToQuestionBank(question)}
                        className="px-3 py-1.5 text-xs bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 rounded-xl hover:bg-emerald-900/60 font-bold transition-all"
                      >
                        Save to Question Bank
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="px-3 py-1.5 text-xs bg-rose-950/50 text-rose-300 border border-rose-800/40 rounded-xl hover:bg-rose-900/60 font-bold transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">Type *</label>
                      <select
                        value={question.type}
                        onChange={(e) =>
                          handleQuestionChange(qIndex, 'type', e.target.value as any)
                        }
                        className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                      >
                        <option value="PROGRAMMING">Programming</option>
                        <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                        <option value="SHORT_ANSWER">Short Answer</option>
                        <option value="LONG_ANSWER">Long Answer (Theory/Essay)</option>
                        <option value="FILL_IN_THE_BLANK">Fill in the Blank</option>
                        <option value="TRUE_FALSE">True / False</option>
                      </select>
                    </div>
                    {question.type === 'PROGRAMMING' && (
                      <div>
                        <label className="block text-sm font-medium mb-2 text-slate-300">Language</label>
                        <select
                          value={question.language}
                          onChange={(e) =>
                            handleQuestionChange(qIndex, 'language', e.target.value)
                          }
                          className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                          <option value="c">C</option>
                          <option value="csharp">C#</option>
                          <option value="go">Go</option>
                        </select>
                      </div>
                    )}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium mb-2 text-slate-300">Marks *</label>
                      <input
                        type="number"
                        value={question.marks || ''}
                        onChange={(e) =>
                          handleQuestionChange(qIndex, 'marks', e.target.value === '' ? '' : parseInt(e.target.value))
                        }
                        className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                        min={1}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">Order</label>
                      <input
                        type="number"
                        value={question.order || ''}
                        onChange={(e) =>
                          handleQuestionChange(qIndex, 'order', e.target.value === '' ? '' : parseInt(e.target.value))
                        }
                        className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                        min={1}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-300">Title *</label>
                    <input
                      type="text"
                      value={question.title}
                      onChange={(e) => handleQuestionChange(qIndex, 'title', e.target.value)}
                      className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-slate-300">Problem Statement *</label>
                    <textarea
                      value={question.problemStatement}
                      onChange={(e) =>
                        handleQuestionChange(qIndex, 'problemStatement', e.target.value)
                      }
                      className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                      rows={4}
                      required
                    />
                  </div>
                  {question.type === 'TRUE_FALSE' && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">Correct Answer *</label>
                      <div className="flex gap-4">
                        {['True', 'False'].map((tfOption) => (
                          <label
                            key={tfOption}
                            className={`flex-1 p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                              question.correctOption === tfOption
                                ? 'bg-[#bf4507]/15 border-[#bf4507] text-white font-semibold'
                                : 'bg-[#0c1222] border-[#1a2440] text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <span className="text-sm font-bold">{tfOption}</span>
                            <input
                              type="radio"
                              name={`tf-correct-${qIndex}`}
                              checked={question.correctOption === tfOption}
                              onChange={() => handleQuestionChange(qIndex, 'correctOption', tfOption)}
                              className="accent-[#bf4507]"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {question.type === 'MULTIPLE_CHOICE' && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-medium">Options</label>
                        <button
                          type="button"
                          onClick={() => addOption(qIndex)}
                          className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:opacity-90"
                        >
                          Add Option
                        </button>
                      </div>
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex gap-2 items-center mb-2">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={question.correctOption === option}
                            onChange={(e) => handleQuestionChange(qIndex, 'correctOption', option)}
                            className="mt-1"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                            className="flex-1 px-3.5 py-2 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                          />
                          {question.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(qIndex, oIndex)}
                              className="text-sm text-destructive hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {question.type === 'SHORT_ANSWER' && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">Correct Answer (Exact Match)</label>
                      <input
                        type="text"
                        value={question.correctOption}
                        onChange={(e) => handleQuestionChange(qIndex, 'correctOption', e.target.value)}
                        placeholder="E.g., Capital City or numeric answer"
                        className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                        required
                      />
                      <p className="text-xs text-[#7b8aaa] mt-1">
                        System will automatically match this exact value case-insensitively.
                      </p>
                    </div>
                  )}

                  {question.type === 'FILL_IN_THE_BLANK' && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">Expected Words/Phrases (Comma separated for multiple blanks)</label>
                      <input
                        type="text"
                        value={question.correctOption}
                        onChange={(e) => handleQuestionChange(qIndex, 'correctOption', e.target.value)}
                        placeholder="E.g., database, server"
                        className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                        required
                      />
                      <p className="text-xs text-[#7b8aaa] mt-1">
                        Use [blank] inside your Problem Statement where students should input answers.
                      </p>
                    </div>
                  )}

                  {question.type === 'LONG_ANSWER' && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">Grading Reference solution / Guidelines (Optional)</label>
                      <textarea
                        value={question.referenceSolution}
                        onChange={(e) => handleQuestionChange(qIndex, 'referenceSolution', e.target.value)}
                        placeholder="Provide details on what a complete answer should include..."
                        className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                        rows={4}
                      />
                      <p className="text-xs text-[#7b8aaa] mt-1">
                        Lecturer will review and mark submissions manually.
                      </p>
                    </div>
                  )}
                  {question.type === 'PROGRAMMING' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-slate-300">Constraints</label>
                        <textarea
                          value={question.constraints}
                          onChange={(e) =>
                            handleQuestionChange(qIndex, 'constraints', e.target.value)
                          }
                          className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-slate-300">Input Format</label>
                        <textarea
                          value={question.inputFormat}
                          onChange={(e) =>
                            handleQuestionChange(qIndex, 'inputFormat', e.target.value)
                          }
                          className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-slate-300">Output Format</label>
                        <textarea
                          value={question.outputFormat}
                          onChange={(e) =>
                            handleQuestionChange(qIndex, 'outputFormat', e.target.value)
                          }
                          className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-300">Sample Input</label>
                          <textarea
                            value={question.sampleInput}
                            onChange={(e) =>
                              handleQuestionChange(qIndex, 'sampleInput', e.target.value)
                            }
                            className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-slate-300">Sample Output</label>
                          <textarea
                            value={question.sampleOutput}
                            onChange={(e) =>
                              handleQuestionChange(qIndex, 'sampleOutput', e.target.value)
                            }
                            className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] focus:outline-none focus:border-[#bf4507]"
                            rows={3}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-slate-300">Reference Solution</label>
                        <textarea
                          value={question.referenceSolution}
                          onChange={(e) =>
                            handleQuestionChange(qIndex, 'referenceSolution', e.target.value)
                          }
                          className="w-full px-4 py-2.5 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] font-mono focus:outline-none focus:border-[#bf4507]"
                          rows={8}
                        />
                      </div>
                      {/* ====================================================
                          TEST CASE GENERATOR
                      ==================================================== */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-semibold">Test Cases</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openGenerator(qIndex)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                              Generate Test Cases
                            </button>
                            <button
                              type="button"
                              onClick={() => addTestCase(qIndex)}
                              className="px-3 py-1.5 text-xs font-semibold bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all"
                            >
                              + Add Manually
                            </button>
                          </div>
                        </div>

                        {/* ---- Generator Panel ---- */}
                        {tcGenerator[qIndex] && (
                          <div className="mb-4 border border-indigo-200 rounded-xl overflow-hidden shadow-sm">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-200">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-sm font-semibold text-indigo-900">Test Case Generator</span>
                                {tcGenerator[qIndex].phase === 'preview' && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                    {tcGenerator[qIndex].results.filter(r => r.confirmed).length} / {tcGenerator[qIndex].results.length} selected
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setTcGenerator(prev => { const n = {...prev}; delete n[qIndex]; return n; })}
                                className="text-indigo-400 hover:text-indigo-700 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>

                            <div className="p-4 space-y-4">
                              {/* Input area */}
                              {tcGenerator[qIndex].phase !== 'preview' && (
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Enter inputs — one per line. Blank line separates multi-line inputs.
                                  </label>
                                  <textarea
                                    value={tcGenerator[qIndex].rawInputs}
                                    onChange={e => setTcGenerator(prev => ({ ...prev, [qIndex]: { ...prev[qIndex], rawInputs: e.target.value } }))}
                                    placeholder={`E.g.:\n5\n10\n0\n-1\n100`}
                                    className="w-full px-3 py-2.5 text-sm font-mono border border-[#1a2440] rounded-lg bg-[#070b18] text-[#f0f2f8] focus:outline-none focus:ring-2 focus:ring-accent resize-y"
                                    rows={6}
                                  />
                                  <p className="text-xs text-[#7b8aaa] mt-1">
                                    Each line = one test case input. Separate multi-line inputs with a blank line.
                                  </p>
                                </div>
                              )}

                              {/* Generate button */}
                              {tcGenerator[qIndex].phase !== 'preview' && (
                                <button
                                  type="button"
                                  onClick={() => runGenerator(qIndex)}
                                  disabled={tcGenerator[qIndex].phase === 'running' || !question.referenceSolution.trim()}
                                  className="w-full py-2.5 flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
                                >
                                  {tcGenerator[qIndex].phase === 'running' ? (
                                    <>
                                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                      </svg>
                                      Running reference solution...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                      Run & Generate Outputs
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Preview table */}
                              {tcGenerator[qIndex].phase === 'preview' && tcGenerator[qIndex].results.length > 0 && (
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-semibold text-slate-300">
                                      Review outputs. Untick any you want to exclude, or edit the Expected Output.
                                    </p>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setTcGenerator(prev => ({ ...prev, [qIndex]: { ...prev[qIndex], phase: 'idle' } }))}
                                        className="text-xs px-3 py-1.5 border border-[#1a2440] bg-[#070b18] rounded-lg hover:bg-[#161e36] text-slate-300"
                                      >
                                        ← Edit Inputs
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const allConfirmed = tcGenerator[qIndex].results.every(r => r.confirmed);
                                          setTcGenerator(prev => ({
                                            ...prev,
                                            [qIndex]: { ...prev[qIndex], results: prev[qIndex].results.map(r => ({ ...r, confirmed: !allConfirmed })) }
                                          }));
                                        }}
                                        className="text-xs px-3 py-1.5 border border-[#1a2440] bg-[#070b18] rounded-lg hover:bg-[#161e36] text-slate-300"
                                      >
                                        Toggle All
                                      </button>
                                    </div>
                                  </div>

                                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                    {tcGenerator[qIndex].results.map((result, rIdx) => (
                                      <div
                                        key={rIdx}
                                        className={`rounded-lg border transition-all ${
                                          result.confirmed
                                            ? result.success
                                              ? 'border-emerald-800/40 bg-emerald-950/40'
                                              : 'border-amber-800/40 bg-amber-950/40'
                                            : 'border-[#1a2440] bg-[#070b18] opacity-60'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3 px-3 py-2 border-b border-inherit">
                                          {/* Checkbox */}
                                          <input
                                            type="checkbox"
                                            id={`gen-${qIndex}-${rIdx}`}
                                            checked={result.confirmed}
                                            onChange={e => updateGenResult(qIndex, rIdx, 'confirmed', e.target.checked)}
                                            className="w-4 h-4 rounded accent-indigo-600"
                                          />
                                          <label htmlFor={`gen-${qIndex}-${rIdx}`} className="flex-1 flex items-center gap-2 cursor-pointer">
                                            <span className="text-xs font-semibold text-slate-400">Case {rIdx + 1}</span>
                                            {result.success ? (
                                              <span className="text-xs flex items-center gap-1 text-emerald-400 font-medium">
                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                Ran successfully
                                              </span>
                                            ) : (
                                              <span className="text-xs flex items-center gap-1 text-amber-400 font-medium">
                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                Execution error
                                              </span>
                                            )}
                                          </label>
                                          {/* Hidden toggle */}
                                          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={!!(examData.questions[qIndex].testCases.find((_, i) => false))}
                                              className="w-3.5 h-3.5 rounded accent-slate-500"
                                            />
                                            <span>Hidden</span>
                                          </label>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 p-3">
                                          <div>
                                            <p className="text-xs font-semibold text-slate-400 mb-1">Input</p>
                                            <pre className="text-xs font-mono bg-[#070b18] border border-[#1a2440] text-slate-200 rounded p-2 whitespace-pre-wrap break-all min-h-[2rem]">{result.input || <span className="text-slate-500 italic">empty</span>}</pre>
                                          </div>
                                          <div>
                                            <p className="text-xs font-semibold text-slate-400 mb-1">Expected Output <span className="font-normal text-slate-500">(editable)</span></p>
                                            {result.success ? (
                                              <textarea
                                                value={result.expectedOutput}
                                                onChange={e => updateGenResult(qIndex, rIdx, 'expectedOutput', e.target.value)}
                                                className="w-full text-xs font-mono bg-[#070b18] border border-[#1a2440] text-slate-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-accent resize-none min-h-[2rem]"
                                                rows={Math.max(1, result.expectedOutput.split('\n').length)}
                                              />
                                            ) : (
                                              <pre className="text-xs font-mono text-amber-300 bg-amber-950/40 border border-amber-800/40 rounded p-2 whitespace-pre-wrap break-all">{result.error || 'Execution failed'}</pre>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Confirm button */}
                                  <button
                                    type="button"
                                    onClick={() => confirmGeneratedCases(qIndex)}
                                    className="mt-3 w-full py-2.5 flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-all shadow-sm"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Confirm & Add {tcGenerator[qIndex].results.filter(r => r.confirmed).length} Test Case{tcGenerator[qIndex].results.filter(r => r.confirmed).length !== 1 ? 's' : ''}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ---- Existing manual test cases ---- */}
                        {question.testCases.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500 font-medium">
                              {question.testCases.length} test case{question.testCases.length !== 1 ? 's' : ''} configured
                            </p>
                            {question.testCases.map((testCase, tcIndex) => (
                              <div key={tcIndex} className="border border-border rounded-lg p-3">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-500">Test Case {tcIndex + 1}</span>
                                    {testCase.isHidden && (
                                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Hidden</span>
                                    )}
                                  </div>
                                  {question.testCases.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => removeTestCase(qIndex, tcIndex)}
                                      className="text-xs text-destructive hover:underline"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-400">Input</label>
                                    <textarea
                                      value={testCase.input}
                                      onChange={(e) => handleTestCaseChange(qIndex, tcIndex, 'input', e.target.value)}
                                      className="w-full px-3 py-2 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] text-sm font-mono focus:outline-none focus:border-[#bf4507]"
                                      rows={3}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-400">Expected Output</label>
                                    <textarea
                                      value={testCase.expectedOutput}
                                      onChange={(e) => handleTestCaseChange(qIndex, tcIndex, 'expectedOutput', e.target.value)}
                                      className="w-full px-3 py-2 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] text-sm font-mono focus:outline-none focus:border-[#bf4507]"
                                      rows={3}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                  <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-400">Weight (Score Multiplier)</label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0.1"
                                      value={testCase.weight ?? 1.0}
                                      onChange={(e) => handleTestCaseChange(qIndex, tcIndex, 'weight', parseFloat(e.target.value) || 1.0)}
                                      className="w-full px-3 py-2 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] text-xs focus:outline-none focus:border-[#bf4507]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-400">Description / Label (Optional)</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Edge Case, Stress Test"
                                      value={testCase.description ?? ''}
                                      onChange={(e) => handleTestCaseChange(qIndex, tcIndex, 'description', e.target.value)}
                                      className="w-full px-3 py-2 border border-[#1a2440] rounded-xl bg-[#0c1222] text-[#f0f2f8] text-xs focus:outline-none focus:border-[#bf4507]"
                                    />
                                  </div>
                                </div>
                                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={testCase.isHidden}
                                    onChange={(e) => handleTestCaseChange(qIndex, tcIndex, 'isHidden', e.target.checked)}
                                    className="w-3.5 h-3.5 rounded accent-[#bf4507]"
                                  />
                                  <span className="text-xs text-slate-500">Hidden (not shown to students)</span>
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-white">Review & Publish</h2>
              <p className="text-[11px] text-[#7b8aaa] mt-0.5">Verify all details before submitting the exam</p>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Questions', value: examData.questions.length, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                { label: 'Total Marks', value: examData.questions.reduce((s, q) => s + q.marks, 0), icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                { label: 'Duration', value: `${Math.floor(examData.duration / 60)}h ${examData.duration % 60}m`, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                { label: 'Course', value: examData.courseCode || '—', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="bg-[#070b18] border border-[#1a2440] rounded-2xl p-4">
                  <div className="w-7 h-7 rounded-lg bg-[#bf4507]/15 border border-[#bf4507]/30 flex items-center justify-center mb-2">
                    <svg className="w-3.5 h-3.5 text-[#bf4507]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                  </div>
                  <div className="text-lg font-black text-white">{value}</div>
                  <div className="text-[10px] text-[#7b8aaa] font-medium mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Exam Details Card */}
            <div className="bg-[#070b18] border border-[#1a2440] rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">{examData.title || <span className="text-[#7b8aaa] italic">Untitled Exam</span>}</h3>
                {examData.description && (
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">{examData.description}</p>
                )}
              </div>
              <div className="space-y-2 pt-3 border-t border-[#1a2440]">
                {/* Paired: Date + Duration */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center justify-between bg-[#0c1222] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-[#7b8aaa] font-medium">Date</span>
                    <span className="text-[11px] text-white font-semibold">{examData.examDate}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-between bg-[#0c1222] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-[#7b8aaa] font-medium">Duration</span>
                    <span className="text-[11px] text-white font-semibold">{Math.floor(examData.duration / 60)}h {examData.duration % 60}m</span>
                  </div>
                </div>
                {/* Paired: Start + End */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center justify-between bg-[#0c1222] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-[#7b8aaa] font-medium">Start Time</span>
                    <span className="text-[11px] text-white font-semibold">{examData.startTime}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-between bg-[#0c1222] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-[#7b8aaa] font-medium">End Time</span>
                    <span className="text-[11px] text-white font-semibold">{examData.endTime}</span>
                  </div>
                </div>
                {/* Paired: Monitoring + Lock */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center justify-between bg-[#0c1222] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-[#7b8aaa] font-medium">Monitoring</span>
                    <span className={`text-[11px] font-semibold ${examData.enableMonitoring ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {examData.enableMonitoring ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center justify-between bg-[#0c1222] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-[#7b8aaa] font-medium">Lock After Submit</span>
                    <span className={`text-[11px] font-semibold ${examData.lockAfterSubmit ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {examData.lockAfterSubmit ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                {/* Paired: Shuffle Q + Shuffle Options */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center justify-between bg-[#0c1222] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-[#7b8aaa] font-medium">Shuffle Questions</span>
                    <span className={`text-[11px] font-semibold ${examData.shuffleQuestions ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {examData.shuffleQuestions ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center justify-between bg-[#0c1222] rounded-lg px-3 py-2">
                    <span className="text-[10px] text-[#7b8aaa] font-medium">Shuffle Options</span>
                    <span className={`text-[11px] font-semibold ${examData.shuffleOptions ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {examData.shuffleOptions ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Questions List Preview */}
            {examData.questions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7b8aaa]">Questions</p>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {examData.questions.map((q, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-[#070b18] border border-[#1a2440] rounded-xl">
                      <span className="w-6 h-6 rounded-lg bg-[#161e36] text-[#7b8aaa] text-[10px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{q.title || 'Untitled Question'}</p>
                        <p className="text-[10px] text-[#7b8aaa]">{q.type.replace(/_/g, ' ')} · {q.marks} marks</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Row */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 bg-[#070b18] border border-[#161e36] text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="ml-auto px-6 py-2.5 bg-[#bf4507] hover:bg-[#c24709] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {editingId ? 'Updating...' : 'Publishing...'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {editingId ? 'Update Exam' : 'Publish Exam'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step !== 4 && (
          <div className="flex items-center gap-3 pt-6 border-t border-[#1a2440] mt-6">
            {step > 1 && (
              <button
                onClick={() => handleSetStep(step - 1)}
                className="px-5 py-2.5 bg-[#070b18] border border-[#161e36] text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
            {step < 4 && (
              <button
                onClick={() => handleSetStep(step + 1)}
                className="px-5 py-2.5 bg-[#bf4507] hover:bg-[#c24709] text-white rounded-xl text-xs font-bold transition-all shadow-md ml-auto flex items-center gap-1.5"
              >
                {step === 3 ? 'Review & Publish' : 'Next Step'}
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        )}
          </div>
          {/* ── End Right Content Panel ── */}
        </div>
        {/* ── End Body ── */}
      </div>
      {/* ── End Unified Card ── */}

      <AiQuestionModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onApplyQuestions={handleApplyAiQuestions}
        mode="exam"
      />
      <QuestionSlip
        selectedItems={slipItems}
        onRemoveItem={handleRemoveSlipItem}
        onClearAll={handleClearSlip}
        onConfirmAdd={handleConfirmAddSlipToExam}
      />
    </div>
  );
}

export default function CreateExamPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <CreateExamInner />
    </Suspense>
  );
}
