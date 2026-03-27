import type { Rule, RuleResult } from '../types.js';

const CONSTRAINT_PATTERNS = [
  // Modal/directive language
  /\b(must|should|shall|need to|have to|required to|only|avoid|don'?t|do not|never|always)\b/i,
  // Quantity constraints
  /\b(at most|at least|no more than|no less than|limit(ed)? to|maximum|minimum|max|min)\b/i,
  // Boundary words
  /\b(within|without|except|unless|until|before|after|instead of|rather than)\b/i,
  // Requirement markers
  /\b(constraint|requirement|restriction|rule|policy)\b/i,
  // Bullet/numbered list (often encodes constraints)
  /^[-*•]\s+/m,
  /^\d+\.\s+/m,
];

const noConstraints: Rule = {
  name: 'no-constraints',
  description: 'No constraints or requirements specified in the prompt',
  severity: 'warn',

  check(prompt: string): RuleResult {
    for (const pattern of CONSTRAINT_PATTERNS) {
      if (pattern.test(prompt)) {
        return { passed: true };
      }
    }
    return {
      passed: false,
      message: 'No constraints specified — consider adding limits, requirements, or restrictions',
    };
  },

  directive(): string {
    return 'Note to the user that no constraints were specified — ask if there are any limits, requirements, or restrictions to follow.';
  },

  explain(): string {
    return `no-constraints

Without constraints, Claude will make its own assumptions about scope, style,
and approach. This often leads to over-engineering or changes you didn't want.

Bad:  "add a caching layer"
Good: "add a caching layer using only the standard library, no external deps,
       with a max cache size of 100 entries"

Triggers when: no modal language (must/should/only/avoid), quantity limits,
boundary words, or lists are found.`;
  },
};

export default noConstraints;
