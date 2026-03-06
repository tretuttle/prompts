# Contributing to Prompts

PRs welcome. Please open an issue first to discuss significant changes.

## Setup

```bash
git clone https://github.com/tretuttle/prompts
cd prompts
npm install
```

## Development Workflow

1. Create a feature branch from `master`
2. Write failing tests first (`npm test`)
3. Implement the feature
4. Verify all tests pass: `npm test`
5. Verify the build succeeds: `npm run build`
6. Open a PR

## Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Type check
npm run lint
```

## Building

```bash
npm run build
```

Output goes to `dist/`. The build uses tsup with ESM output targeting ES2022.

## Project Structure

```
src/
  core/       -- Config, context, engine, history, intent, templates, types
  modes/      -- Standard, research, execute, plan generators
  hooks/      -- Claude Code hook handlers (UserPromptSubmit, PreToolUse, PostToolUse, Stop)
  utils/      -- Quality analysis, anti-patterns, secrets, clipboard, orchestration
tests/        -- Mirrors src/ structure
shipped-rules/ -- Hookify .local.md rules copied to .claude/ on first run
```

## Conventions

- TypeScript with strict mode
- ESM modules (`"type": "module"`)
- Vitest for testing
- Conventional commits (`feat:`, `fix:`, `test:`, `docs:`)
- TDD approach: write the failing test, then implement

## Code Style

- No unnecessary abstractions -- three similar lines beat a premature helper
- Keep functions focused and small
- No emojis in source code user-facing strings (use plain text prefixes like `Warning:` or `[prompts]`)
- Avoid adding comments, docstrings, or type annotations to code you didn't change

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
