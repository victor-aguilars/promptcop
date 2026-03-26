import { describe, it, expect } from 'vitest';
import { format } from '../formatter.js';
import type { LintResult } from '../types.js';

const errorResult: LintResult = {
  rule: 'no-vague-verb',
  severity: 'error',
  passed: false,
  message: '"fix" needs a target, pattern, or goal',
  directive: 'What specifically should be done? The verb "fix" is too vague without a target or goal.',
};

const warnResult: LintResult = {
  rule: 'no-file-context',
  severity: 'warn',
  passed: false,
  message: 'No file or code reference found',
  directive: 'Which file or module is this about? Add a path or identifier to narrow scope.',
};

const infoResult: LintResult = {
  rule: 'prefer-example',
  severity: 'info',
  passed: false,
  message: 'No example found',
  directive: 'Adding a concrete example (input/output pair or before/after snippet) would improve accuracy.',
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

  it('groups errors under STOP preamble', () => {
    const output = format([errorResult], 'directive');
    expect(output).toContain('STOP. Before proceeding, ask the user to clarify:');
    expect(output).toContain('- What specifically should be done?');
  });

  it('groups warnings under proceed preamble', () => {
    const output = format([warnResult], 'directive');
    expect(output).toContain('Proceed with the task, but mention these gaps');
    expect(output).toContain('- Which file or module is this about?');
  });

  it('groups info under after-task preamble', () => {
    const output = format([infoResult], 'directive');
    expect(output).toContain('After completing the task, consider suggesting:');
    expect(output).toContain('- Adding a concrete example');
  });

  it('omits sections with no violations', () => {
    const output = format([errorResult], 'directive');
    expect(output).not.toContain('Proceed with the task');
    expect(output).not.toContain('After completing the task');
  });

  it('includes all three sections when all severities present', () => {
    const output = format([errorResult, warnResult, infoResult], 'directive');
    expect(output).toContain('STOP.');
    expect(output).toContain('Proceed with the task');
    expect(output).toContain('After completing the task');
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
