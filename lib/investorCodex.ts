import fs from 'node:fs';
import { Codex } from '@openai/codex-sdk';
import type { ApprovalMode, SandboxMode, WebSearchMode } from '@openai/codex-sdk';
import type { ThreadItem } from '@openai/codex-sdk';

export type InvestorRunInput = {
  threadId?: string;
  prompt?: string;
  enableMcpServers?: boolean;
  model?: string;
  sandboxMode?: SandboxMode;
  approvalPolicy?: ApprovalMode;
  webSearchMode?: WebSearchMode;
};

type CommandExecutionResult = {
  command: string;
  status: 'in_progress' | 'completed' | 'failed';
  exitCode: number | null;
  output: string;
};

export type InvestorToolTrace = {
  kind: 'mcp_tool_call' | 'command_execution' | 'web_search';
  name: string;
  status: string;
  details: string;
};

export type InvestorRunOutput = {
  threadId: string | null;
  finalResponse: string;
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  } | null;
  commandExecutions: CommandExecutionResult[];
  toolTraces: InvestorToolTrace[];
};

export function getInvestorCodexApiKey(): string | undefined {
  return (
    process.env.CODEX_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.LLM_API_KEY ||
    process.env.llm_api_key
  );
}

export function hasInvestorCodexApiKey(): boolean {
  return Boolean(getInvestorCodexApiKey());
}

function getWorkingDirectory(): string {
  return process.env.INVESTOR_CODEX_WORKDIR || process.cwd();
}

function getAdditionalDirectories(): string[] {
  const raw = process.env.INVESTOR_CODEX_ADDITIONAL_DIRS;
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseJsonObjectEnv(name: string): Record<string, unknown> {
  const raw = process.env[name];
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {}
  return {};
}

function mergeObjects(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  Object.entries(override).forEach(([key, value]) => {
    const baseValue = result[key];
    if (
      typeof baseValue === 'object' &&
      baseValue !== null &&
      !Array.isArray(baseValue) &&
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      result[key] = mergeObjects(
        baseValue as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      result[key] = value;
    }
  });
  return result;
}

export function hasMcpConfig(): boolean {
  const mcpConfig = parseJsonObjectEnv('INVESTOR_CODEX_MCP_CONFIG_JSON');
  return Object.keys(mcpConfig).length > 0;
}

export function getInvestorCodexConfig(input: InvestorRunInput): Record<string, unknown> {
  const baseConfig = parseJsonObjectEnv('INVESTOR_CODEX_CONFIG_JSON');
  if (!input.enableMcpServers) {
    return baseConfig;
  }
  const mcpConfig = parseJsonObjectEnv('INVESTOR_CODEX_MCP_CONFIG_JSON');
  return mergeObjects(baseConfig, mcpConfig);
}

function buildInvestorCodexEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  Object.entries(process.env).forEach(([key, value]) => {
    if (typeof value === 'string') {
      env[key] = value;
    }
  });
  const codexHome = process.env.INVESTOR_CODEX_HOME || '/tmp/chatoverflow-investor-codex';
  try {
    fs.mkdirSync(codexHome, { recursive: true });
    env.CODEX_HOME = codexHome;
  } catch {
    // If directory creation fails, don't override CODEX_HOME.
  }
  return env;
}

export function createInvestorCodex(input: InvestorRunInput): Codex {
  const apiKey = getInvestorCodexApiKey();
  if (!apiKey) {
    throw new Error(
      'Missing API key. Set CODEX_API_KEY or OPENAI_API_KEY in frontend-for-humans/.env and restart the Next.js server.',
    );
  }

  return new Codex({
    apiKey,
    baseUrl: process.env.OPENAI_BASE_URL,
    env: buildInvestorCodexEnv(),
    config: getInvestorCodexConfig(input) as any,
  });
}

export function getInvestorThreadOptions(input: InvestorRunInput) {
  return {
    model: input.model,
    sandboxMode: input.sandboxMode || 'workspace-write',
    approvalPolicy: input.approvalPolicy || 'on-request',
    webSearchMode: input.webSearchMode || 'disabled',
    workingDirectory: getWorkingDirectory(),
    additionalDirectories: getAdditionalDirectories(),
    networkAccessEnabled: true,
    skipGitRepoCheck: true,
  };
}

function buildPrompt(input: InvestorRunInput): string {
  if (input.prompt && input.prompt.trim()) {
    return input.prompt.trim();
  }

  throw new Error('Prompt is required.');
}

export async function runInvestorCodex(input: InvestorRunInput): Promise<InvestorRunOutput> {
  const codex = createInvestorCodex(input);

  const threadOptions = getInvestorThreadOptions(input);
  const thread = input.threadId
    ? codex.resumeThread(input.threadId, threadOptions)
    : codex.startThread(threadOptions);

  const runResult = await thread.run(buildPrompt(input));

  const commandExecutions: CommandExecutionResult[] = runResult.items
    .filter((item) => item.type === 'command_execution')
    .map((item) => ({
      command: item.command,
      status: item.status,
      exitCode: typeof item.exit_code === 'number' ? item.exit_code : null,
      output: item.aggregated_output,
    }));

  const toolTraces = runResult.items
    .map((item) => traceFromThreadItem(item))
    .filter((item): item is InvestorToolTrace => item !== null);

  return {
    threadId: thread.id,
    finalResponse: runResult.finalResponse,
    usage: runResult.usage
      ? {
          inputTokens: runResult.usage.input_tokens,
          cachedInputTokens: runResult.usage.cached_input_tokens,
          outputTokens: runResult.usage.output_tokens,
        }
      : null,
    commandExecutions,
    toolTraces,
  };
}

export function traceFromThreadItem(item: ThreadItem): InvestorToolTrace | null {
  if (item.type === 'mcp_tool_call') {
    // Unwrap MCP content wrapper to avoid double-encoded JSON in traces
    let resultText = '';
    if (item.result) {
      const r = item.result as Record<string, unknown>;
      if (Array.isArray(r.content)) {
        const parts = (r.content as Array<{ type?: string; text?: string }>)
          .filter((b) => b.type === 'text' && typeof b.text === 'string')
          .map((b) => b.text);
        resultText = parts.length > 0 ? parts.join('\n').slice(0, 3000) : JSON.stringify(item.result).slice(0, 3000);
      } else {
        resultText = JSON.stringify(item.result).slice(0, 3000);
      }
    }
    const errorText = item.error?.message || '';
    return {
      kind: 'mcp_tool_call',
      name: `${item.server}/${item.tool}`,
      status: item.status,
      details: resultText || errorText || JSON.stringify(item.arguments).slice(0, 1000),
    };
  }

  if (item.type === 'command_execution') {
    return {
      kind: 'command_execution',
      name: item.command,
      status: item.status,
      details: item.aggregated_output.slice(0, 1500),
    };
  }

  if (item.type === 'web_search') {
    return {
      kind: 'web_search',
      name: item.query,
      status: 'completed',
      details: item.query,
    };
  }

  return null;
}
