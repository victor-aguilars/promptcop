import type { Rule, RuleResult } from '../types.js';

const SEED_VERBS = [
  'make better',
  'clean up',
  'look at',
  'deal with',
  'fix',
  'improve',
  'update',
  'change',
  'refactor',
  'optimize',
  'enhance',
  'adjust',
  'tweak',
  'handle',
];

// Qualifiers that indicate the verb has a specific target/goal
const QUALIFIER_PATTERNS = [
  // File paths
  /[./\\][a-zA-Z0-9_/\\.-]+/,
  // Backtick-quoted identifiers or code
  /`[^`]+`/,
  // Quoted strings
  /["'][^"']{3,}["']/,
  // "so that", "to ensure", "in order to", "by doing"
  /\b(so that|to ensure|in order to|by doing|by adding|by removing|by replacing|by updating|by fixing)\b/i,
];

function buildVerbPattern(verbs: string[]): RegExp {
  const escaped = verbs
    .sort((a, b) => b.length - a.length) // longer phrases first
    .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'i');
}

function hasQualifier(textAfterVerb: string): boolean {
  return QUALIFIER_PATTERNS.some((p) => p.test(textAfterVerb));
}

function splitSentences(prompt: string): string[] {
  return prompt
    .split(/(?<=[.!?\n])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const noVagueVerb: Rule = {
  name: 'no-vague-verb',
  description: 'Vague action verbs without a qualifying target, pattern, or goal',
  severity: 'error',

  check(prompt: string, options?: Record<string, unknown>): RuleResult {
    const additionalVerbs = (options?.additionalVerbs as string[] | undefined) ?? [];
    const allVerbs = [...SEED_VERBS, ...additionalVerbs];
    const pattern = buildVerbPattern(allVerbs);

    const sentences = splitSentences(prompt);
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const match = pattern.exec(sentence);
      if (match) {
        const textAfterVerb = sentence.slice(match.index + match[0].length);
        if (!hasQualifier(textAfterVerb)) {
          return {
            passed: false,
            message: `"${match[0]}" needs a target, pattern, or goal`,
            line: i + 1,
            matched: match[0],
          };
        }
      }
    }

    return { passed: true };
  },

  fix(prompt: string, options?: Record<string, unknown>): string {
    const additionalVerbs = (options?.additionalVerbs as string[] | undefined) ?? [];
    const allVerbs = [...SEED_VERBS, ...additionalVerbs];
    const pattern = buildVerbPattern(allVerbs);

    return prompt.replace(pattern, () => '[ACTION: <describe what and how>]');
  },

  directive(result): string {
    const verb = result.matched ?? 'the action verb';
    return `Ask the user what specifically they want to "${verb}" — what file, function, or component, and what the end state should look like.`;
  },

  explain(): string {
    return `no-vague-verb

Vague action verbs like "fix", "improve", "refactor", or "clean up" without a
specific target, pattern, or goal are a leading cause of correction loops. Claude
must infer what you want, often incorrectly.

Bad:  "refactor the auth module"
Good: "refactor the auth module to use a single validateToken() function instead
       of the inline checks scattered across the three route handlers"

Rules triggers on: ${SEED_VERBS.join(', ')}

A verb is NOT flagged if it is followed by:
  - A file path  (e.g., "fix src/auth.ts")
  - A backtick-quoted identifier  (e.g., "update \`validateToken\`")
  - A quoted string
  - A "so that", "to ensure", or "by doing" clause

Configurable: add your own vague verbs via options.no-vague-verb.additionalVerbs`;
  },
};

export default noVagueVerb;
