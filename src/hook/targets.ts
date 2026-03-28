import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const HOOK_COMMAND = 'npx promptocop lint --hook -';
const HOOK_MARKER = 'promptocop';

export interface HookTarget {
  name: string;
  configPath: string;
  readConfig(): Record<string, unknown>;
  writeConfig(config: Record<string, unknown>): void;
  isInstalled(config: Record<string, unknown>): boolean;
  addEntry(config: Record<string, unknown>): Record<string, unknown>;
  removeEntry(config: Record<string, unknown>): Record<string, unknown>;
}

function readJsonFile(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  } catch {
    console.error(`Warning: could not parse ${path}, treating as empty`);
    return {};
  }
}

function writeJsonFile(path: string, data: Record<string, unknown>): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// --- Claude Code target ---

interface ClaudeHookEntry {
  type: string;
  command: string;
}
interface ClaudeHookMatcher {
  matcher: string;
  hooks: ClaudeHookEntry[];
}
interface ClaudeConfig extends Record<string, unknown> {
  hooks?: {
    UserPromptSubmit?: ClaudeHookMatcher[];
    [key: string]: unknown;
  };
}

export function createClaudeTarget(): HookTarget {
  const configPath = join(homedir(), '.claude', 'settings.json');

  return {
    name: 'claude',
    configPath,
    readConfig: () => readJsonFile(configPath),
    writeConfig: (config) => writeJsonFile(configPath, config),

    isInstalled(config) {
      const c = config as ClaudeConfig;
      return (c.hooks?.UserPromptSubmit ?? []).some((m) =>
        m.hooks.some((h) => h.command.includes(HOOK_MARKER)),
      );
    },

    addEntry(config) {
      const c = { ...config } as ClaudeConfig;
      if (!c.hooks) c.hooks = {};
      if (!c.hooks.UserPromptSubmit) c.hooks.UserPromptSubmit = [];
      c.hooks.UserPromptSubmit.push({
        matcher: '',
        hooks: [{ type: 'command', command: HOOK_COMMAND }],
      });
      return c as Record<string, unknown>;
    },

    removeEntry(config) {
      const c = { ...config } as ClaudeConfig;
      if (c.hooks?.UserPromptSubmit) {
        c.hooks.UserPromptSubmit = c.hooks.UserPromptSubmit.filter(
          (m) => !m.hooks.some((h) => h.command.includes(HOOK_MARKER)),
        );
        if (c.hooks.UserPromptSubmit.length === 0) delete c.hooks.UserPromptSubmit;
        if (Object.keys(c.hooks).length === 0) delete c.hooks;
      }
      return c as Record<string, unknown>;
    },
  };
}

// --- Cursor target ---

interface CursorHookEntry {
  command: string;
  type: string;
}
interface CursorConfig extends Record<string, unknown> {
  version?: number;
  hooks?: {
    beforeSubmitPrompt?: CursorHookEntry[];
    [key: string]: unknown;
  };
}

export function createCursorTarget(): HookTarget {
  const configPath = join(homedir(), '.cursor', 'hooks.json');

  return {
    name: 'cursor',
    configPath,
    readConfig: () => readJsonFile(configPath),
    writeConfig: (config) => writeJsonFile(configPath, config),

    isInstalled(config) {
      const c = config as CursorConfig;
      return (c.hooks?.beforeSubmitPrompt ?? []).some((h) =>
        h.command.includes(HOOK_MARKER),
      );
    },

    addEntry(config) {
      const c = { ...config } as CursorConfig;
      c.version = 1;
      if (!c.hooks) c.hooks = {};
      if (!c.hooks.beforeSubmitPrompt) c.hooks.beforeSubmitPrompt = [];
      c.hooks.beforeSubmitPrompt.push({ command: HOOK_COMMAND, type: 'command' });
      return c as Record<string, unknown>;
    },

    removeEntry(config) {
      const c = { ...config } as CursorConfig;
      if (c.hooks?.beforeSubmitPrompt) {
        c.hooks.beforeSubmitPrompt = c.hooks.beforeSubmitPrompt.filter(
          (h) => !h.command.includes(HOOK_MARKER),
        );
        if (c.hooks.beforeSubmitPrompt.length === 0) delete c.hooks.beforeSubmitPrompt;
        if (Object.keys(c.hooks).length === 0) delete c.hooks;
      }
      return c as Record<string, unknown>;
    },
  };
}

// --- Registry ---

export function getTarget(name: string): HookTarget {
  switch (name) {
    case 'claude':
      return createClaudeTarget();
    case 'cursor':
      return createCursorTarget();
    default:
      throw new Error(`Unknown hook target: "${name}". Valid targets are: claude, cursor`);
  }
}
