import chalk from 'chalk';
import type { LintResult } from './types.js';

export type FormatMode = 'default' | 'json' | 'compact' | 'directive';

const SEVERITY_ORDER = { error: 0, warn: 1, info: 2, off: 3 };

export function format(results: LintResult[], mode: FormatMode, version = '0.1.0'): string {
  if (mode === 'json') {
    return JSON.stringify(results, null, 2);
  }

  if (mode === 'directive') {
    const failures = results.filter((r) => !r.passed);
    if (failures.length === 0) return '';

    const groups: Record<string, string[]> = { error: [], warn: [], info: [] };
    for (const r of failures) {
      const text = r.directive ?? `${r.rule}: ${r.message ?? 'violation'}`;
      if (r.severity === 'error' || r.severity === 'warn' || r.severity === 'info') {
        groups[r.severity].push(text);
      }
    }

    const PREAMBLES: Record<string, string> = {
      error: 'Likely to cause problems without clarification (ask the user if unclear):',
      warn: 'May reduce response quality (mention if relevant):',
      info: 'Optional improvements the user could consider:',
    };

    const sections: string[] = ["[promptocop] The user's prompt was flagged by a prompt linter. Below are potential gaps — if any are not already resolved by conversation context, factor them into your response."];
    for (const severity of ['error', 'warn', 'info']) {
      if (groups[severity].length > 0) {
        sections.push('');
        sections.push(PREAMBLES[severity]);
        for (const item of groups[severity]) {
          sections.push(`- ${item}`);
        }
      }
    }
    return sections.join('\n');
  }

  if (mode === 'compact') {
    return results
      .filter((r) => !r.passed)
      .map((r) => `${r.severity}: ${r.rule}: ${r.message ?? 'violation'}`)
      .join('\n');
  }

  // default mode
  const lines: string[] = [];
  lines.push(chalk.bold(`promptocop v${version}`));
  lines.push('');

  const sorted = [...results].sort((a, b) => {
    // Failed first, then by severity
    if (a.passed !== b.passed) return a.passed ? 1 : -1;
    return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  });

  for (const r of sorted) {
    const icon = r.passed
      ? chalk.green('✓ pass  ')
      : r.severity === 'error'
        ? chalk.red('✖ error  ')
        : r.severity === 'warn'
          ? chalk.yellow('⚠ warning')
          : chalk.blue('ℹ info   ');

    const ruleName = chalk.bold(r.rule.padEnd(28));
    const msg = r.passed ? '' : (r.message ?? '');
    lines.push(`${icon} ${ruleName} ${msg}`);
  }

  const errors = results.filter((r) => !r.passed && r.severity === 'error').length;
  const warnings = results.filter((r) => !r.passed && r.severity === 'warn').length;
  const infos = results.filter((r) => !r.passed && r.severity === 'info').length;

  lines.push('');
  if (errors === 0 && warnings === 0 && infos === 0) {
    lines.push(chalk.green('All checks passed.'));
  } else {
    const parts: string[] = [];
    if (errors > 0) parts.push(chalk.red(`${errors} error${errors !== 1 ? 's' : ''}`));
    if (warnings > 0) parts.push(chalk.yellow(`${warnings} warning${warnings !== 1 ? 's' : ''}`));
    if (infos > 0) parts.push(chalk.blue(`${infos} suggestion${infos !== 1 ? 's' : ''}`));
    let summary = parts.join(', ');
    const hasFix = results.some((r) => !r.passed);
    if (hasFix) summary += ' — run with --fix to attempt auto-fix';
    lines.push(summary);
  }

  return lines.join('\n');
}
