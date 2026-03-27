#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Command } from 'commander';
import { lint } from './linter.js';
import { format } from './formatter.js';
import type { FormatMode } from './formatter.js';
import { getRuleByName, rules } from './rules/index.js';
import { loadConfig } from './config.js';
import type { LintResult, PromptocopConfig } from './types.js';

const { version: VERSION } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };

const program = new Command();

program
  .name('promptocop')
  .description('A prompt linter for Claude Code')
  .version(VERSION);

program
  .command('lint [prompt]')
  .description('Lint a prompt string (use - to read from stdin)')
  .option('--fix', 'Apply auto-fixes and show rewritten prompt')
  .option('--format <mode>', 'Output format: default, json, compact', 'default')
  .option('--hook', 'Hook mode: lint results injected as context (non-blocking by default)')
  .option('--strict', 'Strict hook mode: block prompts with errors (requires --hook)')
  .action(async (promptArg: string | undefined, options: { fix: boolean; format: string; hook: boolean; strict: boolean }) => {
    let prompt: string;

    if (promptArg === '-' || promptArg === undefined) {
      const rawInput = await readStdin();
      if (options.hook) {
        try {
          const parsed = JSON.parse(rawInput) as { prompt?: string };
          prompt = parsed.prompt ?? '';
        } catch {
          prompt = rawInput;
        }
      } else {
        prompt = rawInput;
      }
    } else {
      prompt = promptArg;
    }

    if (!prompt.trim()) {
      process.exit(0);
    }

    const formatMode: FormatMode = options.hook ? 'compact' : (options.format as FormatMode);
    const config = loadConfig();

    if (options.hook) hookLog(`linting prompt (${prompt.length} chars)`);
    const results = lint(prompt, config);

    if (options.fix) {
      const { applyFixes } = await import('./fixer.js');
      const fixed = applyFixes(prompt, results, rules, config);
      if (!options.hook) {
        console.log('\nFixed prompt:\n');
        console.log(fixed);
        console.log('\nRe-linting fixed prompt:\n');
      }
      const fixedResults = lint(fixed, config);
      if (options.hook) {
        exitHookMode(fixedResults, VERSION, options.strict || (config.strict ?? false), config);
      }
      const output = format(fixedResults, formatMode, VERSION);
      if (output) console.log(output);
      const hasErrors = fixedResults.some((r) => !r.passed && r.severity === 'error');
      process.exit(hasErrors ? 1 : 0);
    }

    if (options.hook) {
      exitHookMode(results, VERSION, options.strict || (config.strict ?? false), config);
    }

    const output = format(results, formatMode, VERSION);
    if (output) console.log(output);

    const hasErrors = results.some((r) => !r.passed && r.severity === 'error');
    process.exit(hasErrors ? 1 : 0);
  });

program
  .command('explain <rule>')
  .description('Explain a specific rule')
  .action((ruleName: string) => {
    const rule = getRuleByName(ruleName);
    if (!rule) {
      console.error(`Unknown rule: ${ruleName}`);
      console.error(`Available rules: ${rules.map((r) => r.name).join(', ')}`);
      process.exit(1);
    }
    console.log(rule.explain());
  });

program
  .command('rules')
  .description('List all available rules')
  .action(() => {
    console.log(`${'Rule'.padEnd(30)} ${'Severity'.padEnd(10)} ${'Fix'.padEnd(5)} Description`);
    console.log('-'.repeat(80));
    for (const rule of rules) {
      const hasFix = rule.fix ? 'yes' : 'no';
      console.log(
        `${rule.name.padEnd(30)} ${rule.severity.padEnd(10)} ${hasFix.padEnd(5)} ${rule.description}`,
      );
    }
  });

program
  .command('init')
  .description('Initialize a .promptocop.yml in the current directory')
  .action(async () => {
    const { existsSync, writeFileSync } = await import('node:fs');
    if (existsSync('.promptocop.yml')) {
      console.error('.promptocop.yml already exists');
      process.exit(1);
    }
    const template = `extends:
  - promptocop:recommended

rules:
  no-vague-verb: error
  no-ambiguous-pronoun: error
  missing-success-criteria: error
  no-file-context: warn
  no-constraints: warn
  multi-task: error
  context-dump-risk: warn
  prefer-example: info

# options:
#   no-vague-verb:
#     additionalVerbs:
#       - "touch"
#       - "revisit"

# context:
#   mode: directive   # "directive" (default, actionable instructions for Claude) or "compact" (raw violation labels)
`;
    writeFileSync('.promptocop.yml', template, 'utf8');
    console.log('Created .promptocop.yml');
  });

program
  .command('hook')
  .description('Manage Claude Code hook integration')
  .addCommand(
    new Command('install')
      .description('Install the promptocop hook into ~/.claude/settings.json')
      .action(async () => {
        const { install } = await import('./hook/install.js');
        install();
      }),
  )
  .addCommand(
    new Command('uninstall')
      .description('Remove the promptocop hook from ~/.claude/settings.json')
      .action(async () => {
        const { uninstall } = await import('./hook/install.js');
        uninstall();
      }),
  );

function hookLog(message: string): void {
  process.stderr.write(`[promptocop] ${message}\n`);
}

function exitHookMode(results: LintResult[], version: string, strict: boolean, config: PromptocopConfig): never {
  const hasErrors = results.some((r) => !r.passed && r.severity === 'error');
  const hasFailures = results.some((r) => !r.passed);
  const formatMode: FormatMode = config.context?.mode === 'compact' ? 'compact' : 'directive';

  if (strict && hasErrors) {
    const output = format(results, formatMode, version);
    const errorCount = results.filter((r) => !r.passed && r.severity === 'error').length;
    hookLog(`blocked — ${errorCount} error${errorCount !== 1 ? 's' : ''} (strict mode)`);
    process.stderr.write(output + '\n');
    process.exit(2);
  } else if (hasFailures) {
    const text = format(results, formatMode, version);
    const errorCount = results.filter((r) => !r.passed && r.severity === 'error').length;
    const warnCount = results.filter((r) => !r.passed && r.severity === 'warn').length;
    const parts = [];
    if (errorCount) parts.push(`${errorCount} error${errorCount !== 1 ? 's' : ''}`);
    if (warnCount) parts.push(`${warnCount} warning${warnCount !== 1 ? 's' : ''}`);
    hookLog(`${parts.join(', ')} — injected as context`);
    process.stdout.write(JSON.stringify({ additionalContext: text }) + '\n');
    process.exit(0);
  } else {
    hookLog('passed (no violations)');
    process.exit(0);
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    let data = '';
    const rl = createInterface({ input: process.stdin });
    rl.on('line', (line) => (data += line + '\n'));
    rl.on('close', () => resolve(data.trim()));
  });
}

program.parseAsync();
