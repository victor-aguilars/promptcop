import { describe, it, expect } from 'vitest';
import noVagueVerb from '../no-vague-verb.js';

describe('no-vague-verb', () => {
  it('flags a bare vague verb', () => {
    const result = noVagueVerb.check('fix the bug');
    expect(result.passed).toBe(false);
    expect(result.message).toContain('"fix"');
  });

  it('flags "refactor" without a target', () => {
    const result = noVagueVerb.check('refactor the auth module');
    expect(result.passed).toBe(false);
  });

  it('flags "clean up" as a multi-word vague verb', () => {
    const result = noVagueVerb.check('clean up the code');
    expect(result.passed).toBe(false);
  });

  it('does not flag when followed by a file path', () => {
    const result = noVagueVerb.check('fix src/auth.ts by adding a null check');
    expect(result.passed).toBe(true);
  });

  it('does not flag when followed by a backtick identifier', () => {
    const result = noVagueVerb.check('update `validateToken` to return a boolean');
    expect(result.passed).toBe(true);
  });

  it('does not flag when a "so that" qualifier follows', () => {
    const result = noVagueVerb.check('refactor the auth module so that it uses a single validateToken function');
    expect(result.passed).toBe(true);
  });

  it('does not flag when a "by adding" qualifier follows', () => {
    const result = noVagueVerb.check('fix the null pointer by adding a guard clause');
    expect(result.passed).toBe(true);
  });

  it('does not flag a clean, specific prompt', () => {
    const result = noVagueVerb.check('Add a retry mechanism to the HTTP client with exponential backoff');
    expect(result.passed).toBe(true);
  });

  it('respects additionalVerbs option', () => {
    const result = noVagueVerb.check('touch the API', { additionalVerbs: ['touch'] });
    expect(result.passed).toBe(false);
  });

  it('auto-fix inserts a [SPECIFY] placeholder', () => {
    expect(noVagueVerb.fix).toBeDefined();
    const fixed = noVagueVerb.fix!('fix the bug');
    expect(fixed).toContain('[ACTION:');
    expect(fixed).not.toContain('fix the bug');
  });

  it('auto-fix works with additionalVerbs', () => {
    const fixed = noVagueVerb.fix!('revisit the config', { additionalVerbs: ['revisit'] });
    expect(fixed).toContain('[ACTION:');
  });

  it('returns line number for multiline prompts', () => {
    const result = noVagueVerb.check('Add tests.\nfix the bug');
    expect(result.passed).toBe(false);
    expect(result.line).toBe(2);
  });

  it('populates matched with the triggering verb', () => {
    const result = noVagueVerb.check('fix the bug');
    expect(result.matched).toBe('fix');
  });

  it('directive interpolates the matched verb', () => {
    const result = noVagueVerb.check('refactor the code');
    expect(result.matched).toBeDefined();
    const msg = noVagueVerb.directive!(result);
    expect(msg).toContain('"refactor"');
  });
});
