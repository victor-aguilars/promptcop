import type { Rule, RuleResult } from '../types.js';

const MIN_PROMPT_LENGTH = 40;

const SUCCESS_PATTERNS = [
  // Direct success language
  /\b(should result in|expected (output|result|behavior)|success (means|is when|criteria))\b/i,
  // Verification language
  /\b(verify that|confirm that|assert that|ensure that|check that|validate that)\b/i,
  // Test-oriented
  /\b(test(s?) should|spec should|the test|should pass|should fail|should return|should output)\b/i,
  // "So that" goal clauses
  /\bso that\b/i,
  // Acceptance criteria
  /\b(acceptance criteria|definition of done|done when|complete when)\b/i,
  // Explicit output description
  /\b(output should|result should|returns? a|should (be|have|contain|show|display|print|log))\b/i,
  // "Until" completion marker
  /\buntil (the|it|all|there)\b/i,
];

const missingSucessCriteria: Rule = {
  name: 'missing-success-criteria',
  description: 'No success criteria or definition of done in the prompt',
  severity: 'error',

  check(prompt: string): RuleResult {
    if (prompt.trim().length < MIN_PROMPT_LENGTH) {
      return { passed: true };
    }

    for (const pattern of SUCCESS_PATTERNS) {
      if (pattern.test(prompt)) {
        return { passed: true };
      }
    }

    return {
      passed: false,
      message: 'No success criteria found — add what "done" looks like (e.g., "so that...", "the test should...")',
    };
  },

  directive(): string {
    return 'Ask the user what "done" looks like — no success criteria or expected outcome was stated.';
  },

  explain(): string {
    return `missing-success-criteria

Without a definition of done, Claude doesn't know when to stop and may
over-reach, under-deliver, or make changes you didn't want.

Bad:  "add authentication to the API"
Good: "add authentication to the API so that requests without a valid JWT
       return 401 and the existing tests still pass"

Triggers for prompts longer than ${MIN_PROMPT_LENGTH} characters with no:
  - "so that", "verify that", "ensure that" clauses
  - "should return / output / contain" language
  - test or assertion references
  - acceptance criteria or "done when" language`;
  },
};

export default missingSucessCriteria;
