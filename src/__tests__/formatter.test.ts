import { describe, it, expect } from 'vitest';
import { format } from '../formatter.js';
import type { LintResult } from '../types.js';

const errorResult: LintResult = {
  rule: 'no-vague-verb',
  severity: 'error',
  passed: false,
  message: '"fix" needs a target, pattern, or goal',
  directive: 'Ask the user what specifically they want to "fix" — what file, function, or component, and what the end state should look like.',
};

const warnResult: LintResult = {
  rule: 'no-file-context',
  severity: 'warn',
  passed: false,
  message: 'No file or code reference found',
  directive: 'Ask the user which file(s) or module(s) they are referring to.',
};

const infoResult: LintResult = {
  rule: 'prefer-example',
  severity: 'info',
  passed: false,
  message: 'No example found',
  directive: 'Suggest to the user that providing a concrete example (input/output pair, before/after snippet) would help.',
};

const passResult: LintResult = {
  rule: 'no-constraints',
  severity: 'warn',
  passed: true,
};

describe('format — directive mode', () => {
  it('returns empty string when all results pass', () => {
    const output = format([passResult], 'directive');
    expect(output).toBe('');
  });

  it('includes header line', () => {
    const output = format([errorResult], 'directive');
    expect(output).toContain('[promptocop]');
  });

  it('groups errors under clarification preamble', () => {
    const output = format([errorResult], 'directive');
    expect(output).toContain('MUST clarify before acting:');
    expect(output).toContain('- Ask the user what specifically they want to "fix"');
  });

  it('groups warnings under quality preamble', () => {
    const output = format([warnResult], 'directive');
    expect(output).toContain('Mention to the user if not obvious from context:');
    expect(output).toContain('- Ask the user which file(s) or module(s)');
  });

  it('groups info under optional preamble', () => {
    const output = format([infoResult], 'directive');
    expect(output).toContain('Suggest if relevant:');
    expect(output).toContain('- Suggest to the user that providing a concrete example');
  });

  it('omits sections with no violations', () => {
    const output = format([errorResult], 'directive');
    expect(output).not.toContain('Mention to the user');
    expect(output).not.toContain('Suggest if relevant');
  });

  it('includes all three sections when all severities present', () => {
    const output = format([errorResult, warnResult, infoResult], 'directive');
    expect(output).toContain('MUST clarify before acting:');
    expect(output).toContain('Mention to the user if not obvious from context:');
    expect(output).toContain('Suggest if relevant:');
  });

  it('uses strong preamble when errors present', () => {
    const output = format([errorResult], 'directive');
    expect(output).toContain('DO NOT guess or investigate autonomously');
  });

  it('uses soft preamble when only warn/info present', () => {
    const output = format([warnResult], 'directive');
    expect(output).toContain('may be underspecified');
    expect(output).not.toContain('DO NOT guess');
  });

  it('falls back to rule:message when directive is absent', () => {
    const noDirective: LintResult = { rule: 'some-rule', severity: 'warn', passed: false, message: 'some message' };
    const output = format([noDirective], 'directive');
    expect(output).toContain('some-rule: some message');
  });

  it('skips passed results', () => {
    const output = format([errorResult, passResult], 'directive');
    expect(output).not.toContain('no-constraints');
  });
});
