import type { ProjectContext, PluginConfig } from '../core/types.js';
import { formatContext } from '../core/context.js';

export function generateResearch(input: string, context: ProjectContext, config: PluginConfig): string {
  const contextBlock = formatContext(context);

  const sections: string[] = [];

  sections.push(`## Research Objective\n\n${input}`);

  if (contextBlock) {
    sections.push(`## Project Context\n\n${contextBlock}`);
  }

  sections.push(`## Research Requirements

- **Compare** at least 3 alternatives or approaches
- **Evaluate** each against these criteria:
  - Performance characteristics
  - Developer experience and learning curve
  - Ecosystem maturity and community support
  - Maintenance burden and long-term viability
  - Integration complexity with existing stack
- **Trade-offs:** Explicitly state what you gain and lose with each option
- **Recommendation:** Provide a ranked recommendation with clear justification
- **Evidence:** Cite specific benchmarks, adoption metrics, or case studies where possible`);

  sections.push(`## Output Format

- Start with a one-paragraph executive summary
- Use a comparison table for structured criteria evaluation
- End with a concrete recommendation and next steps
- Target model: ${config.target_model}`);

  if (context.hookifyRules.length > 0) {
    const constraints = context.hookifyRules
      .map(r => `- ${r.body.split('\n').filter(l => l.trim())[0]}`)
      .join('\n');
    sections.push(`## Project Constraints\n\n${constraints}`);
  }

  return sections.join('\n\n');
}
