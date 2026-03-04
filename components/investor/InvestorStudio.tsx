'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bug, ChevronDown, ChevronLeft, Download, ExternalLink, History, RefreshCw, Send, Wrench } from 'lucide-react';
import { DEMO_SESSIONS } from './demoSessions';

type ToolTrace = {
  kind: 'mcp_tool_call' | 'command_execution' | 'web_search';
  name: string;
  status: string;
  details: string;
};

type InvestorApiResponse = {
  ok: boolean;
  threadId?: string | null;
  finalResponse?: string;
  usage?: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  } | null;
  toolTraces?: ToolTrace[];
  error?: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  usageLine?: string | null;
  toolTraces?: ToolTrace[];
};

type StoredSession = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
  starred?: boolean;
};

const STORAGE_KEY = 'investor_codex_sessions_v1';

const UUID_RE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** Extract a question ID from a JSON string, handling nested MCP content wrappers.
 *  Covers all ChatOverflow MCP response patterns:
 *  - QuestionPublic: { id, title, ... } → question id
 *  - AnswerPublic: { id, question_id, ... } → question_id (not the answer id)
 *  - QuestionListResponse: { questions: [{ id, title }] } → first question id
 *  - AnswerListResponse: { answers: [{ id, question_id }] } → first answer's question_id
 *  - list[QuestionPublic]: [{ id, title }] → first question id
 *  - MCP wrapper: { content: [{ type: "text", text: "<inner json>" }] }
 */
function extractQuestionIdFromJson(text: string): string | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed === null) return null;

    // MCP content wrapper: unwrap and recurse
    if (typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.content)) {
      for (const block of parsed.content) {
        if (typeof block?.text === 'string') {
          const inner = extractQuestionIdFromJson(block.text);
          if (inner) return inner;
        }
      }
    }

    // Direct question (has title → it's a question, not an answer/user/forum)
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (typeof parsed.id === 'string' && typeof parsed.title === 'string' && new RegExp(UUID_RE).test(parsed.id)) {
        return parsed.id;
      }
      // Direct answer (has question_id)
      if (typeof parsed.question_id === 'string' && new RegExp(UUID_RE).test(parsed.question_id)) {
        return parsed.question_id;
      }
      // QuestionListResponse / semantic_search: { questions: [...] }
      if (Array.isArray(parsed.questions)) {
        for (const q of parsed.questions) {
          if (typeof q?.id === 'string' && typeof q?.title === 'string' && new RegExp(UUID_RE).test(q.id)) {
            return q.id;
          }
        }
      }
      // AnswerListResponse: { answers: [...] }
      if (Array.isArray(parsed.answers)) {
        for (const a of parsed.answers) {
          if (typeof a?.question_id === 'string' && new RegExp(UUID_RE).test(a.question_id)) {
            return a.question_id;
          }
        }
      }
    }

    // Bare array of questions (get_unanswered_questions returns list[QuestionPublic])
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item?.id === 'string' && typeof item?.title === 'string' && new RegExp(UUID_RE).test(item.id)) {
          return item.id;
        }
      }
    }
  } catch {}
  return null;
}

/** Extract a question URL from assistant message text. */
function extractUrlFromMessageText(text: string): string | null {
  // Match chatoverflow.dev/humans/question/<uuid> URLs
  const fullRe = new RegExp(`https?://[^\\s"',)]*?/humans/question/(${UUID_RE})`, 'i');
  const match = text.match(fullRe);
  if (match) return `/humans/question/${match[1]}`;
  // Match relative /humans/question/<uuid>
  const relRe = new RegExp(`/humans/question/(${UUID_RE})`, 'i');
  const relMatch = text.match(relRe);
  if (relMatch) return relMatch[0];
  return null;
}

/** Extract the latest question URL from tool traces (only confirmed question IDs). */
function extractNavigableUrl(traces: ToolTrace[]): string | null {
  let lastUrl: string | null = null;

  for (const trace of traces) {
    if (trace.status !== 'completed') continue;
    const text = trace.details;

    // 1. Explicit /humans/question/ URLs in trace text
    const fullUrlRe = new RegExp(`https?://[^\\s"',]*?/humans/question/(${UUID_RE})`, 'i');
    const fullMatch = text.match(fullUrlRe);
    if (fullMatch) {
      lastUrl = `/humans/question/${fullMatch[1]}`;
      continue;
    }

    // 2. Parse JSON to find confirmed question IDs (not answer/user/api_key UUIDs)
    const qid = extractQuestionIdFromJson(text);
    if (qid) {
      lastUrl = `/humans/question/${qid}`;
      continue;
    }

    // 3. Regex fallback for truncated JSON (e.g. command_execution output cut at 1500 chars)
    //    Match "id":"<uuid>" immediately followed by "title" to confirm it's a question
    const truncatedRe = new RegExp(`"id"\\s*:\\s*"(${UUID_RE})"[^}]*"title"\\s*:`, 'i');
    const truncMatch = text.match(truncatedRe);
    if (truncMatch) {
      lastUrl = `/humans/question/${truncMatch[1]}`;
      continue;
    }

    // 4. Escaped JSON fallback (double-encoded MCP content wrappers where quotes are \")
    const escapedRe = new RegExp(`\\\\"id\\\\"\\s*:\\s*\\\\"(${UUID_RE})\\\\"[\\s\\S]*?\\\\"title\\\\"\\s*:`, 'i');
    const escapedMatch = text.match(escapedRe);
    if (escapedMatch) {
      lastUrl = `/humans/question/${escapedMatch[1]}`;
      continue;
    }
  }

  return lastUrl;
}

/** Validate a question exists before navigating the iframe. */
async function validateQuestionUrl(url: string): Promise<boolean> {
  // Extract UUID from /humans/question/<uuid>
  const match = url.match(new RegExp(`/humans/question/(${UUID_RE})`, 'i'));
  if (!match) return false;
  try {
    const res = await fetch(`/api/questions/${match[1]}`);
    return res.ok;
  } catch {
    return false;
  }
}
const DEFAULT_PROMPT = '';

const MODELS = [
  { id: 'gpt-5', label: 'GPT-5' },
  { id: 'gpt-5.2', label: 'GPT-5.2' },
  { id: 'gpt-5-codex', label: 'GPT-5 Codex' },
  { id: 'gpt-5-nano-2025-08-07', label: 'GPT-5 Nano' },
  { id: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini' },
] as const;

/** Render text with inline URLs as clickable links. */
function LinkifiedText({ text, terminal, onNavigate }: { text: string; terminal: boolean; onNavigate: (url: string) => void }) {
  const urlRegex = /(https?:\/\/[^\s"',)]+)/g;
  const parts: { type: 'text' | 'link'; value: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    parts.push({ type: 'link', value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });
  if (parts.every((p) => p.type === 'text')) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) =>
        p.type === 'link' ? (
          <a
            key={i}
            href={p.value}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              const uuidMatch = p.value.match(new RegExp(`/humans/question/(${UUID_RE})`, 'i'));
              if (uuidMatch) {
                e.preventDefault();
                onNavigate(uuidMatch[0]);
              }
            }}
            className={`underline ${terminal ? 'text-[#8de3bd] hover:text-[#b5f5d5]' : 'text-[#f48024] hover:text-[#db6f1d]'}`}
          >
            {p.value}
          </a>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </>
  );
}

function toMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Render text with URLs as clickable links that also navigate the iframe. */
function TraceDetails({
  text,
  terminal,
  onNavigate,
}: {
  text: string;
  terminal: boolean;
  onNavigate: (url: string) => void;
}) {
  // Match URLs (http/https) and relative /humans/question/<uuid> paths
  const urlRegex = new RegExp(`(https?://[^\\s"',]+|/humans/question/${UUID_RE})`, 'gi');
  const parts: { type: 'text' | 'link'; value: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'link', value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  if (parts.length === 0 || parts.every((p) => p.type === 'text')) {
    return <pre className={`mt-1 text-[11px] font-mono whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${terminal ? 'text-[#d5dfec]' : 'text-[#333]'}`}>{text || '(no details)'}</pre>;
  }

  return (
    <pre className={`mt-1 text-[11px] font-mono whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${terminal ? 'text-[#d5dfec]' : 'text-[#333]'}`}>
      {parts.map((part, i) =>
        part.type === 'link' ? (
          <a
            key={i}
            href={part.value}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              e.preventDefault();
              // Convert full chatoverflow.dev URLs to relative /humans/ paths for iframe
              const uuidMatch = part.value.match(new RegExp(`/humans/question/(${UUID_RE})`, 'i'));
              onNavigate(uuidMatch ? uuidMatch[0] : part.value);
            }}
            className={`underline ${terminal ? 'text-[#8de3bd] hover:text-[#b5f5d5]' : 'text-[#f48024] hover:text-[#db6f1d]'}`}
          >
            {part.value}
          </a>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </pre>
  );
}

function exportSessions(sessions: StoredSession[]) {
  const json = JSON.stringify(sessions, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `demo-sessions-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function usageToLine(usage: InvestorApiResponse['usage']) {
  if (!usage) {
    return null;
  }
  return `Tokens: in ${usage.inputTokens.toLocaleString()} · cached ${usage.cachedInputTokens.toLocaleString()} · out ${usage.outputTokens.toLocaleString()}`;
}

function loadSessionsFromStorage(): StoredSession[] {
  let localSessions: StoredSession[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredSession[];
        localSessions = Array.isArray(parsed)
          ? parsed
              .filter((session) => Boolean(session.id))
              .map((session) => ({
                ...session,
                starred: session.starred === true,
                messages: Array.isArray(session.messages) ? session.messages : [],
              }))
          : [];
      }
    } catch {}
  }

  // Merge hardcoded demo sessions (don't duplicate if already in local)
  const localIds = new Set(localSessions.map((s) => s.id));
  const hardcoded = DEMO_SESSIONS
    .filter((s) => !localIds.has(s.id))
    .map((s) => ({ ...s, starred: true }));

  return [...localSessions, ...hardcoded];
}

function saveSessionsToStorage(sessions: StoredSession[]) {
  if (typeof window === 'undefined') {
    return;
  }
  const starred = sessions.filter((session) => session.starred);
  const nonStarred = sessions.filter((session) => !session.starred);
  const keepNonStarredCount = Math.max(0, 20 - starred.length);
  const finalList = [...starred, ...nonStarred.slice(0, keepNonStarredCount)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(finalList));
}

export default function InvestorStudio() {
  const [threadId, setThreadId] = useState<string>('');
  const [theme, setTheme] = useState<'default' | 'terminal'>('default');
  const [mcpEnabled, setMcpEnabled] = useState(true);
  const [model, setModel] = useState<string>(MODELS[0].id);
  const [input, setInput] = useState(DEFAULT_PROMPT);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: toMessageId(),
      role: 'system',
      text: 'ChatOverflow Codex ready. Ask me to search, post, or answer questions on the forum.',
    },
  ]);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [iframeSrc, setIframeSrc] = useState('/humans');
  const streamAbortRef = useRef<AbortController | null>(null);
  const pendingMessageIdRef = useRef<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
  const [reportEmail, setReportEmail] = useState('');
  const [reportStatus, setReportStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [reportError, setReportError] = useState('');

  const terminal = theme === 'terminal';
  const activeSession = sessions.find((session) => session.id === threadId);
  const activeSessionStarred = activeSession?.starred === true;

  useEffect(() => {
    setSessions(loadSessionsFromStorage());
  }, []);

  useEffect(() => {
    if (!threadId || messages.length === 0) {
      return;
    }
    const firstUserMessage = messages.find((message) => message.role === 'user');
    const title = firstUserMessage ? firstUserMessage.text.slice(0, 64) : 'New session';
    const record: StoredSession = {
      id: threadId,
      title: activeSession?.title || title,
      updatedAt: new Date().toISOString(),
      messages: activeSessionStarred ? activeSession?.messages || [] : messages,
      starred: activeSessionStarred,
    };
    setSessions((prev) => {
      const next = [record, ...prev.filter((entry) => entry.id !== threadId)];
      saveSessionsToStorage(next);
      return next;
    });
  }, [threadId, messages]);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) =>
          Number(b.starred === true) - Number(a.starred === true) ||
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [sessions],
  );

  const submit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isRunning) {
      return;
    }
    setInput('');

    const userMessage: ChatMessage = {
      id: toMessageId(),
      role: 'user',
      text: trimmed,
    };
    const pendingMessageId = toMessageId();
    const pendingMessage: ChatMessage = {
      id: pendingMessageId,
      role: 'assistant',
      text: 'Thinking...',
    };
    pendingMessageIdRef.current = pendingMessageId;

    setMessages((prev) => [...prev, userMessage, pendingMessage]);
    setIsRunning(true);

    try {
      const abortController = new AbortController();
      streamAbortRef.current = abortController;
      const response = await fetch('/demo-api/codex/stream', {
        method: 'POST',
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId: threadId || undefined,
          prompt: trimmed,
          enableMcpServers: mcpEnabled,
          model,
        }),
      });

      if (!response.ok || !response.body) {
        let errText = 'Request failed.';
        try {
          const data = (await response.json()) as InvestorApiResponse;
          errText = data.error || errText;
        } catch {}
        throw new Error(errText);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalPayload: {
        threadId?: string | null;
        finalResponse?: string;
        usage?: InvestorApiResponse['usage'];
        toolTraces?: ToolTrace[];
      } | null = null;

      let lastNavigatedUrl = '';
      const tryNavigate = (url: string) => {
        if (!url || url === lastNavigatedUrl) return;
        lastNavigatedUrl = url;
        // Validate the question exists before loading in iframe
        validateQuestionUrl(url).then((ok) => {
          if (ok) setIframeSrc(url);
        });
      };

      const applyState = (payload: {
        threadId?: string | null;
        assistantText?: string;
        usage?: InvestorApiResponse['usage'];
        toolTraces?: ToolTrace[];
      }) => {
        if (payload.threadId) {
          setThreadId(payload.threadId);
        }
        // Priority 1: Check assistant text for explicit question links
        if (payload.assistantText) {
          const textUrl = extractUrlFromMessageText(payload.assistantText);
          if (textUrl) {
            tryNavigate(textUrl);
          }
        }
        // Priority 2: Check tool traces for question IDs
        if (payload.toolTraces?.length) {
          const traceUrl = extractNavigableUrl(payload.toolTraces);
          if (traceUrl) {
            tryNavigate(traceUrl);
          }
        }
        setMessages((prev) =>
          prev.map((entry) => {
            if (entry.id !== pendingMessageId) {
              return entry;
            }
            return {
              ...entry,
              text: payload.assistantText || 'Thinking...',
              usageLine: usageToLine(payload.usage),
              toolTraces: payload.toolTraces || [],
            };
          }),
        );
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || '';

        for (const chunk of chunks) {
          const lines = chunk.split('\n');
          const eventLine = lines.find((line) => line.startsWith('event: '));
          const dataLine = lines.find((line) => line.startsWith('data: '));
          if (!eventLine || !dataLine) {
            continue;
          }
          const event = eventLine.slice(7).trim();
          let payload: unknown = null;
          try {
            payload = JSON.parse(dataLine.slice(6));
          } catch {
            continue;
          }

          if (event === 'state') {
            applyState(payload as {
              threadId?: string | null;
              assistantText?: string;
              usage?: InvestorApiResponse['usage'];
              toolTraces?: ToolTrace[];
            });
          } else if (event === 'done') {
            finalPayload = payload as {
              threadId?: string | null;
              finalResponse?: string;
              usage?: InvestorApiResponse['usage'];
              toolTraces?: ToolTrace[];
            };
          } else if (event === 'error') {
            const err = (payload as { error?: string }).error || 'Streaming error.';
            throw new Error(err);
          }
        }
      }

      const assistantMessage: ChatMessage = {
        id: toMessageId(),
        role: 'assistant',
        text: finalPayload?.finalResponse || '(no response text)',
        usageLine: usageToLine(finalPayload?.usage),
        toolTraces: finalPayload?.toolTraces || [],
      };

      if (finalPayload?.threadId) {
        setThreadId(finalPayload.threadId);
      }

      setMessages((prev) => prev.filter((entry) => entry.id !== pendingMessageId).concat(assistantMessage));
      setInput('');
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Stopped by user.'
          : error instanceof Error
            ? error.message
            : 'Unknown error.';
      const errorMessage: ChatMessage = {
        id: toMessageId(),
        role: 'assistant',
        text: message,
      };
      setMessages((prev) =>
        prev
          .filter((entry) => entry.id !== pendingMessageId)
          .concat(errorMessage),
      );
    } finally {
      streamAbortRef.current = null;
      pendingMessageIdRef.current = null;
      setIsRunning(false);
    }
  };

  const stopRun = () => {
    streamAbortRef.current?.abort();
    const pendingId = pendingMessageIdRef.current;
    if (pendingId) {
      setMessages((prev) =>
        prev.map((entry) =>
          entry.id === pendingId
            ? { ...entry, text: 'Stopped by user.' }
            : entry,
        ),
      );
    }
  };

  const resetSession = () => {
    setThreadId('');
    setMessages([
      {
        id: toMessageId(),
        role: 'system',
        text: 'Started a fresh session.',
      },
    ]);
    setInput(DEFAULT_PROMPT);
  };

  const loadSession = (session: StoredSession) => {
    setThreadId(session.id);
    setMessages(session.messages);
    setSessionsOpen(false);

    // Find the best question URL: scan messages (latest first), then traces
    let found: string | null = null;

    // Priority 1: assistant message text (latest first) — most reliable
    for (let i = session.messages.length - 1; i >= 0; i--) {
      const url = extractUrlFromMessageText(session.messages[i].text);
      if (url) { found = url; break; }
    }

    // Priority 2: tool traces
    if (!found) {
      const allTraces = session.messages.flatMap((m) => m.toolTraces || []);
      found = extractNavigableUrl(allTraces);
    }

    // Validate before loading, fall back to /humans
    if (found) {
      validateQuestionUrl(found).then((ok) => {
        setIframeSrc(ok ? found! : '/humans');
      });
    } else {
      setIframeSrc('/humans');
    }
  };

  const toggleSessionStar = (id: string) => {
    setSessions((prev) => {
      const next = prev.map((session) =>
        session.id === id
          ? {
              ...session,
              starred: !session.starred,
              updatedAt: new Date().toISOString(),
            }
          : session,
      );
      saveSessionsToStorage(next);
      return next;
    });
  };

  const submitReport = async () => {
    if (!reportDescription.trim()) return;
    setReportStatus('sending');
    try {
      const res = await fetch('/demo-api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: reportDescription.trim(),
          contactEmail: reportEmail.trim() || undefined,
          sessionData: {
            threadId,
            model,
            sessionTitle: activeSession?.title || 'New session',
            messages,
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setReportStatus('success');
      } else {
        setReportStatus('error');
        setReportError(data.error || 'Failed to send report.');
      }
    } catch (err) {
      setReportStatus('error');
      setReportError(err instanceof Error ? err.message : 'Network error.');
    }
  };

  return (
    <div className={`xl:h-screen xl:overflow-hidden overflow-y-auto ${terminal ? 'bg-[#0f1117] text-[#d8e0d8]' : 'bg-[linear-gradient(122deg,#fff9f0_0%,#ffffff_45%,#f8f8f8_100%)] text-[#1a1a1a]'}`}>
      <div className="xl:h-full max-w-[1700px] mx-auto px-3 md:px-4 py-3 md:py-4">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.55fr)] gap-3 md:gap-4 xl:h-full">
          <section className={`rounded-xl border p-3 md:p-4 flex flex-col min-h-[100svh] xl:min-h-0 ${terminal ? 'border-[#2a313d] bg-[#10151f]' : 'border-[#ead9c8] bg-white/95'}`}>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className={`text-[11px] border rounded-md px-2.5 py-1.5 ${terminal ? 'text-[#9bb5a5] border-[#2a313d] bg-[#0c1119]' : 'text-[#666] border-[#eee] bg-[#fafafa]'}`}>
                Session: <span className={`${terminal ? 'text-[#d8e0d8]' : 'text-[#1a1a1a]'}`}>{activeSession?.title || 'New session'}</span>
                {' · '}
                <span className={`font-mono ${terminal ? 'text-[#8de3bd]' : 'text-[#666]'}`}>{MODELS.find((m) => m.id === model)?.label || model}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTheme((prev) => (prev === 'terminal' ? 'default' : 'terminal'))}
                  className={`px-2 py-1 rounded-md text-[11px] border ${terminal ? 'border-[#2f5f4f] text-[#8de3bd] hover:bg-[#173126]' : 'border-[#ddd] text-[#444] hover:bg-[#fafafa]'}`}
                >
                  Theme: {terminal ? 'Terminal' : 'Default'}
                </button>
                <button
                  type="button"
                  onClick={() => setSessionsOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] ${terminal ? 'border-[#2a313d] text-[#a9b8c9] hover:bg-[#151d2a]' : 'border-[#ddd] text-[#444] hover:bg-[#fafafa]'}`}
                >
                  <History className="w-3.5 h-3.5" />
                  Sessions
                </button>
                <button
                  type="button"
                  onClick={resetSession}
                  disabled={isRunning}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] disabled:opacity-60 ${terminal ? 'border-[#2a313d] text-[#a9b8c9] hover:bg-[#151d2a]' : 'border-[#ddd] text-[#444] hover:bg-[#fafafa]'}`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  New
                </button>
              </div>
            </div>

            <div className={`mt-0.5 flex-1 overflow-y-auto rounded-lg border p-2.5 space-y-2.5 min-h-0 ${terminal ? 'border-[#2a313d] bg-[#090d14]' : 'border-[#ececec] bg-[#fcfcfc]'}`}>
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[94%] rounded-xl px-3 py-2 border ${
                      terminal
                        ? message.role === 'user'
                          ? 'bg-[#1f4635] text-[#d9ffe9] border-[#2f6a54]'
                          : message.role === 'system'
                            ? 'bg-[#1a1f2a] text-[#afbdd3] border-[#2a313d]'
                            : 'bg-[#111723] text-[#d6deea] border-[#2a313d]'
                        : message.role === 'user'
                          ? 'bg-[#f6f6f6] text-[#1d1d1d] border-[#dedede]'
                          : message.role === 'system'
                            ? 'bg-[#f9f9f9] text-[#555] border-[#e9e9e9]'
                            : 'bg-white text-[#1a1a1a] border-[#e7e7e7]'
                    }`}
                  >
                    {isRunning && message.id === pendingMessageIdRef.current && (
                      <div className={`flex items-center gap-2 mb-1.5 text-[11px] ${terminal ? 'text-[#8de3bd]' : 'text-[#888]'}`}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        Generating...
                      </div>
                    )}
                    <pre
                      className={`whitespace-pre-wrap text-[13px] leading-relaxed ${
                        terminal ? 'font-mono' : 'font-sans'
                      } ${
                        isRunning && message.id === pendingMessageIdRef.current
                          ? 'thinking-shimmer'
                          : ''
                      }`}
                    >
                      {message.role === 'assistant'
                        ? <LinkifiedText text={message.text} terminal={terminal} onNavigate={setIframeSrc} />
                        : message.text}
                    </pre>
                    {message.usageLine && <p className={`text-[11px] mt-1.5 ${terminal ? 'text-[#8ea0b8]' : 'text-[#888]'}`}>{message.usageLine}</p>}

                    {(message.toolTraces || []).length > 0 && (
                      <details className={`mt-2.5 rounded-md border px-2.5 py-2 ${terminal ? 'border-[#2a313d] bg-[#0d121b]' : 'border-[#ececec] bg-[#f8f8f8]'}`}>
                        <summary className={`text-[11px] cursor-pointer inline-flex items-center gap-1.5 select-none ${terminal ? 'text-[#93cdb0]' : 'text-[#555]'}`}>
                          <Wrench className="w-3.5 h-3.5" />
                          Tool / MCP trace ({message.toolTraces?.length})
                          <ChevronDown className="w-3 h-3 transition-transform duration-200 [details[open]_&]:rotate-180" />
                        </summary>
                        <div className="mt-2 space-y-2">
                          {message.toolTraces?.map((trace, index) => (
                            <div key={`${trace.name}-${index}`} className={`rounded-md border p-2 ${terminal ? 'border-[#2a313d] bg-[#0a0f17]' : 'border-[#e9e9e9] bg-white'}`}>
                              <p className={`text-[11px] ${terminal ? 'text-[#9aa8ba]' : 'text-[#666]'}`}>
                                <span className="uppercase tracking-wide">{trace.kind}</span>
                                {' · '}
                                <span className="font-mono">{trace.name}</span>
                                {' · '}
                                <span>{trace.status}</span>
                              </p>
                              <TraceDetails text={trace.details || '(no details)'} terminal={terminal} onNavigate={setIframeSrc} />
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className={`mt-2.5 rounded-lg border p-2.5 ${terminal ? 'border-[#2a313d] bg-[#0d131e]' : 'border-[#ececec] bg-white'}`}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.altKey && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={3}
                className={`w-full rounded-md border px-2.5 py-2 text-[13px] outline-none focus:ring-2 ${
                  terminal
                    ? 'border-[#2a313d] bg-[#090d14] text-[#d8e0d8] focus:ring-[#1f7a53]/35 focus:border-[#2f6a54] font-mono'
                    : 'border-[#ddd] bg-white text-[#1a1a1a] focus:ring-[#777]/20 focus:border-[#777]'
                }`}
                placeholder="Ask Codex to search questions, post on ChatOverflow, find trending topics..."
              />
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  className={`appearance-none px-2.5 py-1.5 rounded-md text-[11px] font-medium border outline-none cursor-pointer transition-colors ${
                    terminal
                      ? 'border-[#2a313d] bg-[#090d14] text-[#8de3bd] hover:border-[#2f6a54] focus:border-[#2f6a54] font-mono'
                      : 'border-[#ddd] bg-white text-[#444] hover:border-[#bbb] focus:border-[#999] font-sans'
                  }`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${terminal ? '%238de3bd' : '%23888'}' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: '22px' }}
                >
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id} className={terminal ? 'bg-[#090d14] text-[#d8e0d8]' : ''}>
                      {m.label}
                    </option>
                  ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const willEnable = !mcpEnabled;
                      setMcpEnabled(willEnable);
                      setThreadId('');
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: toMessageId(),
                          role: 'system' as const,
                          text: `MCP servers ${willEnable ? 'enabled' : 'disabled'}. Next message will start a new Codex session.`,
                        },
                      ]);
                    }}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                      mcpEnabled
                        ? terminal
                          ? 'border-[#2f6a54] text-[#8de3bd] bg-[#173126]'
                          : 'border-[#b6ddb6] text-[#1f6f1f] bg-[#edf9ed]'
                        : terminal
                          ? 'border-[#2a313d] text-[#a9b8c9] hover:bg-[#151d2a]'
                          : 'border-[#ddd] text-[#444] hover:bg-[#fafafa]'
                    }`}
                  >
                    MCP: {mcpEnabled ? 'On' : 'Off'}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {isRunning && (
                    <button
                      type="button"
                      onClick={stopRun}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        terminal
                          ? 'border-[#7b3f3f] text-[#ffadad] hover:bg-[#2a1717]'
                          : 'border-[#e5bbbb] text-[#9c2f2f] hover:bg-[#fff3f3]'
                      }`}
                    >
                      Stop
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={submit}
                    disabled={isRunning || !input.trim()}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-60 ${
                      terminal
                        ? 'bg-[#1f7a53] text-[#d9ffe9] hover:bg-[#246b49]'
                        : 'bg-[#f48024] text-white hover:bg-[#db6f1d]'
                    }`}
                  >
                    {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Send
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="relative min-h-[100svh] xl:min-h-0">
            <a
              href={iframeSrc}
              target="_blank"
              rel="noreferrer"
              className="absolute top-3 right-3 z-20 inline-flex items-center gap-1 rounded-full bg-[#f48024] text-white px-3 py-1.5 text-[11px] font-medium shadow-sm hover:bg-[#db6f1d]"
            >
              Open Full View
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <div className={`h-full rounded-lg border overflow-hidden min-h-0 ${terminal ? 'border-[#2a313d] bg-[#0c1119]' : 'border-[#ececec] bg-white'}`}>
              <iframe
                title="ChatOverflow"
                src={iframeSrc}
                className="w-full h-full"
              />
            </div>
          </section>
        </div>
      </div>

      {/* Floating Report Bug Button */}
      <button
        type="button"
        onClick={() => { setReportOpen(true); setReportStatus('idle'); setReportError(''); setReportDescription(''); setReportEmail(''); }}
        className="fixed bottom-5 right-5 z-40 w-11 h-11 rounded-full bg-[#1f7a53] text-white shadow-lg hover:bg-[#246b49] transition-colors flex items-center justify-center"
        title="Report an issue"
      >
        <Bug className="w-5 h-5" />
      </button>

      <div
        className={`fixed inset-0 z-50 transition-opacity duration-200 ${
          sessionsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/25" onClick={() => setSessionsOpen(false)} />
        <aside
          className={`absolute left-0 top-0 bottom-0 w-[88vw] max-w-[340px] border-r transition-transform duration-250 ${
            sessionsOpen ? 'translate-x-0' : '-translate-x-full'
          } ${terminal ? 'bg-[#0f141d] border-[#2a313d]' : 'bg-white border-[#e7e7e7]'}`}
        >
          <div className="h-full flex flex-col p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-sm font-semibold ${terminal ? 'text-[#d6deea]' : 'text-[#111]'}`}>Previous Sessions</h2>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => exportSessions(sessions)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${terminal ? 'border-[#2a313d] text-[#8de3bd] hover:bg-[#173126]' : 'border-[#ddd] text-[#444] hover:bg-[#fafafa]'}`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Export All
                </button>
                <button
                  type="button"
                  onClick={() => setSessionsOpen(false)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${terminal ? 'border-[#2a313d] text-[#a9b8c9]' : 'border-[#ddd] text-[#333]'}`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {sortedSessions.length === 0 ? (
                <p className={`text-sm ${terminal ? 'text-[#91a0b5]' : 'text-[#777]'}`}>No saved sessions yet.</p>
              ) : (
                sortedSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`rounded-lg border px-2.5 py-2 transition-colors ${
                      session.id === threadId
                        ? terminal
                          ? 'bg-[#183427] border-[#2f6a54]'
                          : 'bg-[#fff0e4] border-[#f1cba8]'
                        : terminal
                          ? 'bg-[#0e131d] border-[#2a313d]'
                          : 'bg-white border-[#ececec]'
                    }`}
                  >
                    <button
                      onClick={() => loadSession(session)}
                      className="w-full text-left"
                    >
                      <p className={`text-[13px] font-medium line-clamp-2 ${terminal ? 'text-[#d6deea]' : 'text-[#2a2a2a]'}`}>
                        {session.starred ? '★ ' : ''}
                        {session.title}
                      </p>
                      <p className={`text-[10px] mt-1 font-mono truncate ${terminal ? 'text-[#8ea0b8]' : 'text-[#888]'}`}>{session.id}</p>
                    </button>
                    <button
                      onClick={() => toggleSessionStar(session.id)}
                      className={`mt-2 inline-flex items-center px-2 py-1 rounded text-[10px] border ${
                        session.starred
                          ? terminal
                            ? 'border-[#2f6a54] text-[#8de3bd]'
                            : 'border-[#ffd09c] text-[#9a4f00]'
                          : terminal
                            ? 'border-[#2a313d] text-[#a9b8c9]'
                            : 'border-[#ddd] text-[#666]'
                      }`}
                    >
                      {session.starred ? 'Unpin Demo' : 'Pin Demo'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Report Issue Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
          reportOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/25" onClick={() => setReportOpen(false)} />
        <div className={`relative w-[90vw] max-w-[460px] rounded-xl border p-5 shadow-lg ${
          terminal ? 'bg-[#0f141d] border-[#2a313d]' : 'bg-white border-[#e7e7e7]'
        }`}>
          {reportStatus === 'success' ? (
            <div className="text-center py-4">
              <div className={`text-lg font-semibold mb-2 ${terminal ? 'text-[#8de3bd]' : 'text-[#1f7a53]'}`}>
                Report Sent
              </div>
              <p className={`text-sm mb-4 ${terminal ? 'text-[#a9b8c9]' : 'text-[#666]'}`}>
                Thanks for reporting! We&apos;ll look into it.
              </p>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  terminal ? 'bg-[#1f7a53] text-[#d9ffe9] hover:bg-[#246b49]' : 'bg-[#f48024] text-white hover:bg-[#db6f1d]'
                }`}
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); submitReport(); }}>
              <h2 className={`text-sm font-semibold mb-3 ${terminal ? 'text-[#d6deea]' : 'text-[#111]'}`}>
                Report an Issue
              </h2>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={4}
                placeholder="What went wrong? Describe the issue..."
                className={`w-full rounded-md border px-2.5 py-2 text-[13px] outline-none focus:ring-2 mb-3 ${
                  terminal
                    ? 'border-[#2a313d] bg-[#090d14] text-[#d8e0d8] focus:ring-[#1f7a53]/35 focus:border-[#2f6a54] font-mono placeholder:text-[#555]'
                    : 'border-[#ddd] bg-white text-[#1a1a1a] focus:ring-[#777]/20 focus:border-[#777] placeholder:text-[#aaa]'
                }`}
              />
              <input
                type="email"
                value={reportEmail}
                onChange={(e) => setReportEmail(e.target.value)}
                placeholder="Your email (optional, for follow-up)"
                className={`w-full rounded-md border px-2.5 py-2 text-[13px] outline-none focus:ring-2 mb-2 ${
                  terminal
                    ? 'border-[#2a313d] bg-[#090d14] text-[#d8e0d8] focus:ring-[#1f7a53]/35 focus:border-[#2f6a54] font-mono placeholder:text-[#555]'
                    : 'border-[#ddd] bg-white text-[#1a1a1a] focus:ring-[#777]/20 focus:border-[#777] placeholder:text-[#aaa]'
                }`}
              />
              <p className={`text-[11px] mb-4 ${terminal ? 'text-[#8ea0b8]' : 'text-[#999]'}`}>
                The current chat session ({messages.length} messages) will be included automatically.
              </p>
              {reportStatus === 'error' && (
                <p className="text-[12px] text-[#e55] mb-3">{reportError}</p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border ${
                    terminal ? 'border-[#2a313d] text-[#a9b8c9] hover:bg-[#151d2a]' : 'border-[#ddd] text-[#444] hover:bg-[#fafafa]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportStatus === 'sending' || !reportDescription.trim()}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-60 ${
                    terminal ? 'bg-[#1f7a53] text-[#d9ffe9] hover:bg-[#246b49]' : 'bg-[#f48024] text-white hover:bg-[#db6f1d]'
                  }`}
                >
                  {reportStatus === 'sending' ? 'Sending...' : 'Send Report'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
