'use client';

import React, { useState } from 'react';

export interface SelectedQuestionItem {
  id: string;
  title: string;
  type: string;
  marks: number;
  problemStatement: string;
  language?: string;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  sampleInput?: string;
  sampleOutput?: string;
  referenceSolution?: string;
  options?: string;
  correctOption?: string;
  testCases?: any[];
}

interface QuestionSlipProps {
  selectedItems: SelectedQuestionItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onConfirmAdd: (items: SelectedQuestionItem[]) => void;
}

export default function QuestionSlip({ selectedItems, onRemoveItem, onClearAll, onConfirmAdd }: QuestionSlipProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!selectedItems || selectedItems.length === 0) return null;

  const totalMarks = selectedItems.reduce((sum, item) => sum + (item.marks || 0), 0);

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#070b18]/95 border border-[#bf4507]/40 rounded-2xl shadow-2xl backdrop-blur-xl text-[#f0f2f8] overflow-hidden animate-slide-up flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#161e36] to-[#070b18] p-4 border-b border-[#1a2440] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-xl bg-[#bf4507]/20 text-[#bf4507] border border-[#bf4507]/30">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-wider text-white">Question Slip</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#bf4507] text-white">
                {selectedItems.length} Selected
              </span>
            </div>
            <span className="text-[10px] text-[#7b8aaa] font-medium block mt-0.5">Total Marks: {totalMarks}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-[#7b8aaa] hover:text-white hover:bg-[#161e36] transition-colors"
            title={isExpanded ? 'Collapse Slip' : 'Expand Slip'}
          >
            <svg className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body: Selected Items List */}
      {isExpanded && (
        <div className="p-3 space-y-2 max-h-56 overflow-y-auto divide-y divide-[#1a2440]">
          {selectedItems.map((item) => (
            <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5 mb-0.5">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#161e36] text-[#bf4507] border border-[#1a2440]">
                    {item.type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-[#7b8aaa] font-bold">{item.marks} Mks</span>
                </div>
                <h4 className="font-bold text-white text-xs truncate">{item.title}</h4>
              </div>

              {/* Individual Remove Button (X) */}
              <button
                onClick={() => onRemoveItem(item.id)}
                className="p-1 rounded text-[#7b8aaa] hover:text-red-400 hover:bg-red-950/40 transition-all flex-shrink-0"
                title="Remove question"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-3 bg-[#0c1222] border-t border-[#1a2440] flex items-center justify-between gap-3">
        <button
          onClick={onClearAll}
          className="text-xs text-[#7b8aaa] hover:text-red-400 font-bold transition-colors hover:underline"
        >
          Clear All
        </button>

        <button
          onClick={() => onConfirmAdd(selectedItems)}
          className="px-4 py-2 bg-[#bf4507] hover:bg-[#c24709] text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center space-x-1.5"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>Add Questions to Exam ({selectedItems.length})</span>
        </button>
      </div>
    </div>
  );
}
