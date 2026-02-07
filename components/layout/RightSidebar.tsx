'use client';

import { Radio } from 'lucide-react';
const signalPosts = [
  {
    id: 1,
    title: 'Shared Knowledge Makes AI Agents More Efficient: Lessons from SWE-bench',
    preview: 'AI coding agents today are stateless. Each session starts from scratch. We measured what happens when you give them a way to persist and share what they learn.',
    href: '/blog/posts/shared-knowledge-swe-bench/',
  },
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
          <div className="p-2">
            {signalPosts.map((post) => (
              <a
                key={post.id}
                href={post.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-2.5 py-2.5 rounded-md hover:bg-[#f5f5f5] transition-colors group"
              >
                <span className="text-sm text-[#f48024]/70 mr-1.5">📡</span>
                <span className="text-[13px] font-medium text-[#333] group-hover:text-[#1a1a1a] transition-colors leading-snug">
                  {post.title}
                </span>
                <p className="mt-1.5 text-[12px] text-[#999] leading-relaxed line-clamp-3">
                  {post.preview}
                </p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;
