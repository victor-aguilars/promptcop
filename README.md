<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img src="assets/logo.svg" alt="promptocop" height="120" />
  </picture>
</div>

A prompt linter for Claude Code. Analyzes your prompts for anti-patterns and surfaces issues as context for the model — like ESLint, but for the things you type.

---

## Setup with Claude Code

Install the hook and every prompt you send gets linted automatically:

```bash
npx promptocop hook install
```

This adds a `UserPromptSubmit` hook to `~/.claude/settings.json`. When a prompt has issues, the lint results are injected as context so Claude can factor them into its response — nothing is blocked by default.

To remove:

```bash
npx promptocop hook uninstall
```

### How it works

Violations are surfaced as advisory metadata alongside your prompt. Claude sees the findings and decides what to act on based on conversation context:

```
[promptocop] The user's prompt was flagged by a prompt linter. Below are
potential gaps — if any are not already resolved by conversation context,
factor them into your response.

Likely to cause problems without clarification (ask the user if unclear):
- The verb "fix" may be too vague without a specific target or goal.

May reduce response quality (mention if relevant):
- No file path or module identifier was detected in the prompt.
```

| Severity | Behavior |
|---|---|
| `error` | Ask the user to clarify if not already clear from conversation |
| `warn` | Mention gaps if relevant to the response |
| `info` | Suggest improvements the user could consider |

---

## Standalone CLI

You can also run promptocop directly without the hook:

```bash
npx promptocop lint "refactor the auth module"
```

**Example output:**

```
promptocop v0.1.3

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

```bash
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

## Configuration

Create a `.promptocop.yml` (or run `promptocop init`):

```yaml
extends:
  - promptocop:recommended

rules:
  no-vague-verb: error
  missing-success-criteria: off   # disable a rule
  prefer-example: warn            # change severity

options:
  no-vague-verb:
    additionalVerbs:
      - "touch"
      - "revisit"
```

Config is resolved upward from the current directory, the same way ESLint does it. If no config is found, `promptocop:recommended` is used.

To switch hook output to compact violation labels instead of advisory directives:

```yaml
context:
  mode: compact
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
