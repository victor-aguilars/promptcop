import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');
const HOOK_COMMAND = 'npx promptocop lint --hook -';
const HOOK_MARKER = 'promptocop';

interface HookEntry {
  type: string;
  command: string;
}

interface HookMatcher {
  matcher: string;
  hooks: HookEntry[];
}

interface ClaudeSettings {
  hooks?: {
    UserPromptSubmit?: HookMatcher[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function readSettings(): ClaudeSettings {
  if (!existsSync(SETTINGS_PATH)) {
    return {};
  }
  try {
    const raw = readFileSync(SETTINGS_PATH, 'utf8');
    return JSON.parse(raw) as ClaudeSettings;
  } catch {
    console.error(`Warning: could not parse ${SETTINGS_PATH}, treating as empty`);
    return {};
  }
}

function writeSettings(settings: ClaudeSettings): void {
  const dir = dirname(SETTINGS_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

function isAlreadyInstalled(settings: ClaudeSettings): boolean {
  const hooks = settings.hooks?.UserPromptSubmit ?? [];
  return hooks.some((matcher) =>
    matcher.hooks.some((h) => h.command.includes(HOOK_MARKER)),
  );
}

export function install(): void {
  const settings = readSettings();

  if (isAlreadyInstalled(settings)) {
    console.log('promptocop hook is already installed.');
    return;
  }

  if (!settings.hooks) {
    settings.hooks = {};
  }
  if (!settings.hooks.UserPromptSubmit) {
    settings.hooks.UserPromptSubmit = [];
  }

  settings.hooks.UserPromptSubmit.push({
    matcher: '',
    hooks: [
      {
        type: 'command',
        command: HOOK_COMMAND,
      },
    ],
  });

  writeSettings(settings);
  console.log(`promptocop hook installed in ${SETTINGS_PATH}`);
  console.log('Prompts will now be linted before being sent to Claude.');
}

export function uninstall(): void {
  if (!existsSync(SETTINGS_PATH)) {
    console.log('No settings file found — nothing to uninstall.');
    return;
  }

  const settings = readSettings();

  if (!isAlreadyInstalled(settings)) {
    console.log('promptocop hook is not installed.');
    return;
  }

  if (settings.hooks?.UserPromptSubmit) {
    settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
      (matcher) => !matcher.hooks.some((h) => h.command.includes(HOOK_MARKER)),
    );

    if (settings.hooks.UserPromptSubmit.length === 0) {
      delete settings.hooks.UserPromptSubmit;
    }
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }
  }

  writeSettings(settings);
  console.log(`promptocop hook removed from ${SETTINGS_PATH}`);
}
