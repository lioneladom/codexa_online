'use client';

import React, { useState } from 'react';

export interface GeneratedQuestionItem {
  type: 'PROGRAMMING' | 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'FILL_IN_THE_BLANK' | 'TRUE_FALSE';
  title: string;
  problemStatement: string;
  marks: number;
  language?: string;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  sampleInput?: string;
  sampleOutput?: string;
  starterCode?: string;
  referenceSolution?: string;
  options?: string[];
  correctOption?: string;
  tags?: string;
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }>;
}

interface AiQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyQuestions: (questions: GeneratedQuestionItem[]) => void;
  mode?: 'exam' | 'bank';
}

const RANDOM_CS_TOPICS = [
  'Dynamic Programming: 0/1 Knapsack Problem',
  'Binary Search Tree In-Order Traversal & Insertion',
  'SQL JOIN Queries & Group By Aggregates',
  'Object-Oriented Polymorphism & Abstract Classes',
  'Graph Breadth-First Search (BFS) & Shortest Path',
  'HashMap Lookup & Frequency Counting',
  'Recursion & Memoization Techniques',
  'String Anagram Check & Substring Pattern Matching',
  'Stack Data Structure: Balanced Parentheses Check',
  'Queue Data Structure: Circular Queue Implementation',
  'Sorting Algorithms: QuickSort & MergeSort Analysis',
  'Bitwise Manipulation & Binary Masking',
  'REST API Endpoints & HTTP Request Verification',
];

const QUESTION_TYPES: Array<{
  id: GeneratedQuestionItem['type'];
  label: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'PROGRAMMING',
    label: 'Programming',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    id: 'MULTIPLE_CHOICE',
    label: 'Multiple Choice',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'SHORT_ANSWER',
    label: 'Short Answer',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    id: 'FILL_IN_THE_BLANK',
    label: 'Fill in Blank',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
      </svg>
    ),
  },
  {
    id: 'TRUE_FALSE',
    label: 'True / False',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

type Step = 1 | 2 | 3;

export default function AiQuestionModal({ isOpen, onClose, onApplyQuestions, mode = 'bank' }: AiQuestionModalProps) {
  const [step, setStep] = useState<Step>(1);

  const [topic, setTopic] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Array<GeneratedQuestionItem['type']>>(['PROGRAMMING']);
  const [count, setCount] = useState<number | string>(2);
  const [language, setLanguage] = useState('python');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [marks, setMarks] = useState<number | string>(10);
  const [instructions, setInstructions] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);

  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  if (!isOpen) return null;

  const handleToggleType = (typeId: GeneratedQuestionItem['type']) => {
    setSelectedTypes(prev => {
      if (prev.includes(typeId)) {
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== typeId);
      }
      return [...prev, typeId];
    });
  };

  const handleRandomTopic = () => {
    setTopic(RANDOM_CS_TOPICS[Math.floor(Math.random() * RANDOM_CS_TOPICS.length)]);
  };

  const buildPrompt = (): string => {
    const typeLabels = selectedTypes.map(t => QUESTION_TYPES.find(o => o.id === t)?.label || t).join(', ');
    return `You are a university-level Computer Science exam question generator.

Generate exactly ${count} exam question(s) on the topic: "${topic || 'General Computer Science'}"

Question Type(s): ${typeLabels}
Difficulty: ${difficulty}
Marks per question: ${marks}
${selectedTypes.includes('PROGRAMMING') ? `Target programming language: ${language}` : ''}
${instructions ? `Additional instructions: ${instructions}` : ''}

CRITICAL: Return ONLY a valid JSON array. No markdown, no code blocks, no explanation.

Each question object in the array MUST follow this exact schema:
{
  "type": "PROGRAMMING" | "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "FILL_IN_THE_BLANK" | "TRUE_FALSE",
  "title": "Short descriptive title",
  "problemStatement": "Full problem description",
  "marks": ${marks},
  "language": "${language}",
  "tags": "topic1, topic2",
  ${selectedTypes.includes('PROGRAMMING') ? `"constraints": "Time/space constraints",
  "inputFormat": "Description of input format",
  "outputFormat": "Description of output format",
  "sampleInput": "Example input",
  "sampleOutput": "Example output",
  "referenceSolution": "Complete working solution code",
  "testCases": [
    { "input": "test input 1", "expectedOutput": "expected output 1", "isHidden": false },
    { "input": "test input 2", "expectedOutput": "expected output 2", "isHidden": true }
  ],` : ''}
  ${selectedTypes.includes('MULTIPLE_CHOICE') ? `"options": ["Option A", "Option B", "Option C", "Option D"],
  "correctOption": "The correct option text (must match one of the options exactly)",` : ''}
  ${selectedTypes.includes('SHORT_ANSWER') || selectedTypes.includes('FILL_IN_THE_BLANK') || selectedTypes.includes('TRUE_FALSE') ? `"correctOption": "The correct answer text",` : ''}
}

Return ONLY the JSON array. Example: [{ ... }, { ... }]`;
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(buildPrompt()).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 3000);
      setTimeout(() => setStep(3), 800);
    });
  };

  const handleImportJson = () => {
    setImportError(null);
    setImportSuccess(false);
    try {
      let cleanText = importJson.trim();
      if (cleanText.startsWith('```json')) cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      else if (cleanText.startsWith('```')) cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');

      const parsed = JSON.parse(cleanText);
      const questions: GeneratedQuestionItem[] = Array.isArray(parsed) ? parsed : [parsed];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.title && !q.problemStatement) throw new Error(`Question #${i + 1} is missing both "title" and "problemStatement".`);
        if (!q.type) questions[i].type = 'PROGRAMMING';
        if (!q.marks) questions[i].marks = typeof marks === 'number' ? marks : (parseInt(marks) || 10);
      }

      setImportSuccess(true);
      setTimeout(() => {
        onApplyQuestions(questions);
        onClose();
        setImportJson('');
        setImportSuccess(false);
      }, 600);
    } catch (err: any) {
      setImportError(err.message || 'Invalid JSON format. Please check the pasted content.');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setImportJson(event.target?.result as string);
    reader.readAsText(file);
    e.target.value = '';
  };

  const difficultyColors = {
    EASY: { active: 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400', idle: '' },
    MEDIUM: { active: 'bg-amber-500/15 border-amber-500/50 text-amber-400', idle: '' },
    HARD: { active: 'bg-rose-500/15 border-rose-500/50 text-rose-400', idle: '' },
  };

  const STEP_LABELS = ['Configure', 'Review Prompt', 'Import JSON'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div
        className="bg-[#07091a] border border-[#1a2440] rounded-2xl shadow-2xl w-full max-w-2xl text-[#f0f2f8] flex flex-col"
        style={{ maxHeight: '92vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2440] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#bf4507]/20 border border-[#bf4507]/40 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#bf4507]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-none">Question Assistant</h2>
              <p className="text-[11px] text-[#7b8aaa] mt-0.5">AI-powered question generator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#7b8aaa] hover:text-white transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#161e36]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Step Tab Strip ── */}
        <div className="flex border-b border-[#1a2440] flex-shrink-0">
          {STEP_LABELS.map((label, i) => {
            const s = (i + 1) as Step;
            const isActive = step === s;
            const isCompleted = step > s;
            return (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 py-2.5 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isActive ? 'text-[#bf4507] border-b-2 border-[#bf4507]' : 'text-[#7b8aaa] hover:text-white'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-[#bf4507] text-white' : isCompleted ? 'bg-[#bf4507]/20 text-[#bf4507]' : 'bg-[#161e36] text-[#7b8aaa]'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s}
                </span>
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP 1: Configure ── */}
          {step === 1 && (
            <div className="space-y-5">

              {/* Topic */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#7b8aaa]">
                    Topic <span className="text-[#bf4507]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRandomTopic}
                    className="text-[11px] text-[#bf4507] hover:text-orange-400 font-bold flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Random Topic
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Binary Search Tree Insertion, SQL Joins..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0c1222] border border-[#1a2440] rounded-xl text-sm focus:outline-none focus:border-[#bf4507]/60 text-[#f0f2f8] placeholder-[#3a4460] transition-colors"
                />
              </div>

              {/* Question Types — full-width grid */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7b8aaa] mb-2">
                  Question Types
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {QUESTION_TYPES.map((opt) => {
                    const isSelected = selectedTypes.includes(opt.id);
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => handleToggleType(opt.id)}
                        className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-[10px] font-bold transition-all border ${
                          isSelected
                            ? 'bg-[#bf4507] border-[#bf4507] text-white shadow-md'
                            : 'bg-[#0c1222] border-[#1a2440] text-[#7b8aaa] hover:border-[#bf4507]/40 hover:text-white'
                        }`}
                      >
                        {opt.icon}
                        <span className="text-center leading-tight">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Settings Row — Count, Marks, Difficulty, Language inline */}
              <div className="grid grid-cols-4 gap-3">
                {/* Count — compact number input */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7b8aaa] mb-1">
                    Count
                  </label>
                  <input
                    type="number"
                    value={count}
                    onChange={(e) => setCount(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                    min={1}
                    className="w-full px-3 py-2 bg-[#0c1222] border border-[#1a2440] rounded-lg text-sm text-center font-bold focus:outline-none focus:border-[#bf4507]/60 text-[#f0f2f8] transition-colors"
                  />
                </div>

                {/* Marks */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7b8aaa] mb-1">
                    Marks/Q
                  </label>
                  <input
                    type="number"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                    min={1}
                    className="w-full px-3 py-2 bg-[#0c1222] border border-[#1a2440] rounded-lg text-sm text-center font-bold focus:outline-none focus:border-[#bf4507]/60 text-[#f0f2f8] transition-colors"
                  />
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7b8aaa] mb-1">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-2 py-2 bg-[#0c1222] border border-[#1a2440] rounded-lg text-xs font-bold focus:outline-none focus:border-[#bf4507]/60 text-[#f0f2f8] transition-colors"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                {/* Language (only visible when PROGRAMMING selected) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7b8aaa] mb-1">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={!selectedTypes.includes('PROGRAMMING')}
                    className="w-full px-2 py-2 bg-[#0c1222] border border-[#1a2440] rounded-lg text-xs font-bold focus:outline-none focus:border-[#bf4507]/60 text-[#f0f2f8] transition-colors disabled:opacity-40"
                  >
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7b8aaa] mb-1">
                  Extra Instructions{' '}
                  <span className="font-normal normal-case text-[#3a4460]">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Include edge cases, avoid recursion, use arrays only..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0c1222] border border-[#1a2440] rounded-xl text-sm focus:outline-none focus:border-[#bf4507]/60 text-[#f0f2f8] placeholder-[#3a4460] resize-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: Review Prompt ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Summary chips */}
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 bg-[#0c1222] border border-[#1a2440] rounded-lg text-[11px] text-[#7b8aaa]">
                  <span className="text-white font-bold">{count}</span> question{Number(count) > 1 ? 's' : ''}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${difficultyColors[difficulty].active}`}>
                  {difficulty[0] + difficulty.slice(1).toLowerCase()}
                </span>
                <span className="px-2.5 py-1 bg-[#0c1222] border border-[#1a2440] rounded-lg text-[11px] text-[#7b8aaa]">
                  <span className="text-white font-bold">{marks}</span> marks/q
                </span>
                {selectedTypes.map(t => (
                  <span key={t} className="px-2.5 py-1 bg-[#bf4507]/10 border border-[#bf4507]/30 rounded-lg text-[11px] text-[#bf4507] font-bold">
                    {QUESTION_TYPES.find(o => o.id === t)?.label}
                  </span>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#7b8aaa]">Generated Prompt</label>
                  <span className="text-[10px] text-[#3a4460]">Read-only preview</span>
                </div>
                <pre
                  className="w-full p-3.5 bg-[#0c1222] border border-[#1a2440] rounded-xl text-[10.5px] text-slate-400 font-mono overflow-y-auto whitespace-pre-wrap leading-relaxed"
                  style={{ maxHeight: '280px' }}
                >
                  {buildPrompt()}
                </pre>
              </div>

              {promptCopied && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied! Paste into ChatGPT, Gemini, or Claude — then bring the JSON back on Step 3.
                </div>
              )}

              <div className="p-3 bg-[#0c1222] border border-[#1a2440] rounded-xl text-[11px] text-[#7b8aaa]">
                <strong className="text-white">Next:</strong> Copy the prompt → paste into any AI tool → copy the JSON it returns → go to Step 3.
              </div>
            </div>
          )}

          {/* ── STEP 3: Import JSON ── */}
          {step === 3 && (
            <div className="space-y-4">
              {importError && (
                <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{importError}</span>
                </div>
              )}
              {importSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Questions imported successfully!
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#7b8aaa]">
                    Paste AI JSON Response
                  </label>
                  <label className="cursor-pointer flex items-center gap-1 text-[11px] text-[#bf4507] hover:text-orange-400 font-bold transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Browse File
                    <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
                  </label>
                </div>
                <textarea
                  rows={11}
                  placeholder={'Paste the JSON array returned by the AI...\n\n[\n  {\n    "type": "PROGRAMMING",\n    "title": "Two Sum",\n    "problemStatement": "Given an array...",\n    "marks": 10\n  }\n]'}
                  value={importJson}
                  onChange={(e) => { setImportJson(e.target.value); setImportError(null); }}
                  className="w-full px-3.5 py-3 bg-[#0c1222] border border-[#1a2440] rounded-xl text-sm focus:outline-none focus:border-[#bf4507]/60 text-[#f0f2f8] placeholder-[#2a3450] font-mono resize-none transition-colors"
                />
              </div>
              <p className="text-[11px] text-[#3a4460]">
                Markdown code fences (<code className="text-[#7b8aaa]">```json</code>) are automatically stripped.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-[#1a2440] flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0c1222] hover:bg-[#161e36] text-[#7b8aaa] hover:text-white text-xs font-bold rounded-xl transition-colors border border-[#1a2440]"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((step - 1) as Step)}
                className="px-4 py-2 bg-[#0c1222] hover:bg-[#161e36] text-[#7b8aaa] hover:text-white text-xs font-bold rounded-xl transition-colors border border-[#1a2440] flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}

            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                disabled={!topic.trim()}
                className="px-5 py-2 bg-[#bf4507] hover:bg-[#c24709] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
              >
                Review Prompt
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {step === 2 && (
              <button
                onClick={handleCopyPrompt}
                className="px-5 py-2 bg-[#bf4507] hover:bg-[#c24709] text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {promptCopied ? 'Copied!' : 'Copy Prompt'}
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleImportJson}
                disabled={!importJson.trim()}
                className="px-5 py-2 bg-[#bf4507] hover:bg-[#c24709] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Import & Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
