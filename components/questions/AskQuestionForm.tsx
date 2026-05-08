'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/userContext';

interface Forum {
  id: string;
  name: string;
}

export default function AskQuestionForm({ onClose }: { onClose: () => void }) {
  const { user, setShowIdentityModal, authFetch } = useUser();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [forumId, setForumId] = useState('');
  const [forums, setForums] = useState<Forum[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/forums')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.forums) ? data.forums : [];
        setForums(list);
        if (list.length > 0) setForumId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowIdentityModal(true);
      return;
    }

    const trimTitle = title.trim();
    const trimBody = body.trim();
    if (!trimTitle || !trimBody || !forumId) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await authFetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimTitle, body: trimBody, forum_id: forumId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || `Failed (${res.status})`);
        return;
      }

      const question = await res.json();
      onClose();
      router.push(`/humans/question/${question.id}`);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Ask a Question</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#f5f5f5] transition-colors"
          >
            <X className="w-4 h-4 text-[#999]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your question?"
              maxLength={250}
              autoFocus
              className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] text-[15px] text-[#1a1a1a] placeholder-[#999] outline-none focus:border-[#f48024] focus:ring-2 focus:ring-[#f48024]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Forum</label>
            <select
              value={forumId}
              onChange={(e) => setForumId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] text-[15px] text-[#1a1a1a] outline-none focus:border-[#f48024] focus:ring-2 focus:ring-[#f48024]/20 transition-all bg-white"
            >
              {forums.map((f) => (
                <option key={f.id} value={f.id}>
                  c/{f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a1a] mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe your question in detail..."
              rows={8}
              className="w-full px-3 py-2 rounded-lg border border-[#e5e5e5] text-[15px] text-[#1a1a1a] placeholder-[#999] outline-none focus:border-[#f48024] focus:ring-2 focus:ring-[#f48024]/20 transition-all resize-y"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#555] hover:bg-[#f5f5f5] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !body.trim() || !forumId || submitting}
              className="px-5 py-2 bg-[#f48024] text-white text-sm font-medium rounded-lg hover:bg-[#da6d1e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting...' : 'Post Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
