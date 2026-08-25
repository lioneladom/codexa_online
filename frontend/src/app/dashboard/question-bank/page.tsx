'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getApiUrl } from '@/config/api';
import AiQuestionModal, { GeneratedQuestionItem } from '@/components/AiQuestionModal';

interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

interface QuestionBankItem {
  id: string;
  type: string;
  title: string;
  problemStatement: string;
  marks: number;
  language?: string;
  createdAt: string;
  tags?: string;
  options?: string;
  correctOption?: string;
  referenceSolution?: string;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  sampleInput?: string;
  sampleOutput?: string;
  testCases?: TestCase[];
}

const parseOptions = (raw?: string | null): string[] => {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).map(s => s.trim()).filter(Boolean);
    } catch (e) {}
  }
  if (trimmed.includes('|||')) return trimmed.split('|||').map(s => s.trim()).filter(Boolean);
  if (trimmed.includes('\n')) return trimmed.split('\n').map(s => s.trim()).filter(Boolean);
  if (trimmed.includes(';')) return trimmed.split(';').map(s => s.trim()).filter(Boolean);
  if (trimmed.includes(',')) return trimmed.split(',').map(s => s.trim()).filter(Boolean);
  return [trimmed];
};

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterLanguage, setFilterLanguage] = useState('ALL');
  const [filterTag, setFilterTag] = useState('ALL');
  const [showAiModal, setShowAiModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionBankItem | null>(null);
  
  const router = useRouter();

  const handleSaveAiQuestionsToBank = async (aiQuestions: GeneratedQuestionItem[]) => {
    const token = localStorage.getItem('codexa_token');
    if (!token) return;

    try {
      const items = aiQuestions.map((q) => ({
        type: q.type,
        title: q.title,
        problemStatement: q.problemStatement,
        marks: q.marks,
        language: q.language || undefined,
        options: q.options ? JSON.stringify(q.options) : undefined,
        correctOption: q.correctOption || undefined,
        referenceSolution: q.referenceSolution || undefined,
        constraints: q.constraints || undefined,
        inputFormat: q.inputFormat || undefined,
        outputFormat: q.outputFormat || undefined,
        sampleInput: q.sampleInput || undefined,
        sampleOutput: q.sampleOutput || undefined,
        testCases: q.testCases || undefined,
      }));

      const res = await fetch(`${getApiUrl()}/question-bank/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });

      if (res.ok) {
        fetchQuestions();
      } else {
        const errText = await res.text();
        alert(`Failed to save AI questions: ${errText}`);
      }
    } catch (err) {
      console.error('Error saving AI questions to bank:', err);
    }
  };

  const fetchQuestions = async () => {
    const token = localStorage.getItem('codexa_token');
    if (!token) {
      router.replace('/');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${getApiUrl()}/question-bank`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      } else {
        const errorText = await res.text();
        console.error('Failed to fetch question bank:', res.status, errorText);
      }
    } catch (err) {
      console.error('Error fetching question bank:', err);
    } finally {
      setLoading(false);
    }
  };



  const deleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question from the bank?')) return;
    const token = localStorage.getItem('codexa_token');
    if (!token) return;

    try {
      const res = await fetch(`${getApiUrl()}/question-bank/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchQuestions();
        if (selectedQuestion?.id === id) {
          setSelectedQuestion(null);
        }
      } else {
        alert('Failed to delete question.');
      }
    } catch (err) {
      alert(`Error deleting question: ${err}`);
    }
  };

  const exportQuestions = () => {
    if (questions.length === 0) {
      alert("No questions to export!");
      return;
    }
    
    // Clean database-specific IDs to make JSON clean for re-importing
    const cleanQuestions = questions.map(({ id, createdAt, ...rest }) => ({
      ...rest,
      testCases: rest.testCases?.map(({ ...tc }) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden || false,
      }))
    }));

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanQuestions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "codexa-question-bank-export.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const rawItems = Array.isArray(json) ? json : [json];
        
        // Basic mapping and safety validation
        const items = rawItems.map((item: any) => ({
          type: item.type || 'PROGRAMMING',
          title: item.title || 'Untitled imported Question',
          problemStatement: item.problemStatement || '',
          marks: parseInt(item.marks) || 10,
          language: item.language || undefined,
          tags: item.tags || undefined,
          options: item.options || undefined,
          correctOption: item.correctOption || undefined,
          referenceSolution: item.referenceSolution || undefined,
          constraints: item.constraints || undefined,
          inputFormat: item.inputFormat || undefined,
          outputFormat: item.outputFormat || undefined,
          sampleInput: item.sampleInput || undefined,
          sampleOutput: item.sampleOutput || undefined,
          testCases: item.testCases || undefined,
        }));

        for (const item of items) {
          if (!item.problemStatement) {
            alert("Each question must contain a problemStatement.");
            return;
          }
        }

        const token = localStorage.getItem('codexa_token');
        const res = await fetch(`${getApiUrl()}/question-bank/import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ items }),
        });

        if (res.ok) {
          alert(`Successfully imported ${items.length} questions into the bank!`);
          fetchQuestions();
        } else {
          const errorText = await res.text();
          alert(`Failed to import questions: ${errorText}`);
        }
      } catch (err: any) {
        alert(`Error parsing JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // clear input selection
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Dynamically extract unique languages and tags for filters
  const languages = Array.from(new Set(questions.map((q) => q.language).filter(Boolean)));
  
  const tags = Array.from(
    new Set(
      questions.flatMap((q) => (q.tags ? q.tags.split(',').map((t) => t.trim()) : []))
    )
  );

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.problemStatement.toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === 'ALL' || q.type === filterType;
    const matchesLanguage = filterLanguage === 'ALL' || q.language === filterLanguage;
    
    const matchesTag =
      filterTag === 'ALL' ||
      (q.tags && q.tags.split(',').map((t) => t.trim().toLowerCase()).includes(filterTag.toLowerCase()));

    return matchesSearch && matchesType && matchesLanguage && matchesTag;
  });

  const questionTypes = [
    { value: 'ALL', label: 'All Questions' },
    { value: 'PROGRAMMING', label: 'Programming' },
    { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
    { value: 'FILL_IN_THE_BLANK', label: 'Fill in Blank' },
    { value: 'SHORT_ANSWER', label: 'Short Answer' },
    { value: 'LONG_ANSWER', label: 'Long Answer' },
  ];

  return (
    <div className="p-8 bg-[#030712] min-h-screen text-[#f0f2f8]">
      {/* Header section */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Question Bank</h1>
          <p className="text-[#7b8aaa] text-sm mt-1">Organize, filter, and import/export reusable exam questions.</p>
        </div>
        
        {/* Buttons container */}
        <div className="flex flex-wrap gap-2.5 items-center">
          <button
            onClick={() => setShowAiModal(true)}
            className="px-4 py-2 bg-[#bf4507] hover:bg-[#c24709] text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Questions with AI
          </button>

          <button
            onClick={exportQuestions}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export JSON
          </button>
        </div>
      </div>

      {/* Category Selection Tabs */}
      <div className="flex flex-wrap gap-1 bg-[#070b18] border border-[#1a2440] p-1 rounded-xl mb-6 max-w-fit">
        {questionTypes.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterType === tab.value
                ? 'bg-accent text-white shadow-sm'
                : 'text-[#7b8aaa] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dynamic Filters Pane */}
      <div className="bg-[#0c1222] border border-[#1a2440] rounded-2xl p-5 mb-6 shadow-sm flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search questions by title or description keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#070b18] border border-[#1a2440] rounded-xl text-xs focus:outline-none focus:border-accent transition-all text-[#f0f2f8] placeholder-[#7b8aaa]"
          />
          <svg className="w-4 h-4 text-[#7b8aaa] absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filter Language */}
        <div className="w-full lg:w-48 flex flex-col gap-1">
          <select
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#070b18] border border-[#1a2440] rounded-xl text-xs focus:outline-none focus:border-accent transition-all text-[#f0f2f8] font-semibold"
          >
            <option value="ALL">All Languages</option>
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang && lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Topic / Tag */}
        <div className="w-full lg:w-48 flex flex-col gap-1">
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#070b18] border border-[#1a2440] rounded-xl text-xs focus:outline-none focus:border-accent transition-all text-[#f0f2f8] font-semibold"
          >
            <option value="ALL">All Topics / Tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Body - List and Detail View */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Questions Grid */}
        <div className="flex-1 bg-[#0c1222] border border-[#1a2440] rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="text-center py-16 text-[#7b8aaa]">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-2"></div>
              <p className="text-xs">Loading question repository...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="p-16 text-center text-[#7b8aaa]">
              <p className="text-base font-bold text-white">No questions found</p>
              <p className="text-xs text-[#7b8aaa] mt-1">Try resetting filters or generating new questions with AI.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a2440] max-h-[70vh] overflow-y-auto">
              {filteredQuestions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestion(q)}
                  className={`p-5 hover:bg-[#161e36] transition-all cursor-pointer flex justify-between items-start gap-4 ${
                    selectedQuestion?.id === q.id ? 'bg-[#161e36] border-l-4 border-accent' : ''
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-[#070b18] text-[#f0f2f8] border border-[#1a2440] font-extrabold uppercase">
                        {q.type.replace('_', ' ')}
                      </span>
                      {q.language && (
                        <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/40 font-extrabold uppercase">
                          {q.language}
                        </span>
                      )}
                      {q.tags && q.tags.split(',').map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded bg-orange-950/50 text-accent border border-accent/30 font-bold">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-sm font-extrabold text-white truncate">{q.title}</h3>
                    <p className="text-[#7b8aaa] text-xs line-clamp-2 mt-1">{q.problemStatement}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs font-bold text-white">{q.marks} Marks</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteQuestion(q.id);
                      }}
                      className="p-1 rounded-md text-[#7b8aaa] hover:text-red-400 hover:bg-red-950/40 transition-all"
                      title="Delete Question"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detailed Question Preview Card */}
        {selectedQuestion && (
          <div className="w-full lg:w-96 bg-[#0c1222] border border-[#1a2440] p-6 rounded-2xl shadow-sm flex flex-col space-y-4 max-h-[70vh] overflow-y-auto animate-scale-up">
            <div className="flex justify-between items-start border-b border-[#1a2440] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-white">{selectedQuestion.title}</h3>
                <span className="text-[10px] text-[#7b8aaa] font-mono mt-0.5 block">ID: {selectedQuestion.id.substring(0, 8)}</span>
              </div>
              <button
                onClick={() => setSelectedQuestion(null)}
                className="p-1.5 rounded-lg hover:bg-[#161e36] border border-[#1a2440] text-[#7b8aaa] hover:text-white transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] text-accent font-extrabold uppercase tracking-wider block mb-1">Problem Statement</span>
                <p className="text-[#f0f2f8] leading-relaxed bg-[#070b18] border border-[#1a2440] p-3.5 rounded-xl whitespace-pre-wrap">{selectedQuestion.problemStatement}</p>
              </div>

              {selectedQuestion.type === 'MULTIPLE_CHOICE' && selectedQuestion.options && (
                <div>
                  <span className="text-[10px] text-accent font-extrabold uppercase tracking-wider block mb-2">Options</span>
                  <div className="space-y-1.5">
                    {parseOptions(selectedQuestion.options).map((opt: string, idx: number) => (
                      <div
                        key={idx}
                        className={`p-2.5 border rounded-xl flex items-center gap-2 font-medium ${
                          opt === selectedQuestion.correctOption
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : 'bg-[#070b18] border-[#1a2440] text-[#7b8aaa]'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-[#0c1222] flex items-center justify-center text-[10px] font-bold border border-[#1a2440] shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="truncate">{opt}</span>
                        {opt === selectedQuestion.correctOption && <span className="ml-auto text-[10px] font-extrabold text-emerald-400">Correct Option</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selectedQuestion.type === 'SHORT_ANSWER' || selectedQuestion.type === 'FILL_IN_THE_BLANK') && (
                <div>
                  <span className="text-[10px] text-accent font-extrabold uppercase tracking-wider block mb-1">Expected Correct Answer</span>
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold font-mono">
                    {selectedQuestion.correctOption}
                  </div>
                </div>
              )}

              {selectedQuestion.referenceSolution && (
                <div>
                  <span className="text-[10px] text-accent font-extrabold uppercase tracking-wider block mb-1">Reference Solution</span>
                  <pre className="font-mono text-[10px] text-[#f0f2f8] bg-[#070b18] border border-[#1a2440] p-3 rounded-xl overflow-x-auto whitespace-pre max-h-40">
                    {selectedQuestion.referenceSolution}
                  </pre>
                </div>
              )}

              {selectedQuestion.constraints && (
                <div>
                  <span className="text-[10px] text-accent font-extrabold uppercase tracking-wider block mb-1">Constraints</span>
                  <p className="text-[#f0f2f8] bg-[#070b18] border border-[#1a2440] p-2.5 rounded-xl font-medium">{selectedQuestion.constraints}</p>
                </div>
              )}

              {selectedQuestion.testCases && selectedQuestion.testCases.length > 0 && (
                <div>
                  <span className="text-[10px] text-accent font-extrabold uppercase tracking-wider block mb-2">Test Cases ({selectedQuestion.testCases.length})</span>
                  <div className="space-y-2">
                    {selectedQuestion.testCases.map((tc, idx) => (
                      <div key={idx} className="bg-[#070b18] border border-[#1a2440] rounded-xl p-3.5 space-y-2">
                        <div className="flex justify-between items-center text-[9px] text-[#7b8aaa] font-bold uppercase">
                          <span>Test Case #{idx + 1}</span>
                          {tc.isHidden && <span className="bg-[#161e36] text-[#7b8aaa] px-1 py-0.5 rounded">Hidden</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-[9px] text-[#7b8aaa] block font-semibold mb-0.5">Input:</span>
                            <pre className="font-mono bg-[#0c1222] border border-[#1a2440] text-[#f0f2f8] p-1.5 rounded-lg overflow-x-auto">{tc.input || '<empty>'}</pre>
                          </div>
                          <div>
                            <span className="text-[9px] text-[#7b8aaa] block font-semibold mb-0.5">Output:</span>
                            <pre className="font-mono bg-[#0c1222] border border-[#1a2440] text-[#f0f2f8] p-1.5 rounded-lg overflow-x-auto">{tc.expectedOutput || '<empty>'}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AiQuestionModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onApplyQuestions={handleSaveAiQuestionsToBank}
        mode="bank"
      />
    </div>
  );
}
