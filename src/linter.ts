import type { LintResult, PromptocopConfig, Severity } from './types.js';
import { rules } from './rules/index.js';

export function lint(prompt: string, config: PromptocopConfig, skipRules?: Set<string>): LintResult[] {
  const results: LintResult[] = [];

  for (const rule of rules) {
    const configuredSeverity = config.rules?.[rule.name];
    const severity: Severity = configuredSeverity ?? rule.severity;

    if (severity === 'off') continue;
    if (skipRules?.has(rule.name)) continue;

    const ruleOptions = config.options?.[rule.name];
    const result = rule.check(prompt, ruleOptions);

    results.push({
      rule: rule.name,
      severity,
      passed: result.passed,
      message: result.message,
      line: result.line,
    });
  }

  return results;
}
