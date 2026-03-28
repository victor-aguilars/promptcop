import { describe, it, expect } from 'vitest';
import { createClaudeTarget, createCursorTarget, getTarget } from '../targets.js';

// --- Claude Code target ---

describe('createClaudeTarget', () => {
  const target = createClaudeTarget();

  it('has correct name and configPath', () => {
    expect(target.name).toBe('claude');
    expect(target.configPath).toContain('.claude');
    expect(target.configPath).toContain('settings.json');
  });

  describe('isInstalled', () => {
    it('returns false on empty config', () => {
      expect(target.isInstalled({})).toBe(false);
    });

    it('returns false when hooks key is absent', () => {
      expect(target.isInstalled({ other: true })).toBe(false);
    });

    it('returns true when promptocop command is present', () => {
      const config = {
        hooks: {
          UserPromptSubmit: [
            { matcher: '', hooks: [{ type: 'command', command: 'npx promptocop lint --hook -' }] },
          ],
        },
      };
      expect(target.isInstalled(config)).toBe(true);
    });

    it('returns false when a different command is present', () => {
      const config = {
        hooks: {
          UserPromptSubmit: [
            { matcher: '', hooks: [{ type: 'command', command: 'npx other-tool lint -' }] },
          ],
        },
      };
      expect(target.isInstalled(config)).toBe(false);
    });
  });

  describe('addEntry', () => {
    it('adds to empty config', () => {
      const result = target.addEntry({}) as {
        hooks: { UserPromptSubmit: Array<{ matcher: string; hooks: Array<{ type: string; command: string }> }> };
      };
      expect(result.hooks.UserPromptSubmit).toHaveLength(1);
      expect(result.hooks.UserPromptSubmit[0].matcher).toBe('');
      expect(result.hooks.UserPromptSubmit[0].hooks[0].type).toBe('command');
      expect(result.hooks.UserPromptSubmit[0].hooks[0].command).toContain('promptocop');
    });

    it('appends to existing UserPromptSubmit array', () => {
      const existing = {
        hooks: {
          UserPromptSubmit: [
            { matcher: 'other', hooks: [{ type: 'command', command: 'other-hook' }] },
          ],
        },
      };
      const result = target.addEntry(existing) as {
        hooks: { UserPromptSubmit: unknown[] };
      };
      expect(result.hooks.UserPromptSubmit).toHaveLength(2);
    });

    it('preserves other settings keys', () => {
      const config = { someSetting: true };
      const result = target.addEntry(config) as Record<string, unknown>;
      expect(result.someSetting).toBe(true);
    });
  });

  describe('removeEntry', () => {
    it('removes the promptocop entry', () => {
      const config = {
        hooks: {
          UserPromptSubmit: [
            { matcher: '', hooks: [{ type: 'command', command: 'npx promptocop lint --hook -' }] },
          ],
        },
      };
      const result = target.removeEntry(config) as Record<string, unknown>;
      expect(result.hooks).toBeUndefined();
    });

    it('cleans up empty UserPromptSubmit array', () => {
      const config = {
        hooks: {
          UserPromptSubmit: [
            { matcher: '', hooks: [{ type: 'command', command: 'npx promptocop lint --hook -' }] },
          ],
        },
      };
      const result = target.removeEntry(config) as { hooks?: { UserPromptSubmit?: unknown[] } };
      expect(result.hooks?.UserPromptSubmit).toBeUndefined();
    });

    it('keeps non-promptocop entries', () => {
      const config = {
        hooks: {
          UserPromptSubmit: [
            { matcher: 'other', hooks: [{ type: 'command', command: 'other-hook' }] },
            { matcher: '', hooks: [{ type: 'command', command: 'npx promptocop lint --hook -' }] },
          ],
        },
      };
      const result = target.removeEntry(config) as {
        hooks: { UserPromptSubmit: unknown[] };
      };
      expect(result.hooks.UserPromptSubmit).toHaveLength(1);
    });

    it('preserves other hooks keys during cleanup', () => {
      const config = {
        hooks: {
          SomeOtherHook: [{ stuff: true }],
          UserPromptSubmit: [
            { matcher: '', hooks: [{ type: 'command', command: 'npx promptocop lint --hook -' }] },
          ],
        },
      };
      const result = target.removeEntry(config) as {
        hooks: Record<string, unknown>;
      };
      expect(result.hooks).toBeDefined();
      expect(result.hooks.SomeOtherHook).toBeDefined();
    });
  });
});

// --- Cursor target ---

describe('createCursorTarget', () => {
  const target = createCursorTarget();

  it('has correct name and configPath', () => {
    expect(target.name).toBe('cursor');
    expect(target.configPath).toContain('.cursor');
    expect(target.configPath).toContain('hooks.json');
  });

  describe('isInstalled', () => {
    it('returns false on empty config', () => {
      expect(target.isInstalled({})).toBe(false);
    });

    it('returns true when promptocop command is present', () => {
      const config = {
        version: 1,
        hooks: {
          beforeSubmitPrompt: [{ command: 'npx promptocop lint --hook -', type: 'command' }],
        },
      };
      expect(target.isInstalled(config)).toBe(true);
    });

    it('returns false when a different command is present', () => {
      const config = {
        version: 1,
        hooks: {
          beforeSubmitPrompt: [{ command: 'npx other-tool', type: 'command' }],
        },
      };
      expect(target.isInstalled(config)).toBe(false);
    });
  });

  describe('addEntry', () => {
    it('adds to empty config with version: 1', () => {
      const result = target.addEntry({}) as {
        version: number;
        hooks: { beforeSubmitPrompt: Array<{ command: string; type: string }> };
      };
      expect(result.version).toBe(1);
      expect(result.hooks.beforeSubmitPrompt).toHaveLength(1);
      expect(result.hooks.beforeSubmitPrompt[0].type).toBe('command');
      expect(result.hooks.beforeSubmitPrompt[0].command).toContain('promptocop');
    });

    it('always sets version: 1', () => {
      const result = target.addEntry({ version: 2 }) as { version: number };
      expect(result.version).toBe(1);
    });

    it('appends to existing beforeSubmitPrompt array', () => {
      const existing = {
        version: 1,
        hooks: {
          beforeSubmitPrompt: [{ command: 'other-hook', type: 'command' }],
        },
      };
      const result = target.addEntry(existing) as {
        hooks: { beforeSubmitPrompt: unknown[] };
      };
      expect(result.hooks.beforeSubmitPrompt).toHaveLength(2);
    });
  });

  describe('removeEntry', () => {
    it('removes the promptocop entry and cleans up empty hooks', () => {
      const config = {
        version: 1,
        hooks: {
          beforeSubmitPrompt: [{ command: 'npx promptocop lint --hook -', type: 'command' }],
        },
      };
      const result = target.removeEntry(config) as { version?: number; hooks?: unknown };
      // hooks key removed, but version should remain
      expect(result.hooks).toBeUndefined();
      expect(result.version).toBe(1);
    });

    it('keeps non-promptocop entries', () => {
      const config = {
        version: 1,
        hooks: {
          beforeSubmitPrompt: [
            { command: 'other-hook', type: 'command' },
            { command: 'npx promptocop lint --hook -', type: 'command' },
          ],
        },
      };
      const result = target.removeEntry(config) as {
        hooks: { beforeSubmitPrompt: unknown[] };
      };
      expect(result.hooks.beforeSubmitPrompt).toHaveLength(1);
    });
  });
});

// --- getTarget registry ---

describe('getTarget', () => {
  it('returns claude target for "claude"', () => {
    expect(getTarget('claude').name).toBe('claude');
  });

  it('returns cursor target for "cursor"', () => {
    expect(getTarget('cursor').name).toBe('cursor');
  });

  it('throws for unknown target', () => {
    expect(() => getTarget('vscode')).toThrow('Unknown hook target');
    expect(() => getTarget('vscode')).toThrow('vscode');
  });
});
