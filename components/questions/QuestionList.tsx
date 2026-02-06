'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import QuestionCard from './QuestionCard';
import { QuestionData } from './QuestionCard';

const tabs = [
  { id: 'top', label: 'Top', heading: 'Highest Scored Questions' },
  { id: 'newest', label: 'Newest', heading: 'Newest Questions' },
];

interface ForumInfo {
  name: string;
  description: string | null;
}

const QuestionList = () => {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const forumId = searchParams.get('forum') || '';
  const [activeTab, setActiveTab] = useState('top');
  const [currentPage, setCurrentPage] = useState(1);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
  const [forumInfo, setForumInfo] = useState<ForumInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const perPage = 20;

  const currentTab = tabs.find((t) => t.id === activeTab)!;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, forumId]);

  useEffect(() => {
    if (forumId) {
      fetch('/api/forums')
        .then((res) => res.json())
        .then((data) => {
          const forum = data.forums.find((f: { id: string }) => f.id === forumId);
          if (forum) {
            setForumInfo({ name: forum.name, description: forum.description });
          } else {
            setForumInfo(null);
          }
        })
        .catch(() => setForumInfo(null));
    } else {
      setForumInfo(null);
    }
  }, [forumId]);

  useEffect(() => {
    setLoading(true);
    let url = `/api/questions?sort=${activeTab}&page=${currentPage}`;
    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }
    if (forumId) {
      url += `&forum_id=${encodeURIComponent(forumId)}`;
    }
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data.questions);
        setTotalPages(data.total_pages);

        if (data.total_pages <= 1) {
          setTotalQuestions(data.questions.length);
        } else if (currentPage === data.total_pages) {
          setTotalQuestions((data.total_pages - 1) * perPage + data.questions.length);
        } else {
          let lastUrl = `/api/questions?sort=${activeTab}&page=${data.total_pages}`;
          if (searchQuery) lastUrl += `&search=${encodeURIComponent(searchQuery)}`;
          if (forumId) lastUrl += `&forum_id=${encodeURIComponent(forumId)}`;
          fetch(lastUrl)
            .then((r) => r.json())
            .then((last) => {
              setTotalQuestions((data.total_pages - 1) * perPage + last.questions.length);
            })
            .catch(() => setTotalQuestions(null));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeTab, currentPage, searchQuery, forumId]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

  const paginationPages = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="py-6 px-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">
          {searchQuery
            ? `Search Results for "${searchQuery}"`
            : forumInfo
              ? `Questions on ${forumInfo.name}`
              : currentTab.heading}
        </h1>
        <p className="text-sm text-[#666] mt-1 min-h-[20px]">
          {forumInfo?.description && !searchQuery ? forumInfo.description : '\u00A0'}
        </p>
      </div>
      {totalQuestions !== null && (
        <p className="text-sm text-[#999] mb-4">
          {totalQuestions.toLocaleString()} questions
        </p>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-[#e5e5e5] pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
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
      {loading ? (
        <div className="py-16 text-center text-[#999] text-sm">Loading questions...</div>
      ) : questions.length === 0 ? (
        <div className="py-16 text-center text-[#999] text-sm">No questions found.</div>
      ) : (
        questions.map((q) => (
          <QuestionCard key={q.id} question={q} />
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-1.5 py-8">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm border border-[#d4d4d4] rounded text-[#555] hover:bg-[#f5f5f5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev
          </button>

          {paginationPages()[0] > 1 && (
            <>
              <button
                onClick={() => setCurrentPage(1)}
                className="min-w-[36px] px-2 py-1.5 text-sm border border-[#d4d4d4] rounded text-[#555] hover:bg-[#f5f5f5] transition-colors"
              >
                1
              </button>
              {paginationPages()[0] > 2 && (
                <span className="px-1 text-sm text-[#999]">...</span>
              )}
            </>
          )}

          {paginationPages().map((page) => (
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

          {paginationPages()[paginationPages().length - 1] < totalPages && (
            <>
              {paginationPages()[paginationPages().length - 1] < totalPages - 1 && (
                <span className="px-1 text-sm text-[#999]">...</span>
              )}
              <button
                onClick={() => setCurrentPage(totalPages)}
                className="min-w-[36px] px-2 py-1.5 text-sm border border-[#d4d4d4] rounded text-[#555] hover:bg-[#f5f5f5] transition-colors"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm border border-[#d4d4d4] rounded text-[#555] hover:bg-[#f5f5f5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionList;
