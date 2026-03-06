import type { ProjectContext, PluginConfig } from '../core/types.js';
import { classifyIntent } from '../core/intent.js';
import { formatContext } from '../core/context.js';

export function generateStandard(input: string, context: ProjectContext, config: PluginConfig): string {
  const intent = classifyIntent(input);
  const contextBlock = formatContext(context);

  const sections: string[] = [];

  sections.push(`## Task\n\n${input}`);

  if (contextBlock) {
    sections.push(`## Context\n\n${contextBlock}`);
  }

  // Intent-specific enhancements
  switch (intent) {
    case 'technical':
      sections.push(`## Requirements\n\n- Provide complete, working code (not pseudocode)\n- Include error handling for all failure modes\n- Add input validation where applicable\n- Follow the project's existing conventions and patterns\n- Include type annotations if using a typed language`);
      sections.push(`## Constraints\n\n- Target model: ${config.target_model}\n- Handle edge cases: null, undefined, empty, boundary values\n- Include a test strategy or example test cases`);
      break;
    case 'analytical':
      sections.push(`## Analysis Framework\n\n- Compare alternatives using concrete criteria\n- Include trade-offs for each approach\n- Provide a recommendation with justification\n- Consider: performance, maintainability, developer experience, ecosystem support`);
      break;
    case 'creative':
      sections.push(`## Creative Direction\n\n- Tone and audience specification\n- Structure and format requirements\n- Key points to include\n- Length target: appropriate for the medium`);
      break;
    case 'instructional':
      sections.push(`## Instruction Format\n\n- Step-by-step breakdown\n- Explain why, not just how\n- Include common pitfalls and how to avoid them\n- Provide verification steps to confirm success`);
      break;
  }

  // Hookify constraints
  if (context.hookifyRules.length > 0) {
    const constraints = context.hookifyRules
      .map(r => `- **${r.name}:** ${r.body.split('\n').filter(l => l.trim())[0]}`)
      .join('\n');
    sections.push(`## Project Constraints (from Hookify rules)\n\n${constraints}`);
  }

  return sections.join('\n\n');
}
