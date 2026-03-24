# Contributing to promptcop

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Prerequisites

- Node.js >=18
- npm >=8

## Dev setup

```bash
git clone https://github.com/victor-aguilars/promptcop.git
cd promptcop
npm install
npm test          # run all tests
npm run build     # compile TypeScript to dist/
npm run dev -- lint "your prompt"  # run from source with tsx
```

## Adding a rule

Each rule is a single file. Here's how to add one:

1. **Create the rule file** at `src/rules/<rule-name>.ts`. Implement the `Rule` interface from `src/types.ts`:

   ```ts
   import type { Rule } from '../types.js';

   const myRule: Rule = {
     name: 'my-rule',
     description: 'Short description of what this catches',
     severity: 'warn',
     check(prompt) {
       // return { passed: true } or { passed: false, message: '...' }
     },
     explain() {
       return 'Longer explanation shown by `promptcop explain my-rule`';
     },
   };

   export default myRule;
   ```

2. **Register the rule** in `src/rules/index.ts` — add it to the `rules` array.

3. **Add the rule to the recommended preset** in `src/presets/recommended.ts` with an appropriate default severity.

4. **Write tests** in `src/rules/__tests__/<rule-name>.test.ts`. Cover:
   - Basic violation case
   - Non-violation case
   - Edge cases
   - Fix output (if your rule implements `fix`)

5. **Run tests** to make sure everything passes: `npm test`

## Pull request guidelines

- One rule per PR — keeps review focused
- Tests are required; PRs without test coverage won't be merged
- Use conventional commit messages: `feat: add no-passive-voice rule`, `fix: handle multiline prompts in no-vague-verb`
- Run `promptcop lint` on your own commit messages and PR description before opening
- Add a changeset describing your change: `npx changeset`

## Submitting a changeset

This project uses [Changesets](https://github.com/changesets/changesets) for versioning.

Before opening a PR, run:

```bash
npx changeset
```

Follow the prompts to describe whether your change is a `patch`, `minor`, or `major` bump and what it does. Commit the generated file along with your changes.

## Reporting bugs

Open an issue at https://github.com/victor-aguilars/promptcop/issues. Include the prompt that triggered unexpected behavior and the output you got vs. what you expected.
