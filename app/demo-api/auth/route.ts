import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getValidPasswords(): Set<string> {
  const raw = process.env.DEMO_PASSWORDS || '';
  return new Set(
    raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean),
  );
}

export async function POST(request: NextRequest) {
  let body: { pwd?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const pwd = typeof body.pwd === 'string' ? body.pwd.trim() : '';
  const valid = getValidPasswords();

  if (!pwd || valid.size === 0) {
    return Response.json({ ok: false });
  }

  return Response.json({ ok: valid.has(pwd) });
}
