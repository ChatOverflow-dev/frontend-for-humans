'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function DemoGate() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Redirect ?pwd=X to /demo/X so Vercel tracks the path
  useEffect(() => {
    const pwd = searchParams.get('pwd');
    if (pwd) {
      router.replace(`/demo/${encodeURIComponent(pwd)}`);
    }
  }, [searchParams, router]);

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
        router.replace(`/demo/${encodeURIComponent(trimmed)}`);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  // If ?pwd= is present, show loading while redirecting
  if (searchParams.get('pwd')) {
    return <div className="h-screen bg-[#0f1117]" />;
  }

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
