import type { HookifyRule } from '../core/types.js';
import { computeSimilarity } from '../core/history.js';

interface AntiPatternInput {
  input: string;
  output: string;
  tokenBudget: number;
  hookifyRules: HookifyRule[];
}

export interface AntiPattern {
  type: 'rewording' | 'budget-exceeded' | 'missing-criteria' | 'hookify-contradiction';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export function detectAntiPatterns(input: AntiPatternInput): AntiPattern[] {
  const patterns: AntiPattern[] = [];

  // Rewording without structural improvement
  const similarity = computeSimilarity(input.input, input.output);
  const outputHasStructure =
    /\n\d+[\.\)]/m.test(input.output) ||
    /\n[-*•]/m.test(input.output) ||
    /```/m.test(input.output) ||
    /\*\*[^*]+\*\*/m.test(input.output);

  if (similarity > 0.5 && !outputHasStructure) {
    patterns.push({
      type: 'rewording',
      message: 'Output appears to reword the input without adding meaningful structure.',
      severity: 'high',
    });
  }

  // Token budget exceeded
  const estimatedTokens = Math.ceil(input.output.length / 4);
  if (estimatedTokens > input.tokenBudget) {
    patterns.push({
      type: 'budget-exceeded',
      message: `Estimated ${estimatedTokens} tokens exceeds budget of ${input.tokenBudget}.`,
      severity: 'medium',
    });
  }

  // Missing acceptance criteria
  const hasCriteria =
    /\b(must|shall|should|required?|constraints?|acceptance|criteria|expected|asserts?|verify|tests?)\b/i.test(input.output) &&
    (
      /\n\d+[\.\)]/m.test(input.output) ||
      /\n[-*•]/m.test(input.output) ||
      /```/m.test(input.output)
    );

  if (!hasCriteria && input.output.length > 50) {
    patterns.push({
      type: 'missing-criteria',
      message: 'Output lacks actionable constraints or acceptance criteria.',
      severity: 'medium',
    });
  }

  // Hookify rule contradictions
  for (const rule of input.hookifyRules) {
    if (rule.action === 'block' || rule.action === 'warn') {
      for (const condition of rule.conditions) {
        if (condition.operator === 'not_contains') {
          const mentionsRequirement = input.output.toLowerCase().includes(condition.pattern.toLowerCase().replace(/\\./g, '.'));
          if (!mentionsRequirement && input.output.length > 100) {
            const fileTypeCondition = rule.conditions.find(c => c.field === 'file_path');
            if (!fileTypeCondition) {
              patterns.push({
                type: 'hookify-contradiction',
                message: `Output may contradict Hookify rule "${rule.name}": requires ${condition.pattern}`,
                severity: 'low',
              });
            }
          }
        }
      }
    }
  }

  return patterns;
}
