'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getApiUrl } from '@/config/api';

interface QuestionBankItem {
  id: string;
  type: string;
  title: string;
  problemStatement: string;
  marks: number;
  language?: string;
  createdAt: string;
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [seeding, setSeeding] = useState(false);
  const router = useRouter();

  const fetchQuestions = async () => {
    const token = localStorage.getItem('codexa_token');
    if (!token) {
      router.replace('/');
      return;
    }

    try {
      console.log('Fetching question bank...');
      const res = await fetch(`${getApiUrl()}/question-bank`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Question bank response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('Question bank data:', data);
        setQuestions(data);
      } else {
        const errorText = await res.text();
        console.error('Failed to fetch question bank:', res.status, errorText);
        alert(`Error fetching question bank: ${res.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('Error fetching question bank:', err);
      alert(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const seedSampleQuestions = async () => {
    setSeeding(true);
    const token = localStorage.getItem('codexa_token');
    if (!token) return;

    try {
      console.log('Seeding sample questions...');
      const res = await fetch(`${getApiUrl()}/question-bank/seed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Seed response status:', res.status);
      if (res.ok) {
        fetchQuestions();
      } else {
        const errorText = await res.text();
        console.error('Failed to seed questions:', res.status, errorText);
        alert(`Error seeding questions: ${res.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('Error seeding questions:', err);
      alert(`Error: ${err}`);
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase()) || 
      q.problemStatement.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = filterType === 'ALL' || q.type === filterType;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0a0f24]">Question Bank</h1>
          <p className="text-slate-500 text-sm mt-1">Central repository of reusable questions for your exams.</p>
        </div>
        <button
          onClick={seedSampleQuestions}
          disabled={seeding}
          className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-all shadow-sm disabled:opacity-50"
        >
          {seeding ? 'Seeding...' : 'Seed Sample Questions'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search questions by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-[#e2e8f0] rounded-xl text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-4 py-2 border border-[#e2e8f0] bg-white rounded-xl text-sm focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Types</option>
            <option value="PROGRAMMING">Programming</option>
            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
            <option value="FILL_IN_THE_BLANK">Fill in Blank</option>
            <option value="SHORT_ANSWER">Short Answer</option>
            <option value="LONG_ANSWER">Long Answer</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-2"></div>
            <p>Loading question repository...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg">No questions in your bank yet.</p>
            <p className="text-sm text-slate-400 mt-1">Click "Seed Sample Questions" to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-[#e2e8f0]">
            {filteredQuestions.map((q) => (
              <div key={q.id} className="p-6 hover:bg-slate-50/50 transition-all">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[#0a0f24] border border-slate-200 text-xs font-semibold">
                      {q.type}
                    </span>
                    {q.language && (
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold">
                        {q.language}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono">ID: {q.id.substring(0, 8)}</span>
                  </div>
                  <span className="text-sm font-semibold text-accent">{q.marks} Marks</span>
                </div>
                <h3 className="text-base font-bold text-[#0a0f24]">{q.title}</h3>
                <p className="text-slate-600 text-sm mt-2 line-clamp-2">{q.problemStatement}</p>
                <div className="text-xs text-slate-400 mt-4">
                  Created: {new Date(q.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
