import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from '../config.js';
import { recommended } from '../presets/recommended.js';

function writeTempConfig(dir: string, content: string, filename = '.promptocop.yml') {
  writeFileSync(join(dir, filename), content, 'utf8');
}

describe('loadConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'promptocop-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns recommended preset when no config file exists', () => {
    const config = loadConfig(tmpDir);
    expect(config.rules).toEqual(recommended.rules);
  });

  it('loads a .promptocop.yml file', () => {
    writeTempConfig(tmpDir, `
rules:
  no-vague-verb: off
`);
    const config = loadConfig(tmpDir);
    expect(config.rules?.['no-vague-verb']).toBe('off');
  });

  it('merges user rules on top of recommended when extends is set', () => {
    writeTempConfig(tmpDir, `
extends:
  - promptocop:recommended
rules:
  no-vague-verb: off
`);
    const config = loadConfig(tmpDir);
    expect(config.rules?.['no-vague-verb']).toBe('off');
    // Other recommended rules still present
    expect(config.rules?.['no-ambiguous-pronoun']).toBe('error');
  });

  it('resolves config from a subdirectory', () => {
    writeTempConfig(tmpDir, `
rules:
  no-vague-verb: off
`);
    const subDir = join(tmpDir, 'src', 'deep');
    mkdirSync(subDir, { recursive: true });
    const config = loadConfig(subDir);
    expect(config.rules?.['no-vague-verb']).toBe('off');
  });

  it('loads options for per-rule config', () => {
    writeTempConfig(tmpDir, `
extends:
  - promptocop:recommended
options:
  no-vague-verb:
    additionalVerbs:
      - touch
      - revisit
`);
    const config = loadConfig(tmpDir);
    expect(config.options?.['no-vague-verb']?.additionalVerbs).toEqual(['touch', 'revisit']);
  });

  it('handles malformed yaml gracefully', () => {
    writeTempConfig(tmpDir, '{invalid: yaml: syntax:}');
    const config = loadConfig(tmpDir);
    expect(config.rules).toEqual(recommended.rules);
  });
});
