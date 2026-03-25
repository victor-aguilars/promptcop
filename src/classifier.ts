import { openSync, readSync, closeSync, statSync } from 'node:fs';

export type PromptClass = 'confirmation' | 'follow-up' | 'standalone';

export const FOLLOW_UP_SKIP_RULES = new Set([
  'no-file-context',
  'no-constraints',
  'missing-success-criteria',
  'no-ambiguous-pronoun',
]);

const EXACT_CONFIRMATIONS = new Set([
  'yes', 'yeah', 'yep', 'yup', 'y',
  'no', 'nope', 'n',
  'sure', 'ok', 'okay', 'k',
  'correct', 'exactly', 'right',
  'go ahead', 'do it', 'proceed',
  'sounds good', 'looks good', 'lgtm',
  'that works', 'works for me',
  'perfect', 'great', 'nice', 'awesome',
  'approved', 'confirmed', 'agreed',
  'please', 'please do', 'go for it',
  'thanks', 'thank you', 'ty',
]);

// Short compound confirmations: "yes please", "sure go ahead", "ok thanks", etc.
const COMPOUND_CONFIRMATION_RE =
  /^(yes|yeah|yep|sure|ok|okay|go ahead|do it|proceed|sounds good|looks good|perfect|great|approved|please)[,.]?\s*(thanks|thank you|please|go ahead|do it|please)?[.!]?$/i;

const CONTINUATION_STARTERS_RE =
  /^(now|next|then|also|and\b|but\b|however|after that|following that|from here|continuing|moving on|for the next|on to|back to|let'?s|can you also|one more thing|oh and|wait\b|actually)\b/i;

// File path heuristic — same as no-file-context rule uses
const FILE_PATH_RE = /[\w-]+[/\\][\w./\\-]+|\b\w+\.(ts|js|py|go|rs|java|cpp|c|h|json|yml|yaml|md|txt|sh|env)\b/i;

function normalize(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/[.!?]+$/, '').trim();
}

function endsWithQuestion(text: string): boolean {
  // Check if the last non-empty sentence ends with a question mark
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (let i = sentences.length - 1; i >= 0; i--) {
    const s = sentences[i].trim();
    if (s.length > 0) return s.endsWith('?');
  }
  return false;
}

const COMPLETION_LANGUAGE_RE =
  /\b(i'?ve (implemented|finished|completed|added|created|written|done|fixed)|done|completed|finished|implemented|all set|ready)\b/i;

export function classify(prompt: string, lastAssistantMessage?: string): PromptClass {
  const trimmed = prompt.trim();
  if (!trimmed) return 'standalone';

  // --- Confirmation detection ---
  if (trimmed.length <= 40) {
    const norm = normalize(trimmed);
    if (EXACT_CONFIRMATIONS.has(norm) || COMPOUND_CONFIRMATION_RE.test(norm)) {
      return 'confirmation';
    }
  }

  // Transcript boost: if last assistant message ended with a question
  // and the user's reply is short, classify as confirmation
  if (lastAssistantMessage && trimmed.length < 80 && endsWithQuestion(lastAssistantMessage)) {
    return 'confirmation';
  }

  // --- Follow-up detection ---
  if (trimmed.length < 200 && CONTINUATION_STARTERS_RE.test(trimmed) && !FILE_PATH_RE.test(trimmed)) {
    return 'follow-up';
  }

  // Transcript boost: if last assistant message signals completion and prompt starts with continuation
  if (
    lastAssistantMessage &&
    COMPLETION_LANGUAGE_RE.test(lastAssistantMessage) &&
    trimmed.length < 200 &&
    CONTINUATION_STARTERS_RE.test(trimmed)
  ) {
    return 'follow-up';
  }

  return 'standalone';
}

export function getLastAssistantMessage(transcriptPath: string): string | null {
  try {
    const TAIL_BYTES = 10 * 1024; // 10KB
    const stat = statSync(transcriptPath);
    const fileSize = stat.size;
    const start = Math.max(0, fileSize - TAIL_BYTES);

    const buf = Buffer.alloc(Math.min(TAIL_BYTES, fileSize));
    const fd = openSync(transcriptPath, 'r');
    try {
      readSync(fd, buf, 0, buf.length, start);
    } finally {
      closeSync(fd);
    }

    const tail = buf.toString('utf8');
    const lines = tail.split('\n').filter((l) => l.trim());

    // Walk lines in reverse to find last assistant message
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const obj = JSON.parse(lines[i]) as {
          type?: string;
          message?: { role?: string; content?: Array<{ type?: string; text?: string }> | string };
        };
        if (obj.type === 'assistant' && obj.message?.role === 'assistant') {
          const content = obj.message.content;
          if (typeof content === 'string') return content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text' && block.text) return block.text;
            }
          }
        }
      } catch {
        // Malformed line — skip
      }
    }
  } catch {
    // File unreadable or missing — graceful degradation
  }
  return null;
}
