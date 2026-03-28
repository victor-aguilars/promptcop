import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock homedir() to point to a temp directory so tests never touch ~/.claude or ~/.cursor
let tempHome: string;

vi.mock('node:os', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:os')>();
  return {
    ...original,
    homedir: () => tempHome,
  };
});

// Import after mock is set up
const { install, uninstall } = await import('../install.js');

beforeEach(() => {
  tempHome = mkdtempSync(join(tmpdir(), 'promptocop-test-'));
});

afterEach(() => {
  rmSync(tempHome, { recursive: true, force: true });
  vi.resetModules();
});

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8'));
}

describe('install (claude)', () => {
  it('creates settings.json with correct structure', () => {
    install('claude');
    const settingsPath = join(tempHome, '.claude', 'settings.json');
    expect(existsSync(settingsPath)).toBe(true);
    const settings = readJson(settingsPath) as {
      hooks: {
        UserPromptSubmit: Array<{
          matcher: string;
          hooks: Array<{ type: string; command: string }>;
        }>;
      };
    };
    expect(settings.hooks.UserPromptSubmit).toHaveLength(1);
    expect(settings.hooks.UserPromptSubmit[0].matcher).toBe('');
    expect(settings.hooks.UserPromptSubmit[0].hooks[0].command).toContain('promptocop');
  });

  it('does not duplicate if already installed', () => {
    install('claude');
    install('claude');
    const settings = readJson(join(tempHome, '.claude', 'settings.json')) as {
      hooks: { UserPromptSubmit: unknown[] };
    };
    expect(settings.hooks.UserPromptSubmit).toHaveLength(1);
  });
});

describe('uninstall (claude)', () => {
  it('removes the hook entry and cleans up', () => {
    install('claude');
    uninstall('claude');
    const settingsPath = join(tempHome, '.claude', 'settings.json');
    const settings = readJson(settingsPath) as Record<string, unknown>;
    expect(settings.hooks).toBeUndefined();
  });

  it('prints nothing-to-uninstall when file does not exist', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    uninstall('claude');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('nothing to uninstall'));
    consoleSpy.mockRestore();
  });
});

describe('install (cursor)', () => {
  it('creates hooks.json with version: 1 and correct structure', () => {
    install('cursor');
    const hooksPath = join(tempHome, '.cursor', 'hooks.json');
    expect(existsSync(hooksPath)).toBe(true);
    const hooks = readJson(hooksPath) as {
      version: number;
      hooks: { beforeSubmitPrompt: Array<{ command: string; type: string }> };
    };
    expect(hooks.version).toBe(1);
    expect(hooks.hooks.beforeSubmitPrompt).toHaveLength(1);
    expect(hooks.hooks.beforeSubmitPrompt[0].command).toContain('promptocop');
    expect(hooks.hooks.beforeSubmitPrompt[0].type).toBe('command');
  });

  it('does not duplicate if already installed', () => {
    install('cursor');
    install('cursor');
    const hooks = readJson(join(tempHome, '.cursor', 'hooks.json')) as {
      hooks: { beforeSubmitPrompt: unknown[] };
    };
    expect(hooks.hooks.beforeSubmitPrompt).toHaveLength(1);
  });
});

describe('uninstall (cursor)', () => {
  it('removes the hook entry, preserves version field', () => {
    install('cursor');
    uninstall('cursor');
    const hooksPath = join(tempHome, '.cursor', 'hooks.json');
    const hooks = readJson(hooksPath) as { version?: number; hooks?: unknown };
    expect(hooks.hooks).toBeUndefined();
    expect(hooks.version).toBe(1);
  });
});

describe('getTarget error', () => {
  it('throws for unknown target name', async () => {
    const { getTarget } = await import('../targets.js');
    expect(() => getTarget('windsurf')).toThrow('Unknown hook target');
  });
});
