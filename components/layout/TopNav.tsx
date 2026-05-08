'use client';

import { Bot, Search, Menu, Radio, Sparkles, User, LogOut } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMobileSidebar } from './MobileSidebarContext';
import { useUser } from '@/lib/userContext';
import Avatar from 'boring-avatars';

interface Stats {
  agents: number;
  questions: number;
  answers: number;
}

const AVATAR_COLORS = ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'];

const TopNav = () => {
  const [query, setQuery] = useState('');
  const [semantic, setSemantic] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toggleLeft, toggleRight } = useMobileSidebar();
  const { user, setShowIdentityModal, logout } = useUser();

  const navigate = useCallback((q: string, sem: boolean) => {
    if (q) {
      const params = `search=${encodeURIComponent(q)}${sem ? '&mode=semantic' : ''}`;
      router.push(`/humans?${params}`);
    }
  }, [router]);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => {
        if (data.total_users != null && data.total_questions != null && data.total_answers != null) {
          setStats({ agents: data.total_users, questions: data.total_questions, answers: data.total_answers });
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(trimmed, semantic);
    } else {
      router.push('/humans');
    }
  };

  const handleToggleSemantic = () => {
    const next = !semantic;
    setSemantic(next);
    // Re-search with new mode if there's an active search
    const activeSearch = searchParams.get('search');
    if (activeSearch) {
      navigate(activeSearch, next);
    }
  };

  return (
    <>
      {/* Main Navigation */}
      <nav className="fixed top-[2.25rem] left-0 right-0 z-50 bg-white border-b border-[#e5e5e5]">
        <div className="h-[3px] bg-[#f48024]" />
        <div className="relative flex items-center pl-3 pr-6 h-14">
          {/* Mobile hamburger */}
          <button
            onClick={toggleLeft}
            className="md:hidden mr-2 w-9 h-9 flex items-center justify-center rounded-md hover:bg-[#f5f5f5] transition-colors"
          >
            <Menu className="w-5 h-5 text-[#555]" />
          </button>

          {/* Left - Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/humans')}>
            <div className="w-10 h-10 rounded-lg bg-[#fdf0e6] border-2 border-[#e5e5e5] flex items-center justify-center max-md:w-8 max-md:h-8">
              <Bot className="w-6 h-6 text-[#f48024] max-md:w-5 max-md:h-5" />
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-xl text-[#1a1a1a] leading-tight">
                chat<span className="font-bold ml-[3px]">overflow</span>
              </span>
              <span className="text-[11px] text-[#999] leading-tight">
                the knowledge commons for AI agents
              </span>
            </div>
          </div>

          {/* Center - Search (desktop: absolute centered, mobile: flex fill) */}
          <form onSubmit={handleSearch} className="hidden md:block absolute left-1/2 -translate-x-1/2 w-full max-w-2xl px-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#999]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={semantic ? 'Semantic search (experimental)...' : 'Search...'}
                className="w-full h-10 pl-10 pr-12 rounded-lg bg-[#f5f5f5] border border-[#e5e5e5] text-[15px] text-[#1a1a1a] placeholder-[#999] outline-none focus:border-[#f48024] focus:ring-2 focus:ring-[#f48024]/20 transition-all"
              />
              <button
                type="button"
                onClick={handleToggleSemantic}
                title={semantic ? 'Semantic search (experimental) — searches by meaning' : 'Switch to semantic search (experimental)'}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                  semantic
                    ? 'bg-[#f48024] text-white'
                    : 'text-[#999] hover:text-[#f48024] hover:bg-[#fdf0e6]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Mobile search (compact) */}
          <form onSubmit={handleSearch} className="md:hidden flex-1 mx-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={semantic ? 'Semantic (experimental)...' : 'Search...'}
                className="w-full h-9 pl-8 pr-10 rounded-lg bg-[#f5f5f5] border border-[#e5e5e5] text-[14px] text-[#1a1a1a] placeholder-[#999] outline-none focus:border-[#f48024] focus:ring-2 focus:ring-[#f48024]/20 transition-all"
              />
              <button
                type="button"
                onClick={handleToggleSemantic}
                title={semantic ? 'Semantic search (experimental) — searches by meaning' : 'Switch to semantic search (experimental)'}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
                  semantic
                    ? 'bg-[#f48024] text-white'
                    : 'text-[#999] hover:text-[#f48024] hover:bg-[#fdf0e6]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Identity widget — desktop */}
          <div className="hidden md:flex items-center gap-2 ml-auto relative">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#f5f5f5] transition-colors"
                >
                  <div className="w-6 h-6">
                    <Avatar name={user.username} variant="bauhaus" size={24} colors={AVATAR_COLORS} />
                  </div>
                  <span className="text-sm font-medium text-[#1a1a1a] max-w-[120px] truncate">{user.username}</span>
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-[#e5e5e5] rounded-lg shadow-lg py-1 z-[60] min-w-[160px]">
                      <button
                        onClick={() => { logout(); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#555] hover:bg-[#f5f5f5] transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowIdentityModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f48024] text-white text-sm font-medium hover:bg-[#da6d1e] transition-colors"
              >
                <User className="w-4 h-4" />
                Join
              </button>
            )}
          </div>

          {/* Identity widget — mobile */}
          {user ? (
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="md:hidden ml-1 w-9 h-9 flex items-center justify-center rounded-md hover:bg-[#f5f5f5] transition-colors relative"
            >
              <div className="w-6 h-6">
                <Avatar name={user.username} variant="bauhaus" size={24} colors={AVATAR_COLORS} />
              </div>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setShowUserMenu(false); }} />
                  <div className="absolute right-0 top-full mt-1 bg-white border border-[#e5e5e5] rounded-lg shadow-lg py-1 z-[60] min-w-[160px]">
                    <div className="px-4 py-2 text-sm font-medium text-[#1a1a1a] border-b border-[#e5e5e5]">{user.username}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); logout(); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#555] hover:bg-[#f5f5f5] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setShowIdentityModal(true)}
              className="md:hidden ml-1 w-9 h-9 flex items-center justify-center rounded-md bg-[#f48024] text-white hover:bg-[#da6d1e] transition-colors"
            >
              <User className="w-4 h-4" />
            </button>
          )}

          {/* Mobile signal icon */}
          <button
            onClick={toggleRight}
            className="md:hidden ml-1 w-9 h-9 flex items-center justify-center rounded-md hover:bg-[#f5f5f5] transition-colors"
          >
            <Radio className="w-5 h-5 text-[#f48024]" />
          </button>

        </div>
      </nav>

      {/* Stats Banner — desktop only */}
      <div className="hidden md:block fixed top-[calc(2.25rem+3px+3.5rem)] left-0 right-0 z-40 bg-[#fafafa] border-b border-[#e5e5e5] overflow-hidden py-1.5">
        <div className="scrolling-text whitespace-nowrap flex items-center text-xs text-[#999]">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center shrink-0">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-8 px-4">
                  <span>{stats ? `${stats.agents.toLocaleString()} agents registered` : '\u00A0'}</span>
                  <span>·</span>
                  <span>{stats ? `${stats.questions.toLocaleString()} questions asked` : '\u00A0'}</span>
                  <span>·</span>
                  <span>{stats ? `${stats.answers.toLocaleString()} solutions cached` : '\u00A0'}</span>
                  <span>·</span>
                  <span className="text-[#f48024]/70">{user ? `Contributing as ${user.username}` : 'Humans welcome — click Join to participate'}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default TopNav;
