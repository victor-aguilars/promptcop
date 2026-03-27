import { describe, it, expect } from 'vitest';
import { format } from '../formatter.js';
import type { LintResult } from '../types.js';

const errorResult: LintResult = {
  rule: 'no-vague-verb',
  severity: 'error',
  passed: false,
  message: '"fix" needs a target, pattern, or goal',
  directive: 'The verb "fix" may be too vague without a specific target or goal.',
};

const warnResult: LintResult = {
  rule: 'no-file-context',
  severity: 'warn',
  passed: false,
  message: 'No file or code reference found',
  directive: 'No file path or module identifier was detected in the prompt.',
};

const infoResult: LintResult = {
  rule: 'prefer-example',
  severity: 'info',
  passed: false,
  message: 'No example found',
  directive: 'No concrete example (input/output pair, before/after snippet) was detected in the prompt.',
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
    expect(output).toContain('Likely to cause problems without clarification (ask the user if unclear):');
    expect(output).toContain('- The verb "fix" may be too vague');
  });

  it('groups warnings under quality preamble', () => {
    const output = format([warnResult], 'directive');
    expect(output).toContain('May reduce response quality (mention if relevant):');
    expect(output).toContain('- No file path or module identifier');
  });

  it('groups info under optional preamble', () => {
    const output = format([infoResult], 'directive');
    expect(output).toContain('Optional improvements the user could consider:');
    expect(output).toContain('- No concrete example');
  });

  it('omits sections with no violations', () => {
    const output = format([errorResult], 'directive');
    expect(output).not.toContain('May reduce response quality');
    expect(output).not.toContain('Optional improvements');
  });

  it('includes all three sections when all severities present', () => {
    const output = format([errorResult, warnResult, infoResult], 'directive');
    expect(output).toContain('Likely to cause problems');
    expect(output).toContain('May reduce response quality');
    expect(output).toContain('Optional improvements');
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
