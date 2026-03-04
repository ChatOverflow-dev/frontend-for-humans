import { NextRequest } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FeedbackMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  usageLine?: string | null;
  toolTraces?: Array<{
    kind: string;
    name: string;
    status: string;
    details: string;
  }>;
};

type Diagnostics = {
  viewport?: { width: number; height: number };
  screen?: { width: number; height: number; colorDepth: number };
  devicePixelRatio?: number;
  orientation?: string | null;
  userAgent?: string;
  platform?: string;
  language?: string;
  languages?: string[];
  cookiesEnabled?: boolean;
  touchSupport?: boolean;
  maxTouchPoints?: number;
  hardwareConcurrency?: number | null;
  deviceMemory?: number | null;
  onLine?: boolean;
  connection?: { effectiveType?: string | null; downlink?: number | null; rtt?: number | null; saveData?: boolean } | null;
  url?: string;
  referrer?: string | null;
  iframeSrc?: string;
  timezone?: string;
  timestamp?: string;
  pageLoadedAt?: string | null;
  memory?: { jsHeapSizeLimit: number; totalJSHeapSize: number; usedJSHeapSize: number } | null;
  theme?: string;
  mcpEnabled?: boolean;
  isRunning?: boolean;
  sessionCount?: number;
  messageCount?: number;
  errorCount?: number;
  scrollPosition?: { x: number; y: number };
  clickTrail?: Array<{ t: string; x: number; y: number; tag: string; text: string }>;
  consoleErrors?: Array<{ t: string; type: string; message: string }>;
};

type FeedbackRequestBody = {
  description: string;
  contactEmail?: string;
  diagnostics?: Diagnostics;
  sessionData: {
    threadId: string;
    model: string;
    sessionTitle: string;
    messages: FeedbackMessage[];
  };
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDiagnosticsHtml(d: Diagnostics): string {
  const row = (label: string, value: string | number | boolean | null | undefined) =>
    value != null && value !== '' ? `<tr><td style="padding:2px 10px 2px 0;font-weight:600;white-space:nowrap">${label}</td><td style="font-family:monospace">${escapeHtml(String(value))}</td></tr>` : '';

  const v = d.viewport;
  const s = d.screen;
  const c = d.connection;
  const m = d.memory;

  return `
    <div style="margin:16px 0;padding:12px;background:#f5f8ff;border:1px solid #d0d8e8;border-radius:6px">
      <div style="font-size:12px;font-weight:600;color:#336;margin-bottom:8px">Device &amp; Environment</div>
      <table style="font-size:11px;color:#555;border-collapse:collapse;width:100%">
        ${row('URL', d.url)}
        ${row('Iframe', d.iframeSrc)}
        ${row('Referrer', d.referrer)}
        ${row('Viewport', v ? `${v.width} × ${v.height}` : null)}
        ${row('Screen', s ? `${s.width} × ${s.height} (${s.colorDepth}-bit)` : null)}
        ${row('DPR', d.devicePixelRatio)}
        ${row('Orientation', d.orientation)}
        ${row('User Agent', d.userAgent)}
        ${row('Platform', d.platform)}
        ${row('Language', d.language)}
        ${row('Languages', d.languages?.join(', '))}
        ${row('Touch', d.touchSupport ? `Yes (${d.maxTouchPoints} points)` : 'No')}
        ${row('CPU Cores', d.hardwareConcurrency)}
        ${row('Device Memory', d.deviceMemory ? `${d.deviceMemory} GB` : null)}
        ${row('Online', d.onLine)}
        ${row('Network', c ? `${c.effectiveType || '?'} · ${c.downlink ?? '?'} Mbps · ${c.rtt ?? '?'}ms RTT${c.saveData ? ' · Data Saver' : ''}` : null)}
        ${row('Timezone', d.timezone)}
        ${row('Page Loaded', d.pageLoadedAt)}
        ${row('Reported At', d.timestamp)}
        ${row('JS Heap', m ? `${(m.usedJSHeapSize / 1048576).toFixed(1)} / ${(m.totalJSHeapSize / 1048576).toFixed(1)} MB (limit ${(m.jsHeapSizeLimit / 1048576).toFixed(0)} MB)` : null)}
        ${row('Theme', d.theme)}
        ${row('MCP', d.mcpEnabled ? 'Enabled' : 'Disabled')}
        ${row('Agent Running', d.isRunning ? 'Yes' : 'No')}
        ${row('Sessions', d.sessionCount)}
        ${row('Messages', d.messageCount)}
        ${row('Errors', d.errorCount)}
        ${row('Cookies', d.cookiesEnabled)}
        ${row('Scroll', d.scrollPosition ? `${d.scrollPosition.x}, ${d.scrollPosition.y}` : null)}
      </table>
    </div>
    ${d.consoleErrors?.length ? `
      <div style="margin:12px 0;padding:12px;background:#fff5f5;border:1px solid #e8c8c8;border-radius:6px">
        <div style="font-size:12px;font-weight:600;color:#933;margin-bottom:8px">Console Errors (${d.consoleErrors.length})</div>
        ${d.consoleErrors.map((e) => `
          <div style="margin-bottom:4px;font-size:11px;font-family:monospace">
            <span style="color:#999">${escapeHtml(e.t.slice(11, 19))}</span>
            <span style="color:#c33;font-weight:600"> ${escapeHtml(e.type)}</span>
            ${escapeHtml(e.message)}
          </div>
        `).join('')}
      </div>` : ''}
    ${d.clickTrail?.length ? `
      <div style="margin:12px 0;padding:12px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px">
        <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:8px">Click Trail (last ${d.clickTrail.length})</div>
        <table style="font-size:10px;color:#666;border-collapse:collapse;width:100%;font-family:monospace">
          <tr style="font-weight:600;border-bottom:1px solid #ddd"><td style="padding:2px 6px">Time</td><td>Position</td><td>Element</td><td>Text</td></tr>
          ${d.clickTrail.map((c) => `
            <tr><td style="padding:2px 6px;color:#999">${escapeHtml(c.t.slice(11, 19))}</td><td>${c.x},${c.y}</td><td>${escapeHtml(c.tag)}</td><td>${escapeHtml(c.text.slice(0, 30))}</td></tr>
          `).join('')}
        </table>
      </div>` : ''}`;
}

function formatEmailHtml(body: FeedbackRequestBody): string {
  const { description, contactEmail, diagnostics, sessionData } = body;
  const { threadId, model, sessionTitle, messages } = sessionData;

  let messagesHtml = '';
  for (const msg of messages) {
    const roleColor =
      msg.role === 'user' ? '#1f7a53' : msg.role === 'system' ? '#888' : '#333';
    const roleLabel = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);

    messagesHtml += `
      <div style="margin-bottom:12px;padding:10px;border:1px solid #e0e0e0;border-radius:6px;background:${msg.role === 'user' ? '#f0faf5' : '#fafafa'}">
        <div style="font-size:11px;font-weight:600;color:${roleColor};margin-bottom:4px">${roleLabel}</div>
        <pre style="white-space:pre-wrap;word-break:break-word;font-size:13px;margin:0;font-family:monospace">${escapeHtml(msg.text)}</pre>
        ${msg.usageLine ? `<div style="font-size:11px;color:#888;margin-top:6px">${escapeHtml(msg.usageLine)}</div>` : ''}
        ${
          msg.toolTraces?.length
            ? `<div style="margin-top:8px;padding:8px;background:#f5f5f5;border-radius:4px;border:1px solid #eee">
                <div style="font-size:11px;font-weight:600;color:#555;margin-bottom:6px">Tool Traces (${msg.toolTraces.length})</div>
                ${msg.toolTraces
                  .map(
                    (t) => `
                  <div style="margin-bottom:6px;padding:6px;background:white;border:1px solid #e8e8e8;border-radius:4px">
                    <div style="font-size:10px;color:#666">${escapeHtml(t.kind)} · ${escapeHtml(t.name)} · ${escapeHtml(t.status)}</div>
                    <pre style="white-space:pre-wrap;word-break:break-word;font-size:10px;margin:4px 0 0;font-family:monospace;color:#444;max-height:200px;overflow:auto">${escapeHtml(t.details.slice(0, 2000))}</pre>
                  </div>`,
                  )
                  .join('')}
              </div>`
            : ''
        }
      </div>`;
  }

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:700px;margin:0 auto">
      <h2 style="color:#1a1a1a;border-bottom:2px solid #f48024;padding-bottom:8px">Issue Report — ChatOverflow Demo</h2>

      <div style="margin:16px 0;padding:12px;background:#fff8f0;border:1px solid #f0d8b8;border-radius:6px">
        <div style="font-size:12px;font-weight:600;color:#9a4f00;margin-bottom:4px">Description</div>
        <p style="margin:0;font-size:14px;color:#333">${escapeHtml(description)}</p>
      </div>

      ${contactEmail ? `<p style="font-size:13px;color:#555"><strong>Contact:</strong> <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a></p>` : ''}

      <table style="font-size:12px;color:#555;margin:12px 0;border-collapse:collapse">
        <tr><td style="padding:2px 12px 2px 0;font-weight:600">Session</td><td>${escapeHtml(sessionTitle)}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;font-weight:600">Thread ID</td><td style="font-family:monospace">${escapeHtml(threadId || '(none)')}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;font-weight:600">Model</td><td>${escapeHtml(model)}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;font-weight:600">Messages</td><td>${messages.length}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;font-weight:600">Reported</td><td>${new Date().toISOString()}</td></tr>
      </table>

      ${diagnostics ? formatDiagnosticsHtml(diagnostics) : ''}

      <h3 style="color:#1a1a1a;margin-top:24px">Chat Transcript</h3>
      ${messagesHtml}
    </div>`;
}

export async function POST(request: NextRequest) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailTo = process.env.FEEDBACK_EMAIL_TO;

  if (!resendApiKey || !emailTo) {
    return Response.json(
      { ok: false, error: 'Feedback email not configured. Please contact the site admin.' },
      { status: 500 },
    );
  }

  let body: FeedbackRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.description?.trim()) {
    return Response.json({ ok: false, error: 'Description is required.' }, { status: 400 });
  }

  if (!body.sessionData?.messages) {
    return Response.json({ ok: false, error: 'Session data is required.' }, { status: 400 });
  }

  try {
    const resend = new Resend(resendApiKey);
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const fromAddress = process.env.FEEDBACK_EMAIL_FROM || 'ChatOverflow Demo <onboarding@resend.dev>';

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: emailTo.split(',').map((e) => e.trim()),
      subject: `[ChatOverflow Demo] Issue Report — ${timestamp}`,
      html: formatEmailHtml(body),
    });

    if (error) {
      console.error('[feedback] Resend error:', error);
      return Response.json({ ok: false, error: 'Failed to send report. Please try again.' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email.';
    console.error('[feedback] Email send failed:', message);
    return Response.json({ ok: false, error: 'Failed to send report. Please try again.' }, { status: 500 });
  }
}
