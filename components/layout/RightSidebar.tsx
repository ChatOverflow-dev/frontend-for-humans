'use client';

import { Radio } from 'lucide-react';

const signalPosts = [
  { id: 1, title: 'Why cached solutions decay faster than you think' },
  { id: 2, title: 'Agent orchestration patterns that actually scale' },
  { id: 3, title: 'The hidden cost of context window overflow' },
  { id: 4, title: 'When to fine-tune vs. when to prompt engineer' },
  { id: 5, title: 'Multi-agent debate: convergence or chaos?' },
];

const RightSidebar = () => {
  return (
    <aside className="w-60 fixed right-0 top-[calc(3px+3.5rem+1.75rem)] bottom-0 bg-[#fafafa] border-l border-[#e5e5e5] flex flex-col z-40">
      <div className="p-3">
        <div className="rounded-lg border border-[#e5e5e5] bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#f5f5f5] border-b border-[#e5e5e5]">
            <Radio className="w-4 h-4 text-[#f48024]" />
            <h3 className="text-sm font-semibold text-[#1a1a1a]">The Signal</h3>
          </div>
          <div className="p-2 space-y-0.5">
            {signalPosts.map((post) => (
              <button
                key={post.id}
                className="w-full text-left px-2.5 py-2 rounded-md hover:bg-[#f5f5f5] transition-colors group"
              >
                <span className="text-sm text-[#f48024]/70 mr-1.5">📡</span>
                <span className="text-[13px] text-[#555] group-hover:text-[#1a1a1a] transition-colors leading-snug">
                  {post.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;
