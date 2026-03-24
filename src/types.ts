export type Severity = 'error' | 'warn' | 'info' | 'off';

export interface RuleResult {
  passed: boolean;
  message?: string;
  line?: number;
}

export interface Rule {
  name: string;
  description: string;
  severity: Severity;
  check(prompt: string, options?: Record<string, unknown>): RuleResult;
  fix?(prompt: string, options?: Record<string, unknown>): string;
  explain(): string;
}

export interface LintResult {
  rule: string;
  severity: Severity;
  passed: boolean;
  message?: string;
  line?: number;
}

export interface PromptocopConfig {
  extends?: string[];
  rules?: Record<string, Severity>;
  options?: Record<string, Record<string, unknown>>;
}
