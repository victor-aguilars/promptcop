import type { Rule, RuleResult } from '../types.js';

const MAX_PROMPT_LENGTH = 2000;
const MAX_CODE_BLOCK_LENGTH = 500;

// Patterns common in pasted logs and stack traces
const LOG_PATTERNS = [
  // Timestamps
  /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/,
  // Stack trace lines
  /^\s+at\s+\w/m,
  // Log level prefixes
  /\b(ERROR|WARN|INFO|DEBUG|TRACE)\b.*\d{2}:\d{2}:\d{2}/,
  // Exception patterns
  /Exception:|Error:|Traceback \(most recent call last\)/,
];

function hasLargeCodeBlock(prompt: string): boolean {
  const codeBlockPattern = /```[\s\S]*?```/g;
  let match;
  while ((match = codeBlockPattern.exec(prompt)) !== null) {
    if (match[0].length > MAX_CODE_BLOCK_LENGTH) return true;
  }
  return false;
}

function hasLogDump(prompt: string): boolean {
  return LOG_PATTERNS.some((p) => p.test(prompt));
}

const contextDumpRisk: Rule = {
  name: 'context-dump-risk',
  description: 'Prompt may contain a large context dump (logs, code blocks, or long text)',
  severity: 'warn',

  check(prompt: string): RuleResult {
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return {
        passed: false,
        message: `Prompt is ${prompt.length} chars — consider extracting context to a file and referencing it`,
      };
    }

    if (hasLargeCodeBlock(prompt)) {
      return {
        passed: false,
        message: 'Large code block detected — consider writing it to a file first',
      };
    }

    if (hasLogDump(prompt)) {
      return {
        passed: false,
        message: 'Pasted logs or stack trace detected — consider saving to a file and referencing it',
      };
    }

    return { passed: true };
  },

  directive(): string {
    return 'Note to the user that the prompt contains a large amount of pasted context — ask them to highlight which parts are most relevant.';
  },

  explain(): string {
    return `context-dump-risk

Pasting large amounts of code, logs, or stack traces directly into a prompt is
token-inefficient and can cause Claude to lose focus on the actual task. It's
better to reference files directly.

Bad:  "here's the full stack trace: [500 lines pasted]... what's wrong?"
Good: "the error is in /tmp/error.log — what's causing the NullPointerException
       on line 47?"

Triggers when:
  - Prompt exceeds ${MAX_PROMPT_LENGTH} characters
  - A code block exceeds ${MAX_CODE_BLOCK_LENGTH} characters
  - Pasted logs or stack traces are detected`;
  },
};

export default contextDumpRisk;
