import type { LintResult, PromptocopConfig, Rule } from './types.js';

export function applyFixes(
  prompt: string,
  results: LintResult[],
  allRules: Rule[],
  config: PromptocopConfig,
): string {
  // Sort: errors first, then by rule name for determinism
  const failed = results
    .filter((r) => !r.passed)
    .sort((a, b) => {
      if (a.severity === 'error' && b.severity !== 'error') return -1;
      if (a.severity !== 'error' && b.severity === 'error') return 1;
      return a.rule.localeCompare(b.rule);
    });

  let current = prompt;
  for (const result of failed) {
    const rule = allRules.find((r) => r.name === result.rule);
    if (rule?.fix) {
      const ruleOptions = config.options?.[rule.name];
      current = rule.fix(current, ruleOptions);
    }
  }
  return current;
}
