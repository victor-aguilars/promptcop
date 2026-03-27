import type { Rule, RuleResult } from '../types.js';

const EXAMPLE_PATTERNS = [
  /\bfor example\b/i,
  /e\.g\./i,
  /\bsuch as\b/i,
  /\blike this\b/i,
  /\bhere'?s an? example\b/i,
  /\bfor instance\b/i,
  // Code blocks
  /```/,
  // Inline code
  /`[^`]+`/,
  // Input/output pair pattern
  /\b(input|output|expected|result|returns?):/i,
];

const MIN_PROMPT_LENGTH = 80;

const preferExample: Rule = {
  name: 'prefer-example',
  description: 'Complex prompt has no example — adding one improves accuracy',
  severity: 'info',

  check(prompt: string): RuleResult {
    if (prompt.length < MIN_PROMPT_LENGTH) {
      return { passed: true };
    }

    for (const pattern of EXAMPLE_PATTERNS) {
      if (pattern.test(prompt)) {
        return { passed: true };
      }
    }

    return {
      passed: false,
      message: 'No example found — adding "for example" or a code snippet improves accuracy',
    };
  },

  directive(): string {
    return 'Suggest to the user that providing a concrete example (input/output pair, before/after snippet) would help.';
  },

  explain(): string {
    return `prefer-example

For non-trivial tasks, examples dramatically reduce ambiguity. Claude can match
your intent more precisely when it sees a concrete input/output pair or a
"before/after" code snippet.

Bad:  "rewrite the error messages to be more user-friendly"
Good: "rewrite the error messages to be more user-friendly, e.g.:
       Before: 'ENOENT: no such file or directory'
       After:  'Could not find the file. Check the path and try again.'"

Only triggers for prompts longer than ${MIN_PROMPT_LENGTH} characters.`;
  },
};

export default preferExample;
