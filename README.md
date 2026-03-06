# @trents/prompts -- A Lightweight, but Powerful Plugin for Claude Code

> **Marketplace:** Claude Code Plugin Registry  
> **Version:** 2.0.0  
> **Author:** [Trent Tuttle](https://trents.tech)  
> **License:** MIT

Transform rough ideas into precision-engineered prompts. Prompts intercepts your natural language input, analyzes intent, infers missing context, and returns a battle-tested prompt optimized for the task at hand — all without leaving your Claude Code workflow. With native Hookify integration, it runs transparently on every prompt, self-corrects on failure, and enforces your project's quality rules as prompt constraints. Plan mode generates TDD-driven implementation plans with bite-sized tasks, exact file paths, and execution handoff — ready to feed directly into a subagent or parallel session.

---

## Features

- **Multi-mode output** — One plugin, four distinct prompt strategies (standard, research, execute, plan)
- **Intent detection** — Automatically classifies your prompt type (creative, technical, analytical, instructional) and optimizes accordingly
- **Context injection** — Pulls in relevant file context, active language, project structure, and Hookify rules to enrich the generated prompt
- **Plan generation** — Produces structured implementation plans with TDD task sequences, exact file paths, complete code blocks, and execution handoff options
- **Iterative refinement** — Chain calls with `--refine` to keep improving a prompt across multiple passes
- **Clipboard integration** — Automatically copies the improved prompt to your clipboard on exit
- **Token budget awareness** — Optimizes output length based on target model context window (configurable)
- **Template library** — Ships with 40+ built-in prompt templates for common dev tasks (debugging, refactoring, docs, tests, code review)
- **Prompt history** — Stores the last 50 generated prompts with full metadata in `.prompt-history.json`
- **Dry run mode** — Preview what the plugin *would* do without consuming tokens (`--dry-run`)
- **Model targeting** — Tailor output for specific models via `--target` (e.g., `--target claude-opus`, `--target gpt-4o`)
- **Transparent auto-optimization** — A `UserPromptSubmit` hook intercepts every prompt and runs it through Prompts before Claude sees it, with complexity gating so trivial inputs pass through untouched
- **Auto-mode routing** — Intent classification runs before Prompts and silently applies the right flag (`-r`, `-e`, `-p`) — no manual mode selection needed
- **Closed-loop refinement** — Watches for lint errors, test failures, and compilation errors via `PostToolUse`, then auto-triggers `--refine` with failure context injected
- **Output quality gate** — Self-QA layer that analyzes generated prompts for vague language, budget overruns, and missing specificity before results reach the user
- **Hookify rule constraints** — Reads Hookify `.local.md` rule files and bakes project-specific constraints directly into generated prompts as a declarative prompt policy layer
- **Secret leak prevention** — Scans outbound prompts for API keys, `.env` values, and sensitive file paths before anything leaves your machine
- **Prompt retrospectives** — On conversation end, analyzes the full exchange and stores "ideal prompt" reconstructions in history for future reuse
- **Duplicate prompt detection** — Checks incoming prompts against history and offers the refined version from last time instead of burning tokens on near-duplicates
- **Context injection validation** — Verifies injected project context is actually relevant, trimming bloat in monorepos and multi-service projects
- **Template auto-suggestion** — Analyzes completed conversations and suggests relevant templates for next time
- **Anti-pattern enforcement** — Blocks or warns when generated prompts match known anti-patterns like input rewording without structural improvement
- **Cross-plugin orchestration** — Bridges Prompts with other Claude Code plugins, piping execute-mode results into downstream tools and validating file references on stop
- **Shipped Hookify rules** — Installs a set of pre-built `.local.md` rules for secret scanning, anti-pattern detection, and plan validation out of the box

---

## Installation

```bash
claude plugin install prompts
```

Or from source:

```bash
git clone https://github.com/tretuttle/prompts
cd prompts
claude plugin install .
```

On first run, Prompts copies its shipped Hookify rules to `.claude/` in your project root. These rules are `.local.md` files and are git-ignored by convention — each developer gets their own copy to enable, disable, or customize.

---

## Usage

Send the Prompts what you would normally send in a normal prompt, receive an improved version back.

```
Create a chrome extension that can turn all other chrome extensions off temporarily.
```

The response you get is dependent on your mode of operation. **Standard** will take a best guess at what should be done before providing an exit signal, such as the improved prompt.

Using the command line flag `--research` or `-r` will create a prompt for you to send to another language model to conduct research on the topic.

Sending it with the flag `--execute` or `-e` will return a prompt that specifies what to do.

`--plan` or `-p` will return a structured implementation plan — a full TDD-driven task sequence with bite-sized steps, exact file paths, complete code blocks, test commands with expected output, and commit messages. Plans are saved to `docs/plans/YYYY-MM-DD-<feature-name>.md` and include an execution handoff so you can choose between subagent-driven implementation in the current session or a parallel session in a dedicated worktree.

---

## Modes Reference

| Flag | Alias | Output Style | Best For |
|---|---|---|---|
| *(none)* | — | Standard improved prompt | General use, quick iteration |
| `--research` | `-r` | Research brief prompt | Exploring unknowns, comparing approaches |
| `--execute` | `-e` | Execution-ready prompt | Direct implementation tasks |
| `--plan` | `-p` | TDD implementation plan | Architecture, PRDs, sprint planning, multi-step features |
| `--refine` | — | Iteratively improves last output | Multi-pass prompt tuning |
| `--dry-run` | — | Shows analysis only, no output | Debugging plugin behavior |

---

## Plan Mode

Plan mode is the most opinionated output strategy. When you pass `--plan` or `-p`, Prompts doesn't just generate a better prompt — it produces a complete implementation plan designed to be executed by an engineer (or agent) with zero context for your codebase.

### Plan Output Format

Every plan starts with a structured header:

```markdown
# [Feature Name] Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

### Task Structure

Each task in the plan follows a strict TDD sequence. Steps are bite-sized — one action each, 2-5 minutes of work:

````markdown
### Task 1: [Component Name]

**Files:**
- Create: `src/services/auth.ts`
- Modify: `src/routes/index.ts:45-62`
- Test: `tests/services/auth.test.ts`

**Step 1: Write the failing test**

```typescript
describe('AuthService', () => {
  it('should reject expired tokens', () => {
    const result = AuthService.validate(expiredToken);
    expect(result.valid).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/services/auth.test.ts --grep "expired tokens"`
Expected: FAIL with "AuthService is not defined"

**Step 3: Write minimal implementation**

```typescript
export class AuthService {
  static validate(token: string): { valid: boolean } {
    const decoded = jwt.decode(token);
    return { valid: decoded.exp > Date.now() / 1000 };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/services/auth.test.ts --grep "expired tokens"`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/auth.ts tests/services/auth.test.ts
git commit -m "feat(auth): add token expiration validation"
```
````

### Plan Principles

Plans are generated with these constraints baked in:

- **Exact file paths always** — No "create a file somewhere for this." Every file is a concrete path.
- **Complete code in plan** — Not "add validation." The actual code, ready to paste.
- **Exact commands with expected output** — Every test run includes what success and failure look like.
- **DRY, YAGNI, TDD** — No speculative abstractions, no premature optimization, tests first.
- **Frequent commits** — Every task ends with a commit. Small, atomic, revertable.

### Execution Handoff

After the plan is saved, Prompts offers an execution choice:

```
 Plan complete and saved to docs/plans/2025-06-15-jwt-auth.md

  Two execution options:

  1. Subagent-Driven (this session)
     Fresh subagent per task, code review between tasks, fast iteration.

  2. Parallel Session (separate)
     Open a new session in the worktree with executing-plans skill.

  Which approach?
```

**Subagent-driven** stays in the current session and dispatches a fresh subagent for each task, with code review gates between them. **Parallel session** guides you to open a new Claude Code session in a dedicated worktree for batch execution with checkpoints.

### Hookify Constraints in Plans

When `hookify_constraints` is enabled, plan mode reads your active Hookify rules and embeds them as constraints in the generated plan. If you have a rule enforcing Zod validation in TypeScript files, the plan's implementation steps will include Zod schemas. If you have a rule blocking `console.log`, the plan won't generate any.

---

## Configuration

Create a `.promptcreator.json` in your project root or home directory:

```json
{
  "target_model": "claude-sonnet",
  "context_depth": "project",
  "token_budget": 4096,
  "auto_clipboard": true,
  "history_limit": 50,
  "default_mode": "standard",
  "template_dir": "~/.prompts/templates",
  "plan_output_dir": "docs/plans",
  "plan_tdd": true,
  "plan_commit_style": "conventional",
  "auto_optimize": false,
  "auto_mode_routing": false,
  "auto_refine_on_failure": false,
  "quality_gate": true,
  "hookify_constraints": false,
  "secret_scan": true,
  "retrospectives": false,
  "dedup": true,
  "template_suggestions": true,
  "anti_pattern_check": true,
  "orchestration": false
}
```

### Config Options

| Key | Type | Default | Description |
|---|---|---|---|
| `target_model` | string | `"claude-sonnet"` | Model the generated prompt is intended for |
| `context_depth` | string | `"file"` | Scope of context injection: `"none"`, `"file"`, `"project"` |
| `token_budget` | number | `4096` | Max token target for generated prompt |
| `auto_clipboard` | boolean | `true` | Copy result to clipboard automatically |
| `history_limit` | number | `50` | Max number of prompts stored in history |
| `default_mode` | string | `"standard"` | Default mode when no flag is passed |
| `template_dir` | string | `null` | Path to custom template directory |
| `plan_output_dir` | string | `"docs/plans"` | Directory for saved plan files |
| `plan_tdd` | boolean | `true` | Enforce TDD task structure in plan output |
| `plan_commit_style` | string | `"conventional"` | Commit message style: `"conventional"`, `"gitmoji"`, `"plain"` |
| `auto_optimize` | boolean | `false` | Run Prompts on every prompt via `UserPromptSubmit` hook |
| `auto_mode_routing` | boolean | `false` | Classify intent and apply mode flags automatically |
| `auto_refine_on_failure` | boolean | `false` | Trigger `--refine` when downstream failures are detected |
| `quality_gate` | boolean | `false` | Analyze output quality before returning results |
| `hookify_constraints` | boolean | `false` | Read Hookify rules as prompt constraints |
| `secret_scan` | boolean | `true` | Scan outbound prompts for secrets and credentials |
| `retrospectives` | boolean | `false` | Generate ideal-prompt reconstructions on conversation end |
| `dedup` | boolean | `true` | Check for similar prompts in history before processing |
| `template_suggestions` | boolean | `true` | Suggest templates after untemplatized conversations |
| `anti_pattern_check` | boolean | `true` | Check output against known prompt anti-patterns |
| `orchestration` | boolean | `false` | Enable cross-plugin piping after execute mode |

See [Hooks Configuration Reference](#hooks-configuration-reference) for the full list of hook-specific options including thresholds and action types.

---

## Context Injection

When `context_depth` is set to `"file"` or `"project"`, Prompts enriches your prompt with:

- **Active file** — Current open file name, language, and relevant code snippet
- **Project structure** — Top-level directory tree (depth 2)
- **Active errors** — Any diagnostics currently present in the editor
- **Git context** — Current branch name and last commit message
- **Hookify rules** — When `hookify_constraints` is enabled, all active `.claude/hookify.*.local.md` rule bodies are parsed and injected as prompt constraints

This allows the generated prompt to be far more specific than what you typed, without requiring you to manually copy-paste context. In plan mode, context injection also informs file path resolution — the plan references real paths in your project, not guesses.

### Context Validation

When `context_depth` is `"project"`, Prompts validates that the injected context is actually relevant before assembling the prompt. In monorepos and multi-service projects, this prevents context bloat — if you're editing a single Python file, you don't get the entire directory tree for 15 unrelated services. Validation runs automatically and trims irrelevant context before it inflates your token budget.

Configure the sensitivity threshold in `.promptcreator.json`:

```json
{
  "context_validation": true,
  "context_relevance_threshold": 0.6
}
```

---

## Hooks Integration

Prompts ships with a set of hooks that integrate with Claude Code's hook system and [Hookify](https://github.com/tretuttle/hookify-claude-plugin). These hooks run on `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, and `Stop` events to automate prompt optimization, enforce quality standards, and close feedback loops — all without manual intervention.

The plugin also ships pre-built Hookify rule files that implement several of these behaviors as `.local.md` rules. These are copied to `.claude/` on first run and can be enabled, disabled, or customized per-developer without affecting the rest of the team.

### Transparent Auto-Optimization

A `UserPromptSubmit` hook intercepts every prompt and runs it through Prompts before Claude sees it. Raw input goes in, optimized prompt comes out. A complexity threshold gates the behavior so trivial inputs like `"list files"` or `"yes"` pass through untouched.

```json
{
  "auto_optimize": true,
  "complexity_threshold": 0.3
}
```

When `auto_optimize` is enabled, you never need to explicitly invoke the plugin — it runs transparently on every qualifying prompt.

### Auto-Mode Routing

Extension of auto-optimization. The `UserPromptSubmit` hook classifies intent before Prompts runs and silently applies the right flag. You type `"what's the best way to handle auth in this stack"` and it detects research intent, applies `-r`. You type `"add rate limiting to this endpoint"` and it applies `-e`. You type `"build a billing system with Stripe integration"` and it detects multi-step complexity, applies `-p` and generates a full implementation plan.

```json
{
  "auto_mode_routing": true
}
```

The classifier uses the same intent detection engine as Prompts's core, but runs as a lightweight pre-pass. When `auto_mode_routing` is enabled, the `default_mode` config option is ignored in favor of the classified result. Plan mode is triggered when the classifier detects multi-step scope, architectural decisions, or implementation requests that span multiple files.

### Closed-Loop Refinement

A `PostToolUse` hook watches for failure signals after Claude acts on a prompt — lint errors after a file write, test failures after code generation, compilation errors. When failures are detected, the hook automatically triggers `--refine` on the original prompt with the failure context injected. This turns Prompts from a one-shot tool into a feedback system that self-corrects at the prompt level rather than retrying blindly.

```json
{
  "auto_refine_on_failure": true,
  "max_refine_passes": 3
}
```

The `max_refine_passes` option prevents infinite loops. After the limit is reached, Prompts surfaces the failure context and the best prompt variant it produced.

In plan mode, closed-loop refinement operates at the task level — if a plan step's test fails, the hook refines that specific task rather than regenerating the entire plan.

### Output Quality Gate

A `PostToolUse` hook that analyzes Prompts's own output for quality signals before the result reaches the user:

- **Token budget compliance** — Warns if the generated prompt exceeds `token_budget`
- **Vague language detection** — Flags prompts containing non-specific language like "do something good" or "make it better"
- **Structural improvement check** — Verifies the output adds meaningful structure beyond rewording the input
- **Specificity markers** — Checks for the presence of concrete constraints, formats, or acceptance criteria
- **Plan completeness** — In plan mode, verifies every task has file paths, test commands, expected output, and a commit step

```json
{
  "quality_gate": true,
  "quality_gate_action": "warn"
}
```

Set `quality_gate_action` to `"refine"` to automatically chain into `--refine` when quality is low, or `"warn"` to surface the issue and let you decide.

### Hookify Rule Constraints

When [Hookify](https://github.com/tretuttle/hookify-claude-plugin) is installed, Prompts reads your `.claude/hookify.*.local.md` rule files and bakes project-specific constraints directly into generated prompts. Your Hookify rules become a declarative prompt policy layer — safety and quality rules share the same source of truth as prompt optimization.

For example, if you have a Hookify rule like:

```markdown
---
name: enforce-zod-validation
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.tsx?$
  - field: new_text
    operator: not_contains
    pattern: z\.object\(|z\.string\(|z\.number\(
action: warn
---

 **Missing Zod validation.**

TypeScript files in this project must use Zod for runtime validation of external inputs.

**Required:**
- Define a Zod schema for all API request/response types
- Use `.parse()` or `.safeParse()` at trust boundaries
- Co-locate schemas with the types they validate
```

Prompts's context injection parses this rule and includes the constraint in any generated prompt targeting TypeScript files. In execute mode, the optimized prompt will specify Zod usage. In plan mode, every task that creates or modifies a `.ts` file will include Zod schema steps — the rule body becomes a prompt directive without any additional configuration.

```json
{
  "hookify_constraints": true
}
```

### Secret Leak Prevention

A `PreToolUse` hook intercepts outbound prompts and scans for sensitive content before anything leaves your machine. This is especially important when `context_depth` is `"project"` — context injection pulls in project structure, git state, and file snippets, which can accidentally include secrets.

Prompts ships a pre-built Hookify rule for this at `.claude/hookify.secret-scan.local.md`:

```markdown
---
name: block-secret-leak
enabled: true
event: all
conditions:
  - field: command
    operator: regex_match
    pattern: (AKIA[0-9A-Z]{16}|sk-live-[a-zA-Z0-9]+|ghp_[a-zA-Z0-9]+|glpat-[a-zA-Z0-9-]+|-----BEGIN\s+(RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY-----)
action: block
---

 **Secret detected in outbound content.**

A credential or private key pattern was found. This content will not be sent.

**Detected pattern types:**
- AWS access keys (`AKIA...`)
- API tokens (`sk-live-`, `ghp_`, `glpat-`)
- Private key blocks

Remove the sensitive content and retry.
```

Extend the default set by adding custom regex patterns in config or creating additional `.local.md` rules:

```json
{
  "secret_scan": true,
  "secret_scan_action": "block",
  "secret_patterns": ["PRIVATE_TOKEN\\s*=\\s*['\"]"]
}
```

Set `secret_scan_action` to `"block"` to prevent the prompt from being sent, or `"warn"` to flag it and let you proceed.

### Prompt Retrospectives

A `Stop` hook that fires when a conversation ends. It analyzes the full exchange — what you asked, what Claude did, where it struggled, what worked — and reconstructs the ideal prompt you *should* have sent. This reconstructed prompt is stored in `.prompt-history.json` with a `retrospective: true` flag.

```json
{
  "retrospectives": true
}
```

Over time, your prompt history becomes a curated library of known-good prompts for your actual project patterns. Access retrospective entries directly:

```bash
claude prompts --history --retrospectives
```

For plan mode conversations, the retrospective includes the ideal `--plan` invocation and notes which tasks could have been scoped differently — essentially a meta-plan for how to plan better next time.

### Duplicate Prompt Detection

A `UserPromptSubmit` hook that checks incoming prompts against `.prompt-history.json` using similarity scoring. If you're about to send something very similar to a previous prompt, it warns you and offers the refined version from last time instead of burning tokens on a near-duplicate.

```json
{
  "dedup": true,
  "dedup_threshold": 0.85
}
```

The `dedup_threshold` controls sensitivity — `0.85` (default) catches near-identical prompts, lower values catch broader similarities. When a match is found, you're offered three options: use the previous result, refine the previous result, or proceed with the new prompt anyway.

### Template Auto-Suggestion

A `Stop` hook that analyzes completed conversations where no template was used. If the conversation matches a known template pattern, it suggests the template for next time.

```
 You just did a manual code review.
  Next time, try: claude prompts --template code-review "file.ts"
```

For multi-step conversations that could have been plans:

```
 This conversation touched 7 files across 4 directories.
  Next time, try: claude prompts -p "your task description"
  Plan mode would have generated a structured task sequence with TDD steps.
```

```json
{
  "template_suggestions": true
}
```

Suggestions are non-blocking and appear after the conversation ends. Dismiss with `--no-suggestions` if you prefer silence.

### Anti-Pattern Enforcement

A `Stop` hook backed by a shipped Hookify rule at `.claude/hookify.anti-pattern.local.md`:

```markdown
---
name: block-prompt-anti-patterns
enabled: true
event: stop
conditions:
  - field: command
    operator: regex_match
    pattern: .*
action: warn
---

 **Prompt quality check triggered.**

Before finalizing, verify this prompt does not:
- Reword the input without adding structure
- Exceed the configured token budget
- Omit actionable constraints or acceptance criteria
- Contradict active Hookify rules

If any of the above apply, consider running `--refine` before using this prompt.
```

The hook checks generated prompts against these anti-patterns programmatically. The rule file serves as the human-readable policy document — the actual detection logic runs in the plugin's quality engine.

```json
{
  "anti_pattern_check": true,
  "anti_pattern_action": "warn"
}
```

Set `anti_pattern_action` to `"block"` to prevent low-quality prompts from being copied to clipboard, or `"warn"` to flag and allow.

### Cross-Plugin Orchestration

Hooks that bridge Prompts with other Claude Code plugins in your workflow. A `PostToolUse` hook after `--execute` mode can automatically pipe the result into the next plugin in the chain — linters, test runners, deploy tools. A `Stop` hook validates that execute-mode prompts reference the correct files before you act on them.

```json
{
  "orchestration": true,
  "orchestration_chain": ["lint", "test"]
}
```

The `orchestration_chain` defines the order of downstream plugins to invoke after Prompts produces an execute-mode result. Plugins are invoked by their registered Claude Code plugin name.

In plan mode, orchestration works at the task level — each task's commit step can trigger the chain, so lint and test run after every atomic change rather than only at the end.

### Shipped Hookify Rules

Prompts installs the following `.local.md` rules to `.claude/` on first run:

| Rule File | Event | Action | Purpose |
|---|---|---|---|
| `hookify.secret-scan.local.md` | `all` | `block` | Detect credentials and private keys in outbound content |
| `hookify.anti-pattern.local.md` | `stop` | `warn` | Check for low-quality prompt patterns before finalization |
| `hookify.plan-validation.local.md` | `file` | `warn` | Verify plan output includes required TDD structure |
| `hookify.context-bloat.local.md` | `prompt` | `warn` | Flag prompts with excessive injected context |
| `hookify.refine-suggestion.local.md` | `stop` | `warn` | Suggest `--refine` when output quality is borderline |

All shipped rules default to `enabled: true` but can be toggled by setting `enabled: false` in the frontmatter or by running `/hookify:configure` if Hookify is installed.

### Writing Custom Rules

Prompts respects any Hookify rule in `.claude/hookify.*.local.md`. To create project-specific constraints that feed into prompt generation, write a rule file with the standard Hookify format:

```markdown
---
name: require-error-boundaries
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.tsx$
  - field: new_text
    operator: not_contains
    pattern: ErrorBoundary
action: warn
---

 **Missing error boundary.**

All React component files in this project must be wrapped in an ErrorBoundary.

**Required pattern:**
- Import `ErrorBoundary` from `@/components/ErrorBoundary`
- Wrap the default export in `<ErrorBoundary>`
- Include a `fallback` prop with a meaningful error state
```

When `hookify_constraints` is enabled, Prompts reads the rule body and embeds the requirement into any prompt or plan that targets `.tsx` files. The rule does double duty — it catches violations at write time via Hookify's `file` event *and* prevents violations at prompt time by baking the constraint into the generated output.

### Hooks Configuration Reference

| Key | Type | Default | Description |
|---|---|---|---|
| `auto_optimize` | boolean | `false` | Run Prompts on every prompt transparently |
| `complexity_threshold` | number | `0.3` | Minimum complexity score to trigger auto-optimization |
| `auto_mode_routing` | boolean | `false` | Classify intent and apply mode flags automatically |
| `auto_refine_on_failure` | boolean | `false` | Trigger `--refine` when downstream failures are detected |
| `max_refine_passes` | number | `3` | Max auto-refinement iterations before surfacing failure |
| `quality_gate` | boolean | `false` | Analyze output quality before returning results |
| `quality_gate_action` | string | `"warn"` | `"warn"` or `"refine"` on quality failure |
| `hookify_constraints` | boolean | `false` | Read Hookify rules as prompt constraints |
| `secret_scan` | boolean | `true` | Scan outbound prompts for secrets and credentials |
| `secret_scan_action` | string | `"block"` | `"block"` or `"warn"` on secret detection |
| `secret_patterns` | array | `[]` | Additional regex patterns to scan for |
| `retrospectives` | boolean | `false` | Generate ideal-prompt reconstructions on conversation end |
| `dedup` | boolean | `true` | Check for similar prompts in history before processing |
| `dedup_threshold` | number | `0.85` | Similarity threshold for duplicate detection |
| `template_suggestions` | boolean | `true` | Suggest templates after conversations that could have used one |
| `anti_pattern_check` | boolean | `true` | Check output against known anti-patterns |
| `anti_pattern_action` | string | `"warn"` | `"warn"` or `"block"` on anti-pattern detection |
| `orchestration` | boolean | `false` | Enable cross-plugin piping after execute mode |
| `orchestration_chain` | array | `[]` | Ordered list of downstream plugin names |
| `context_validation` | boolean | `true` | Validate relevance of injected project context |
| `context_relevance_threshold` | number | `0.6` | Minimum relevance score for context inclusion |

---

## Template Library

Access built-in templates with the `--template` flag:

```bash
claude prompts --template debug
claude prompts --template refactor
claude prompts --template unit-test
claude prompts --template code-review
claude prompts --template docs
claude prompts --template plan-feature
claude prompts --template plan-migration
```

The `plan-feature` and `plan-migration` templates produce implementation plans with pre-configured task structures tailored to greenfield features and data/schema migrations respectively.

List all available templates:

```bash
claude prompts --list-templates
```

Add your own by placing `.prompt.md` files in your configured `template_dir`.

---

## Prompt History

View your recent prompt history:

```bash
claude prompts --history
```

Re-run a previous prompt by index:

```bash
claude prompts --history 3
```

View only retrospective entries (ideal prompts reconstructed from completed conversations):

```bash
claude prompts --history --retrospectives
```

View only plan-mode entries:

```bash
claude prompts --history --plans
```

Clear history:

```bash
claude prompts --clear-history
```

History is stored locally at `.prompt-history.json` and never leaves your machine.

---

## Examples

**Standard mode:**
```bash
claude prompts "Write a function that parses CSV files"
```

**Research mode:**
```bash
claude prompts -r "Best approach for state management in large React apps"
```

**Execute mode:**
```bash
claude prompts -e "Add rate limiting to my Express API"
```

**Plan mode:**
```bash
claude prompts -p "Build a multi-tenant SaaS billing system"
# → Generates a full implementation plan with TDD tasks, saves to docs/plans/,
# and offers subagent-driven or parallel session execution.
```

**Plan mode with Hookify constraints:**
```bash
# If .claude/hookify.enforce-zod.local.md exists, the generated plan will
# include Zod schema steps in every task that touches TypeScript files.
claude prompts -p "Add user registration with email verification"
```

**With model targeting:**
```bash
claude prompts -e "Optimize this SQL query" --target claude-opus
```

**With a template:**
```bash
claude prompts --template unit-test "UserAuthService.ts"
```

**With a plan template:**
```bash
claude prompts --template plan-migration "Migrate user table from MySQL to Postgres"
```

**With auto-optimization (transparent — no explicit invocation needed):**
```bash
# Just type normally. The UserPromptSubmit hook intercepts and optimizes.
claude "refactor this auth module to use JWTs"
# → Prompts detects execute intent, applies -e, optimizes, and forwards.
```

**Auto-routing into plan mode:**
```bash
# Multi-step complexity triggers plan mode automatically.
claude "build a notification system with email, SMS, and push channels"
# → Prompts detects multi-step scope, applies -p, generates implementation plan.
```

**View retrospective prompts:**
```bash
claude prompts --history --retrospectives
```

**With duplicate detection (automatic):**
```bash
# If you've recently optimized a similar prompt, you'll see:
# Similar prompt found in history (92% match).
# Use previous result? [y/n/refine]
claude prompts "Add rate limiting to the Express API"
```

**With cross-plugin orchestration:**
```bash
# After execute mode, results pipe into lint and test plugins automatically.
claude prompts -e "Add pagination to the /users endpoint" --orchestrate
```

**Writing a custom Hookify rule for prompt constraints:**
```bash
# Create a rule that enforces error boundaries in React components.
# When hookify_constraints is enabled, Prompts reads this rule
# and bakes it into any prompt or plan targeting .tsx files.
cat > .claude/hookify.require-error-boundaries.local.md << 'EOF'
---
name: require-error-boundaries
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.tsx$
  - field: new_text
    operator: not_contains
    pattern: ErrorBoundary
action: warn
---

All React component files must include an ErrorBoundary wrapper.
EOF
```

---

## Development

```bash
# Clone and install deps
git clone https://github.com/tretuttle/prompts
cd prompts
npm install

# Run tests
npm test

# Build
npm run build

# Local install for testing
claude plugin install . --dev
```

---

## Roadmap

- [ ] `--compare` mode — generate multiple prompt variants side by side
- [ ] VS Code extension wrapper
- [ ] Web UI for template management
- [ ] LangChain / LlamaIndex chain export
- [ ] Prompt scoring / quality rating on output
- [ ] Team-shared template registries via URL
- [ ] Plan dependency graphs — visualize task ordering and parallelization opportunities
- [ ] Hookify rule generator — analyze past failures and auto-generate preventive rules

---

## Contributing

PRs welcome. Please open an issue first to discuss significant changes. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT © [Trent Tuttle](https://trents.tech)