import type { ProjectContext, PluginConfig } from '../core/types.js';
import { formatContext } from '../core/context.js';

export function generateExecute(input: string, context: ProjectContext, config: PluginConfig): string {
  const contextBlock = formatContext(context);

  const sections: string[] = [];

  sections.push(`## Implementation Task\n\n${input}`);

  if (contextBlock) {
    sections.push(`## Context\n\n${contextBlock}`);
  }

  sections.push(`## Implementation Requirements

- **Complete code** — Provide full, working implementation (not pseudocode or snippets)
- **File paths** — Specify exact file paths for every new or modified file
- **Error handling** — Handle all failure modes with appropriate error types
- **Input validation** — Validate all external inputs at trust boundaries
- **Tests** — Include test code that covers happy path, error cases, and edge cases
- **Step-by-step** — If implementation spans multiple files, provide clear ordering`);

  sections.push(`## Constraints

- Target model: ${config.target_model}
- Follow existing project conventions
- No breaking changes to existing interfaces
- Atomic changes — each step should be independently verifiable`);

  if (context.hookifyRules.length > 0) {
    const constraints = context.hookifyRules
      .map(r => `- **${r.name}:** ${r.body.split('\n').filter(l => l.trim())[0]}`)
      .join('\n');
    sections.push(`## Project Constraints (Hookify)\n\n${constraints}`);
  }

  return sections.join('\n\n');
}
