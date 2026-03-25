import { describe, it, expect } from 'vitest';
import { classify, getLastAssistantMessage, FOLLOW_UP_SKIP_RULES } from '../classifier.js';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('classify', () => {
  describe('confirmations (static)', () => {
    it.each([
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
    ])('"%s" → confirmation', (prompt) => {
      expect(classify(prompt)).toBe('confirmation');
    });

    it('handles trailing punctuation', () => {
      expect(classify('yes.')).toBe('confirmation');
      expect(classify('sure!')).toBe('confirmation');
      expect(classify('ok?')).toBe('confirmation');
    });

    it('handles mixed case', () => {
      expect(classify('Yes')).toBe('confirmation');
      expect(classify('SURE')).toBe('confirmation');
      expect(classify('Sounds Good')).toBe('confirmation');
    });

    it('handles compound confirmations', () => {
      expect(classify('yes please')).toBe('confirmation');
      expect(classify('sure, go ahead')).toBe('confirmation');
      expect(classify('ok thanks')).toBe('confirmation');
    });

    it('does NOT classify long messages as confirmation', () => {
      expect(classify('yes, and also please refactor the entire auth module to use JWT tokens')).not.toBe('confirmation');
    });

    it('does NOT classify "fix it" as confirmation', () => {
      expect(classify('fix it')).toBe('standalone');
    });

    it('does NOT classify single non-confirmation words as confirmation', () => {
      expect(classify('deploy')).toBe('standalone');
      expect(classify('refactor')).toBe('standalone');
    });
  });

  describe('follow-ups (static)', () => {
    it.each([
      'now continue with authorization',
      'next, let\'s work on the tests',
      'then add error handling',
      'also add logging',
      'but make sure it handles edge cases',
      'however, we need to add validation',
      'after that, write the docs',
      'actually, let\'s do authentication first',
      'wait, we forgot the migration',
      'let\'s continue with the next step',
      'one more thing — add rate limiting',
    ])('"%s" → follow-up', (prompt) => {
      expect(classify(prompt)).toBe('follow-up');
    });

    it('does NOT classify follow-up with file path as follow-up', () => {
      expect(classify('now update src/auth.ts to use JWT')).toBe('standalone');
      expect(classify('also fix the bug in utils.js')).toBe('standalone');
    });

    it('does NOT classify long follow-up as follow-up', () => {
      // Construct a string >= 200 chars starting with a continuation word
      const long = 'now ' + 'we need to implement a very long and detailed feature with lots of specification about exactly what needs to happen in the system, including error handling, edge cases, and performance considerations';
      expect(long.length).toBeGreaterThanOrEqual(200);
      expect(classify(long)).toBe('standalone');
    });
  });

  describe('standalone', () => {
    it('classifies regular prompts as standalone', () => {
      expect(classify('Refactor the auth module to use JWT')).toBe('standalone');
      expect(classify('Add error handling to the payment service in src/payment.ts')).toBe('standalone');
      expect(classify('Write unit tests for the login function')).toBe('standalone');
    });

    it('classifies empty string as standalone', () => {
      expect(classify('')).toBe('standalone');
      expect(classify('   ')).toBe('standalone');
    });
  });

  describe('transcript boost — confirmation', () => {
    it('classifies short reply as confirmation when assistant asked a question', () => {
      const lastAssistant = 'I can implement this using either JWT or session tokens. Which approach would you prefer?';
      expect(classify('JWT please', lastAssistant)).toBe('confirmation');
      expect(classify('the first one', lastAssistant)).toBe('confirmation');
      expect(classify('method A', lastAssistant)).toBe('confirmation');
    });

    it('does NOT boost when assistant did not ask a question', () => {
      const lastAssistant = 'I\'ve implemented the authentication module.';
      // "the first one" is short but assistant didn't ask a question
      expect(classify('the first one', lastAssistant)).toBe('standalone');
    });

    it('does NOT boost long replies even when assistant asked a question', () => {
      const lastAssistant = 'Which approach would you prefer?';
      const longReply = 'I think we should go with JWT tokens because they are stateless and work better at scale';
      expect(classify(longReply, lastAssistant)).not.toBe('confirmation');
    });
  });

  describe('transcript boost — follow-up', () => {
    it('boosts follow-up when assistant signals completion', () => {
      const lastAssistant = "I've implemented the authentication module. All tests are passing.";
      expect(classify('now continue with authorization', lastAssistant)).toBe('follow-up');
      expect(classify('next, let\'s add rate limiting', lastAssistant)).toBe('follow-up');
    });

    it('falls back gracefully when no transcript provided', () => {
      expect(classify('now continue with auth')).toBe('follow-up');
      expect(classify('yes')).toBe('confirmation');
      expect(classify('refactor the module')).toBe('standalone');
    });
  });
});

describe('FOLLOW_UP_SKIP_RULES', () => {
  it('contains the expected rules', () => {
    expect(FOLLOW_UP_SKIP_RULES.has('no-file-context')).toBe(true);
    expect(FOLLOW_UP_SKIP_RULES.has('no-constraints')).toBe(true);
    expect(FOLLOW_UP_SKIP_RULES.has('missing-success-criteria')).toBe(true);
    expect(FOLLOW_UP_SKIP_RULES.has('no-ambiguous-pronoun')).toBe(true);
    expect(FOLLOW_UP_SKIP_RULES.has('no-vague-verb')).toBe(false);
    expect(FOLLOW_UP_SKIP_RULES.has('multi-task')).toBe(false);
  });
});

describe('getLastAssistantMessage', () => {
  function makeTmpTranscript(lines: object[]): string {
    const dir = mkdtempSync(join(tmpdir(), 'promptocop-test-'));
    const path = join(dir, 'transcript.jsonl');
    writeFileSync(path, lines.map((l) => JSON.stringify(l)).join('\n') + '\n', 'utf8');
    return path;
  }

  it('returns last assistant text message', () => {
    const path = makeTmpTranscript([
      { type: 'user', message: { role: 'user', content: 'hello' } },
      { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Hi there!' }] } },
      { type: 'user', message: { role: 'user', content: 'ok' } },
      { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Final response.' }] } },
    ]);
    expect(getLastAssistantMessage(path)).toBe('Final response.');
  });

  it('returns null for missing file', () => {
    expect(getLastAssistantMessage('/nonexistent/path/file.jsonl')).toBeNull();
  });

  it('returns null when no assistant messages exist', () => {
    const path = makeTmpTranscript([
      { type: 'user', message: { role: 'user', content: 'hello' } },
    ]);
    expect(getLastAssistantMessage(path)).toBeNull();
  });

  it('skips non-assistant entries', () => {
    const path = makeTmpTranscript([
      { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'First.' }] } },
      { type: 'file-history-snapshot', data: {} },
      { type: 'user', message: { role: 'user', content: 'ok' } },
    ]);
    expect(getLastAssistantMessage(path)).toBe('First.');
  });
});
