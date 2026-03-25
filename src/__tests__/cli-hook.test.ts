import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const CLI = join(import.meta.dirname, '../../dist/cli.js');

function runHook(prompt: string, extraArgs: string[] = []) {
  const input = JSON.stringify({ prompt });
  return spawnSync('node', [CLI, 'lint', '--hook', ...extraArgs, '-'], {
    input,
    encoding: 'utf8',
  });
}

describe('hook mode (default — non-blocking)', () => {
  it('exits 0 even when errors are found', () => {
    const result = runHook('fix it');
    expect(result.status).toBe(0);
  });

  it('writes JSON additionalContext to stdout on violations', () => {
    const result = runHook('fix it');
    expect(result.stdout.trim()).not.toBe('');
    const parsed = JSON.parse(result.stdout.trim()) as { additionalContext?: string };
    expect(parsed).toHaveProperty('additionalContext');
    expect(parsed.additionalContext).toContain('no-vague-verb');
  });

  it('writes nothing to stderr', () => {
    const result = runHook('fix it');
    expect(result.stderr).toBe('');
  });

  it('exits 0 when rules only produce info/warn (never blocks)', () => {
    // Specific, well-formed prompt — may still trigger info-level prefer-example, but must not block
    const result = runHook(
      'Add debug logging to src/auth.ts so that each failed login attempt logs the username and timestamp. Do not log passwords.',
    );
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('handles raw string stdin (non-JSON fallback) without crashing', () => {
    const result = spawnSync('node', [CLI, 'lint', '--hook', '-'], {
      input: 'fix the bug',
      encoding: 'utf8',
    });
    expect(result.status).toBeDefined();
    expect(result.status).not.toBeNull();
  });
});

describe('hook mode with --strict', () => {
  it('exits 2 and writes to stderr on errors', () => {
    const result = runHook('fix it', ['--strict']);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('no-vague-verb');
    expect(result.stdout).toBe('');
  });

  it('exits 2 (not 1) — correct exit code for Claude Code blocking', () => {
    const result = runHook('refactor everything', ['--strict']);
    expect(result.status).toBe(2);
    expect(result.status).not.toBe(1);
  });

  it('exits 0 with JSON additionalContext for warnings only', () => {
    const result = runHook('Add logging to the auth service', ['--strict']);
    expect(result.status).toBe(0);
    if (result.stdout.trim()) {
      const parsed = JSON.parse(result.stdout.trim()) as { additionalContext?: string };
      expect(parsed).toHaveProperty('additionalContext');
    }
  });

  it('exits 0 and does not block when rules only produce info/warn', () => {
    const result = runHook(
      'Add debug logging to src/auth.ts so that each failed login attempt logs the username and timestamp. Do not log passwords.',
      ['--strict'],
    );
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});
