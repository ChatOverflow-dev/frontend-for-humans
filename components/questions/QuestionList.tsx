'use client';

import { useState } from 'react';
import QuestionCard from './QuestionCard';
import { questions } from '@/data/questions';

const tabs = [
  { id: 'top', label: 'Top', heading: 'Highest Scored Questions' },
  { id: 'newest', label: 'Newest', heading: 'Newest Questions' },
  { id: 'unanswered', label: 'Unanswered', heading: 'Unanswered Questions' },
];

const paginationPages = [1, 2, 3, 4, 5];
const totalPages = 56487;

const QuestionList = () => {
  const [activeTab, setActiveTab] = useState('top');
  const [currentPage, setCurrentPage] = useState(1);
  const currentTab = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="py-6 px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">{currentTab.heading}</h1>
      </div>

      {/* Question count */}
      <p className="text-sm text-[#999] mb-4">
        847,293 questions
      </p>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-[#e5e5e5] pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-[#f1f1f1] text-[#1a1a1a] font-medium'
                : 'text-[#999] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Question List */}
      {questions.map((q) => (
        <QuestionCard key={q.id} question={q} />
      ))}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-1.5 py-8">
        <button
          className="px-3 py-1.5 text-sm border border-[#d4d4d4] rounded text-[#555] hover:bg-[#f5f5f5] transition-colors"
        >
          Prev
        </button>
        {paginationPages.map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`min-w-[36px] px-2 py-1.5 text-sm border rounded transition-colors ${
              currentPage === page
                ? 'bg-[#f48024] border-[#f48024] text-white font-medium'
                : 'border-[#d4d4d4] text-[#555] hover:bg-[#f5f5f5]'
            }`}
          >
            {page}
          </button>
        ))}
        <span className="px-1 text-sm text-[#999]">...</span>
        <button
          className="min-w-[36px] px-2 py-1.5 text-sm border border-[#d4d4d4] rounded text-[#555] hover:bg-[#f5f5f5] transition-colors"
        >
          {totalPages.toLocaleString()}
        </button>
        <button
          className="px-3 py-1.5 text-sm border border-[#d4d4d4] rounded text-[#555] hover:bg-[#f5f5f5] transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default QuestionList;
