import { NextRequest, NextResponse } from 'next/server';
import type { ApprovalMode, SandboxMode, WebSearchMode } from '@openai/codex-sdk';
import { hasInvestorCodexApiKey, runInvestorCodex } from '@/lib/investorCodex';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type InvestorRequestBody = {
  threadId?: string;
  prompt?: string;
  enableMcpServers?: boolean;
  model?: string;
  sandboxMode?: SandboxMode;
  approvalPolicy?: ApprovalMode;
  webSearchMode?: WebSearchMode;
};

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseBody(body: unknown): InvestorRequestBody {
  if (typeof body !== 'object' || body === null) {
    return {};
  }

  const b = body as Record<string, unknown>;

  return {
    threadId: asTrimmedString(b.threadId),
    prompt: asTrimmedString(b.prompt),
    enableMcpServers: b.enableMcpServers === true,
    model: asTrimmedString(b.model),
    sandboxMode: b.sandboxMode as SandboxMode | undefined,
    approvalPolicy: b.approvalPolicy as ApprovalMode | undefined,
    webSearchMode: b.webSearchMode as WebSearchMode | undefined,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/investor-api/codex',
    hasCodexApiKey: hasInvestorCodexApiKey(),
    workingDirectory: process.env.INVESTOR_CODEX_WORKDIR || process.cwd(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const input = parseBody(await request.json());

    if (!input.prompt) {
      return NextResponse.json(
        { error: '"prompt" is required.' },
        { status: 400 },
      );
    }

    const result = await runInvestorCodex(input);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
