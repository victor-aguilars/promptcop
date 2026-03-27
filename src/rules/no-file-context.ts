import type { Rule, RuleResult } from '../types.js';

// Patterns that indicate a file or code reference is present
const FILE_PATTERNS = [
  // Explicit path separators
  /[./\\][a-zA-Z0-9_/-]+\.[a-zA-Z]{1,6}\b/,
  // Absolute paths
  /\/[a-zA-Z0-9_/-]+/,
  // Common extensions mentioned alone (e.g., "the .ts file")
  /\.(ts|js|tsx|jsx|py|go|rs|java|rb|cpp|c|h|json|yml|yaml|toml|md|css|html|sh|env)\b/i,
  // Backtick-quoted identifiers that look like file paths or module names
  /`[a-zA-Z0-9_./-]+\.[a-zA-Z]{1,6}`/,
  // "the X file/module/component" patterns
  /\bthe\s+\w+\s+(file|module|component|function|class|method|handler|route|endpoint|middleware)\b/i,
];

const noFileContext: Rule = {
  name: 'no-file-context',
  description: 'No file path, module, or code reference in the prompt',
  severity: 'warn',

  check(prompt: string): RuleResult {
    for (const pattern of FILE_PATTERNS) {
      if (pattern.test(prompt)) {
        return { passed: true };
      }
    }
    return {
      passed: false,
      message: 'No file or code reference found — add a file path or identifier to narrow scope',
    };
  },

  directive(): string {
    return 'Ask the user which file(s) or module(s) they are referring to.';
  },

  explain(): string {
    return `no-file-context

Prompts without any file path, module name, or code reference force Claude to
search the entire codebase for what you might mean. This wastes tokens and
increases the chance of touching the wrong code.

Bad:  "add error handling"
Good: "add error handling to src/api/client.ts in the fetchUser function"

Triggers when: no file path, extension, backtick identifier, or "the X file/module"
phrase is found in the prompt.`;
  },
};

export default noFileContext;
