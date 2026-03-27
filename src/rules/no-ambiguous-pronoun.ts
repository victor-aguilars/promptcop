import type { Rule, RuleResult } from '../types.js';

// Pronouns that can be ambiguous when used as the object of an action
const PRONOUNS = ['it', 'this', 'that', 'these', 'those'];

// Action verbs that commonly precede ambiguous pronouns
const ACTION_VERBS = [
  'fix', 'update', 'change', 'modify', 'refactor', 'improve', 'rewrite',
  'delete', 'remove', 'replace', 'add', 'move', 'rename', 'check', 'test',
  'review', 'debug', 'use', 'handle', 'process', 'parse', 'validate',
  'run', 'execute', 'call', 'invoke', 'send', 'return', 'get', 'set',
  'read', 'write', 'open', 'close', 'create', 'make', 'build', 'deploy',
];

// Build: verb + optional whitespace/words + pronoun (pronoun NOT followed by a noun)
// We check: verb (pronoun) where pronoun is NOT followed by a noun
function buildVerbPronounPattern(): RegExp {
  const verbGroup = `\\b(${ACTION_VERBS.join('|')})\\b`;
  const pronounGroup = `\\b(${PRONOUNS.join('|')})\\b`;
  // Matches: verb ... pronoun (with up to 3 words between them)
  return new RegExp(`${verbGroup}(\\s+\\w+){0,3}\\s+${pronounGroup}`, 'i');
}

// Check if a pronoun is a determiner (followed by a noun, e.g., "that file", "this function")
function isPronounDeterminer(text: string, pronounMatch: RegExpExecArray): boolean {
  const afterPronoun = text.slice(pronounMatch.index + pronounMatch[0].length).trim();
  // If the next non-whitespace token is a noun-like word (not a verb or punctuation), it's a determiner
  const nextWord = /^([a-zA-Z_]\w*)/.exec(afterPronoun);
  if (!nextWord) return false;
  // Simple heuristic: if next word is in action verbs list, it's likely a separate clause
  if (ACTION_VERBS.includes(nextWord[1].toLowerCase())) return false;
  return true;
}

const VERB_PRONOUN_PATTERN = buildVerbPronounPattern();
const PRONOUN_PATTERN = new RegExp(`\\b(${PRONOUNS.join('|')})\\b`, 'gi');

function splitSentences(prompt: string): string[] {
  return prompt
    .split(/(?<=[.!?\n])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const noAmbiguousPronoun: Rule = {
  name: 'no-ambiguous-pronoun',
  description: 'Ambiguous pronoun used as object of an action verb with no clear referent',
  severity: 'error',

  check(prompt: string): RuleResult {
    const sentences = splitSentences(prompt);

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const match = VERB_PRONOUN_PATTERN.exec(sentence);

      if (match) {
        // Find the pronoun in the match
        const pronounMatch = PRONOUN_PATTERN.exec(match[0]);
        PRONOUN_PATTERN.lastIndex = 0;

        if (pronounMatch) {
          const pronounLower = pronounMatch[0].toLowerCase();
          // "it" can never be a determiner; only "this/that/these/those" can
          if (pronounLower !== 'it') {
            const pronounStart = sentence.indexOf(match[0]) + match[0].lastIndexOf(pronounMatch[0]);
            const afterPronoun = sentence.slice(pronounStart + pronounMatch[0].length).trim();
            const nextWord = /^([a-zA-Z_]\w*)/.exec(afterPronoun);
            // If followed immediately by a noun (non-verb), it's a determiner ("that file")
            if (nextWord && !ACTION_VERBS.includes(nextWord[1].toLowerCase())) {
              continue;
            }
          }

          return {
            passed: false,
            message: `"${pronounMatch[0]}" has no clear referent — specify what you mean`,
            line: i + 1,
            matched: pronounMatch[0],
          };
        }
      }

      // Also catch prompt-opening pronouns ("It should...", "This needs to...")
      if (i === 0) {
        const openingPronoun = /^(it|this|that|these|those)\b/i.exec(sentence);
        if (openingPronoun) {
          return {
            passed: false,
            message: `"${openingPronoun[0]}" at the start of the prompt has no referent`,
            line: 1,
            matched: openingPronoun[0],
          };
        }
      }
    }

    return { passed: true };
  },

  directive(result): string {
    const pronoun = result.matched ?? 'the pronoun';
    return `Ask the user what "${pronoun}" refers to — the specific file, function, or concept is not named.`;
  },

  explain(): string {
    return `no-ambiguous-pronoun

Pronouns like "it", "this", "that", "these", and "those" as the object of an
action verb with no clear referent force Claude to guess what you're referring to.

Bad:  "fix it"
Bad:  "update that to use the new API"
Good: "update the validateToken function to use the new OAuth2 API"

Note: "that file", "this function" etc. are NOT flagged — the pronoun is a
determiner pointing at a specific noun in those cases.`;
  },
};

export default noAmbiguousPronoun;
