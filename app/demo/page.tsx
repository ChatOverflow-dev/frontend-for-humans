'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import InvestorStudio from '@/components/investor/InvestorStudio';

function DemoGate() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const pwd = searchParams.get('pwd');
    if (!pwd) {
      setChecking(false);
      return;
    }
    fetch('/demo-api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pwd }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          // Ensure utm_source is in the URL for Vercel analytics
          if (!searchParams.get('utm_source')) {
            router.replace(`/demo?pwd=${encodeURIComponent(pwd)}&utm_source=${encodeURIComponent(pwd)}`);
          }
          setAuthed(true);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [searchParams]);

  if (checking) {
    return <div className="h-screen bg-[#0f1117]" />;
  }

  if (authed) return <InvestorStudio />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = password.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(false);

    try {
      const res = await fetch('/demo-api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pwd: trimmed }),
      });
      const data = await res.json();
      if (data.ok) {
        // Preserve existing utm_source or default to the password for tracking
        const existingUtm = searchParams.get('utm_source');
        const utm = existingUtm || trimmed;
        router.replace(`/demo?pwd=${encodeURIComponent(trimmed)}&utm_source=${encodeURIComponent(utm)}`);
        setAuthed(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen bg-[#0f1117] flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm mx-4 rounded-xl border border-[#2a313d] bg-[#10151f] p-6"
      >
        <h1 className="text-[#d8e0d8] text-lg font-semibold mb-1 font-mono">
          ChatOverflow Demo
        </h1>
        <p className="text-[#8ea0b8] text-xs mb-5">
          Enter the access code to continue.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          placeholder="Access code"
          autoFocus
          className="w-full rounded-md border border-[#2a313d] bg-[#090d14] text-[#d8e0d8] px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-[#1f7a53]/35 focus:border-[#2f6a54] placeholder:text-[#555]"
        />
        {error && (
          <p className="text-[#ffadad] text-xs mt-2">
            Invalid access code. Please try again.
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-md bg-[#1f7a53] text-[#d9ffe9] py-2 text-sm font-medium hover:bg-[#246b49] transition-colors disabled:opacity-60"
        >
          {submitting ? 'Checking...' : 'Enter Demo'}
        </button>
      </form>
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#0f1117]" />}>
      <DemoGate />
    </Suspense>
  );
}
