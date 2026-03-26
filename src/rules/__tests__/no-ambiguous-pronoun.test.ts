import { describe, it, expect } from 'vitest';
import noAmbiguousPronoun from '../no-ambiguous-pronoun.js';

describe('no-ambiguous-pronoun', () => {
  it('flags "fix it"', () => {
    const result = noAmbiguousPronoun.check('fix it');
    expect(result.passed).toBe(false);
    expect(result.message).toContain('"it"');
  });

  it('flags "update that"', () => {
    expect(noAmbiguousPronoun.check('update that').passed).toBe(false);
  });

  it('flags prompt starting with "It should"', () => {
    expect(noAmbiguousPronoun.check('It should work differently').passed).toBe(false);
  });

  it('does not flag "that file" (determiner)', () => {
    expect(noAmbiguousPronoun.check('delete that file').passed).toBe(true);
  });

  it('does not flag "this function" (determiner)', () => {
    expect(noAmbiguousPronoun.check('update this function to return a boolean').passed).toBe(true);
  });

  it('does not flag "these tests" (determiner)', () => {
    expect(noAmbiguousPronoun.check('run these tests and report failures').passed).toBe(true);
  });

  it('passes a clean specific prompt', () => {
    const result = noAmbiguousPronoun.check(
      'Add a null check to the validateToken function in src/auth.ts',
    );
    expect(result.passed).toBe(true);
  });

  it('returns line number for multiline prompts', () => {
    const result = noAmbiguousPronoun.check('Add a null check.\nFix it please.');
    expect(result.passed).toBe(false);
    expect(result.line).toBe(2);
  });

  it('populates matched with the triggering pronoun', () => {
    const result = noAmbiguousPronoun.check('fix it');
    expect(result.matched).toBeDefined();
    expect(result.matched!.toLowerCase()).toBe('it');
  });

  it('directive interpolates the matched pronoun', () => {
    const result = noAmbiguousPronoun.check('fix it');
    const msg = noAmbiguousPronoun.directive!(result);
    expect(msg).toContain('"it"');
  });
});
