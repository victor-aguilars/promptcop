import type { Rule, RuleResult } from '../types.js';

// Conjunctions and transitions that commonly separate independent tasks
const TASK_SEPARATOR_PATTERNS = [
  /\band (also|then|additionally|furthermore)\b/i,
  /\bthen\s+(also\s+)?(?=[a-z])/i,
  /\bafter (that|which|doing that)\b/i,
  /\badditionally\b/i,
  /\bfurthermore\b/i,
  /\balso\b/i,
  /\bplus\b/i,
  /\bon top of that\b/i,
];

// Imperative verb at the start of a sentence (a new task)
const IMPERATIVE_SENTENCE = /^(add|create|write|build|fix|update|change|remove|delete|refactor|move|rename|implement|deploy|run|test|check|verify|ensure|make|generate|install|configure|set up|enable|disable|expose|hide)\b/i;

function splitSentences(prompt: string): string[] {
  return prompt
    .split(/[.!?\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

function countImperativeSentences(prompt: string): string[] {
  return splitSentences(prompt).filter((s) => IMPERATIVE_SENTENCE.test(s));
}

const multiTask: Rule = {
  name: 'multi-task',
  description: 'Multiple independent tasks detected in one prompt',
  severity: 'error',

  check(prompt: string): RuleResult {
    // Check for explicit multi-task connectors
    for (const pattern of TASK_SEPARATOR_PATTERNS) {
      if (pattern.test(prompt)) {
        return {
          passed: false,
          message: 'Multiple tasks detected — split into separate prompts for better results',
        };
      }
    }

    // Check for 3+ imperative sentences (strong indicator of multiple tasks)
    const imperatives = countImperativeSentences(prompt);
    if (imperatives.length >= 3) {
      return {
        passed: false,
        message: `${imperatives.length} independent task clauses detected — consider splitting`,
      };
    }

    return { passed: true };
  },

  fix(prompt: string): string {
    const imperatives = countImperativeSentences(prompt);

    if (imperatives.length >= 2) {
      const numbered = imperatives.map((task, i) => `${i + 1}. ${task}`).join('\n');
      return `Please complete these tasks in order:\n${numbered}`;
    }

    // Fallback: split on connectors
    let result = prompt;
    for (const pattern of TASK_SEPARATOR_PATTERNS) {
      result = result.replace(pattern, '\n2. ');
    }
    if (result !== prompt) {
      return `Please complete these tasks in order:\n1. ${result.trim()}`;
    }

    return prompt;
  },

  directive(): string {
    return 'Multiple tasks were detected. Ask the user which task to start with, or whether to handle them one at a time.';
  },

  explain(): string {
    return `multi-task

Combining multiple independent tasks in a single prompt increases the chance
of partial completion, task drift, or Claude stopping after the first task.
Each task should be its own prompt.

Bad:  "add error handling to the API and also update the README and fix the lint warnings"
Good: Send three separate prompts, one per task.

Auto-fix: wraps detected tasks in a numbered list.

Triggers when:
  - "and also", "then", "additionally", "furthermore", "also", "plus" are used
    to chain tasks together
  - 3 or more imperative sentences are found`;
  },
};

export default multiTask;
