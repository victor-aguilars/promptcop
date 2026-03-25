<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img src="assets/logo.svg" alt="promptocop" height="120" />
  </picture>
</div>

A prompt linter for Claude Code. Catches bad prompt patterns before they reach the model — like ESLint, but for the things you type.

---

## Quick start

No install required:

```bash
npx promptocop lint "refactor the auth module"
```

For regular use, install globally:

```bash
npm install -g promptocop
promptocop lint "refactor the auth module"
```

**Example output:**

```
promptocop v0.1.1

✖ error   no-vague-verb                "refactor" needs a target, pattern, or goal
⚠ warning no-constraints               No constraints specified — consider adding limits, requirements, or restrictions
✓ pass   no-ambiguous-pronoun
✓ pass   missing-success-criteria
✓ pass   multi-task
✓ pass   no-file-context
✓ pass   context-dump-risk
✓ pass   prefer-example

1 error, 1 warning — run with --fix to attempt auto-fix
```

---

## Rules

| Rule | Severity | Auto-fix | What it catches |
|------|----------|----------|-----------------|
| `no-vague-verb` | error | yes | Vague verbs like "fix", "refactor", "improve" without a target or goal |
| `no-ambiguous-pronoun` | error | no | "it", "this", "that" as verb objects with no clear referent |
| `missing-success-criteria` | error | no | No definition of done — "so that", "should return", "verify that", etc. |
| `multi-task` | error | yes | Multiple independent tasks crammed into one prompt |
| `no-file-context` | warn | no | No file path, module, or code reference to narrow scope |
| `no-constraints` | warn | no | No constraints, limits, or requirements |
| `context-dump-risk` | warn | no | Pasted logs, large code blocks, or excessively long prompts |
| `prefer-example` | info | no | Long prompts with no example to illustrate the goal |

Run `promptocop explain <rule>` for details on any rule.

---

## Usage

```bash
# Lint a prompt string
promptocop lint "your prompt here"

# Lint from stdin
echo "fix the bug" | promptocop lint -

# Auto-fix — rewrites the prompt with placeholders where vague
promptocop lint "refactor the auth module" --fix

# JSON output (for scripting/tooling)
promptocop lint "your prompt" --format json

# List all rules with severities
promptocop rules

# Explain a rule
promptocop explain no-vague-verb

# Create a .promptocop.yml config in the current directory
promptocop init
```

---

## Configuration

Create a `.promptocop.yml` (or run `promptocop init`):

```yaml
extends:
  - promptocop:recommended

rules:
  no-vague-verb: error
  missing-success-criteria: off   # disable a rule
  prefer-example: warn            # change severity

# Block prompts with errors when used as a Claude Code hook:
# strict: true

# Disable conversation-aware classification:
# conversationAware: false

options:
  no-vague-verb:
    additionalVerbs:
      - "touch"
      - "revisit"
```

Config is resolved upward from the current directory, the same way ESLint does it. If no config is found, `promptocop:recommended` is used.

---

## Claude Code hook

Wire promptocop into Claude Code so it lints every prompt automatically before sending:

```bash
promptocop hook install
```

This adds a `UserPromptSubmit` hook to `~/.claude/settings.json`.

### Default mode (non-blocking)

Violations are surfaced as additional context — Claude sees the lint feedback alongside your prompt and can self-correct. The message is never blocked.

### Strict mode (blocking)

Enable `strict: true` in `.promptocop.yml` to block prompts with errors. Warnings remain non-blocking.

```yaml
# .promptocop.yml
strict: true
```

### Conversation-aware classification

The hook is smart about conversational replies that would generate false positives:

| Message type | Example | Behavior |
|---|---|---|
| Confirmation | "yes", "sounds good", "go ahead" | Skipped entirely |
| Follow-up | "now continue with authorization" | Context rules skipped |
| Standalone | "refactor src/auth.ts to use JWT" | Full lint |

The classifier reads the conversation transcript to improve accuracy — if Claude asked you a question and your reply is short, it's treated as a confirmation automatically.

To remove the hook:

```bash
promptocop hook uninstall
```

---

## Development

```bash
git clone <repo>
cd promptocop
npm install
npm test          # run all tests (vitest)
npm run build     # compile TypeScript to dist/
npm run dev -- lint "your prompt"   # run from source with tsx
```

Rules live in `src/rules/`, one file per rule. Each rule implements the `Rule` interface from `src/types.ts` and has a corresponding test in `src/rules/__tests__/`.
