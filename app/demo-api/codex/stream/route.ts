import { NextRequest } from 'next/server';
import type {
  ApprovalMode,
  SandboxMode,
  ThreadEvent,
  ThreadItem,
  Usage,
  WebSearchMode,
} from '@openai/codex-sdk';
import {
  createInvestorCodex,
  getInvestorCodexApiKey,
  getInvestorThreadOptions,
  hasMcpConfig,
  traceFromThreadItem,
  type InvestorRunInput,
  type InvestorToolTrace,
} from '@/lib/investorCodex';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StreamRequestBody = {
  threadId?: string;
  prompt?: string;
  enableMcpServers?: boolean;
  model?: string;
  sandboxMode?: SandboxMode;
  approvalPolicy?: ApprovalMode;
  webSearchMode?: WebSearchMode;
};

type StreamStatePayload = {
  threadId: string | null;
  assistantText: string;
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  } | null;
  toolTraces: InvestorToolTrace[];
};

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseBody(body: unknown): StreamRequestBody {
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

function usageToClient(usage: Usage | null): StreamStatePayload['usage'] {
  if (!usage) {
    return null;
  }
  return {
    inputTokens: usage.input_tokens,
    cachedInputTokens: usage.cached_input_tokens,
    outputTokens: usage.output_tokens,
  };
}

export async function POST(request: NextRequest) {
  let input: InvestorRunInput;

  try {
    input = parseBody(await request.json());
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!input.prompt) {
    return new Response(JSON.stringify({ ok: false, error: '"prompt" is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const prompt = input.prompt;

  if (input.enableMcpServers && !hasMcpConfig()) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          'MCP servers enabled but no MCP config found. Set INVESTOR_CODEX_MCP_CONFIG_JSON in frontend-for-humans/.env and restart.',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const apiKey = getInvestorCodexApiKey();
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          'Missing API key. Set CODEX_API_KEY or OPENAI_API_KEY in frontend-for-humans/.env and restart the Next.js server.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
        );
      };

      const toolMap = new Map<string, InvestorToolTrace>();
      let assistantText = '';
      let threadId: string | null = input.threadId || null;
      let usage: Usage | null = null;

      const emitState = () => {
        send('state', {
          threadId,
          assistantText,
          usage: usageToClient(usage),
          toolTraces: Array.from(toolMap.values()),
        } satisfies StreamStatePayload);
      };

      const upsertTraceFromItem = (item: ThreadItem) => {
        const trace = traceFromThreadItem(item);
        if (!trace) {
          return;
        }
        const key = `${item.id}:${trace.kind}`;
        toolMap.set(key, trace);
      };

      const runOnce = async (resumeThreadId?: string) => {
        const codex = createInvestorCodex(input);
        const threadOptions = getInvestorThreadOptions(input);
        const thread = resumeThreadId
          ? codex.resumeThread(resumeThreadId, threadOptions)
          : codex.startThread(threadOptions);

        const { events } = await thread.runStreamed(prompt, { signal: request.signal });

        for await (const event of events as AsyncGenerator<ThreadEvent>) {
          if (event.type === 'thread.started') {
            threadId = event.thread_id;
            emitState();
            continue;
          }

          if (event.type === 'turn.completed') {
            usage = event.usage;
            emitState();
            continue;
          }

          if (
            event.type === 'item.started' ||
            event.type === 'item.updated' ||
            event.type === 'item.completed'
          ) {
            upsertTraceFromItem(event.item);
            if (event.item.type === 'agent_message') {
              assistantText = event.item.text;
            }
            emitState();
            continue;
          }

          if (event.type === 'turn.failed') {
            throw new Error(event.error.message);
          }
        }
      };

      try {
        await runOnce(input.threadId);
        send('done', {
          threadId,
          finalResponse: assistantText,
          usage: usageToClient(usage),
          toolTraces: Array.from(toolMap.values()),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown streaming error.';
        const staleThread =
          Boolean(input.threadId) &&
          /thread|resume|session|not found|unknown/i.test(message);

        if (staleThread) {
          try {
            threadId = null;
            assistantText = '';
            usage = null;
            toolMap.clear();
            await runOnce(undefined);
            send('done', {
              threadId,
              finalResponse: assistantText,
              usage: usageToClient(usage),
              toolTraces: Array.from(toolMap.values()),
            });
          } catch (retryError) {
            const retryMessage =
              retryError instanceof Error ? retryError.message : 'Unknown retry error.';
            send('error', { error: retryMessage });
          }
        } else if (request.signal.aborted) {
          send('error', { error: 'Stopped by user.' });
        } else {
          send('error', { error: message });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
