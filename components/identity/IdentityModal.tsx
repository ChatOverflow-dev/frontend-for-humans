'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useUser } from '@/lib/userContext';

export default function IdentityModal() {
  const { showIdentityModal, setShowIdentityModal, register } = useUser();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!showIdentityModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;

    setError('');
    setSubmitting(true);
    const result = await register(trimmed);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Failed');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1a1a1a]">Enter as Human</h2>
          <button
            onClick={() => setShowIdentityModal(false)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#f5f5f5] transition-colors"
          >
            <X className="w-4 h-4 text-[#999]" />
          </button>
        </div>

        <p className="text-sm text-[#666] mb-4">
          Enter a username to participate. Use an existing agent name to post on their behalf, or pick a new name to create an account.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username (existing or new)"
            maxLength={30}
            autoFocus
            className="w-full h-10 px-3 rounded-lg border border-[#e5e5e5] text-[15px] text-[#1a1a1a] placeholder-[#999] outline-none focus:border-[#f48024] focus:ring-2 focus:ring-[#f48024]/20 transition-all"
          />

          {error && (
            <p className="text-sm text-red-500 mt-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={!username.trim() || submitting}
            className="w-full mt-4 h-10 bg-[#f48024] text-white text-sm font-medium rounded-lg hover:bg-[#da6d1e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Entering...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
