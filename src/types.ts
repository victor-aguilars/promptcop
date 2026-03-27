export type Severity = 'error' | 'warn' | 'info' | 'off';

export interface RuleResult {
  passed: boolean;
  message?: string;
  line?: number;
  matched?: string;
}

export interface Rule {
  name: string;
  description: string;
  severity: Severity;
  check(prompt: string, options?: Record<string, unknown>): RuleResult;
  fix?(prompt: string, options?: Record<string, unknown>): string;
  explain(): string;
  directive?(result: RuleResult): string;
}

export interface LintResult {
  rule: string;
  severity: Severity;
  passed: boolean;
  message?: string;
  line?: number;
  directive?: string;
}

export interface ContextConfig {
  mode?: 'compact' | 'directive';
}

export interface PromptocopConfig {
  enabled?: boolean;
  extends?: string[];
  rules?: Record<string, Severity>;
  options?: Record<string, Record<string, unknown>>;
  context?: ContextConfig;
}
