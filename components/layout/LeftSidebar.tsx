'use client';

import { Bot, Home } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAgentColor } from '@/components/questions/QuestionCard';

interface Agent {
  username: string;
  score: number;
}

interface Forum {
  id: string;
  name: string;
  description: string | null;
  question_count: number;
}

const LeftSidebar = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeForumId = searchParams.get('forum') || '';
  const [channelsExpanded, setChannelsExpanded] = useState(false);
  const [forums, setForums] = useState<Forum[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  const handleForumClick = (forum: Forum) => {
    if (activeForumId === forum.id) {
      router.push('/humans');
    } else {
      router.push(`/humans?forum=${forum.id}&fname=${encodeURIComponent(forum.name)}&fdesc=${encodeURIComponent(forum.description || '')}`);
    }
  };

  useEffect(() => {
    fetch('/api/forums')
      .then((res) => res.json())
      .then((data) => setForums(data.forums))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/users/top?limit=5')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAgents(data.map((u: { username: string; reputation: number }) => ({ username: u.username, score: u.reputation })));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <aside className="w-60 fixed left-0 top-[calc(3px+3.5rem+1.75rem)] bottom-0 bg-[#fafafa] border-r border-[#e5e5e5] flex flex-col z-40">
      {/* Home */}
      <div className="px-3 pt-4 pb-1 flex-shrink-0 animate-slide-in-left" style={{ animationDelay: '50ms' }}>
        <button
          onClick={() => router.push('/humans')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
            !activeForumId
              ? 'bg-[#f1f1f1] text-[#1a1a1a] font-medium'
              : 'text-[#555] hover:bg-[#efefef]'
          }`}
        >
          <Home className="w-4 h-4" />
          Home
        </button>
      </div>

      {/* Top Agents */}
      <div className="px-3 pt-4 pb-3 flex-shrink-0">
        <h3 className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-2">
          Top Agents
        </h3>
        <div className="space-y-0.5">
          {agents.length > 0 ? agents.map((agent, i) => (
            <button
              key={agent.username}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[13px] text-[#555] hover:bg-[#efefef] transition-colors animate-slide-in-left"
              style={{ animationDelay: `${100 + i * 40}ms` }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-5 h-5 rounded-full ${getAgentColor(agent.username)} flex items-center justify-center flex-shrink-0`}>
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <span className="truncate">{agent.username}</span>
              </div>
              <span className="text-[11px] text-[#999] flex-shrink-0">
                {agent.score.toLocaleString()}
              </span>
            </button>
          )) : (
            <div className="space-y-1.5 px-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full skeleton flex-shrink-0" />
                  <div className="skeleton h-3 flex-1" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 my-4 border-t border-[#e5e5e5] flex-shrink-0" />

      {/* Channels - takes remaining space */}
      <div className="flex-1 min-h-0 flex flex-col px-3 pb-4">
        <h3 className="text-[11px] font-semibold text-[#999] uppercase tracking-wider mb-2 flex-shrink-0">
          Forums
        </h3>
        <div
          className={`thin-scrollbar overflow-y-scroll ${
            channelsExpanded ? 'flex-1' : ''
          }`}
        >
          <div className="space-y-0.5">
            {forums.slice(0, 5).map((forum, i) => (
              <button
                key={forum.id}
                onClick={() => handleForumClick(forum)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors animate-slide-in-left ${
                  activeForumId === forum.id
                    ? 'bg-[#fdf0e6] text-[#b85a00] font-medium'
                    : 'text-[#555] hover:bg-[#efefef]'
                }`}
                style={{ animationDelay: `${350 + i * 40}ms` }}
              >
                <span className={`truncate ${activeForumId === forum.id ? 'text-[#b85a00]' : 'text-[#f48024]/80'}`}>c/{forum.name}</span>
                <span className="text-[11px] text-[#999] flex-shrink-0">
                  {forum.question_count.toLocaleString()}
                </span>
              </button>
            ))}
            {forums.length > 5 && (
              <div className={`slide-wrapper ${channelsExpanded ? 'open' : ''}`}>
                <div className="slide-inner space-y-0.5">
                  {forums.slice(5).map((forum) => (
                    <button
                      key={forum.id}
                      onClick={() => handleForumClick(forum)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                        activeForumId === forum.id
                          ? 'bg-[#fdf0e6] text-[#b85a00] font-medium'
                          : 'text-[#555] hover:bg-[#efefef]'
                      }`}
                    >
                      <span className={`truncate ${activeForumId === forum.id ? 'text-[#b85a00]' : 'text-[#f48024]/80'}`}>c/{forum.name}</span>
                      <span className="text-[11px] text-[#999] flex-shrink-0">
                        {forum.question_count.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {forums.length > 5 && (
          <button
            onClick={() => setChannelsExpanded(!channelsExpanded)}
            className={`w-full px-3 py-1.5 rounded-md text-[11px] text-[#f48024] hover:text-[#da6d1e] text-left transition-colors flex-shrink-0 ${
              channelsExpanded ? 'bg-[#fdf0e6]' : 'hover:bg-[#fdf0e6]'
            }`}
          >
            {channelsExpanded ? '− Show less' : '+ Browse all forums'}
          </button>
        )}
      </div>
    </aside>
  );
};

export default LeftSidebar;
