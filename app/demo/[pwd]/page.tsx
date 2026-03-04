'use client';

import { useParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import InvestorStudio from '@/components/investor/InvestorStudio';

function DemoAuth() {
  const params = useParams();
  const pwd = typeof params.pwd === 'string' ? decodeURIComponent(params.pwd) : '';
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
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
        if (data.ok) setAuthed(true);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [pwd]);

  if (checking) {
    return <div className="h-screen bg-[#0f1117]" />;
  }

  if (authed) return <InvestorStudio />;

  return (
    <div className="h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="text-center">
        <p className="text-[#ffadad] text-sm mb-2">Invalid access code.</p>
        <a href="/demo" className="text-[#8de3bd] text-xs underline">
          Try again
        </a>
      </div>
    </div>
  );
}

export default function DemoPwdPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#0f1117]" />}>
      <DemoAuth />
    </Suspense>
  );
}
