import type { QualityReport, PromptMode } from '../core/types.js';

interface QualityInput {
  input: string;
  output: string;
  mode: PromptMode;
  tokenBudget: number;
}

const VAGUE_PATTERNS = [
  /\bdo something good\b/i,
  /\bmake it better\b/i,
  /\bimprove (?:the|this|it)\b/i,
  /\bfix (?:the|this|it)(?:\s|$)/i,
  /\bhandle (?:the|this|it) properly\b/i,
  /\badd (?:some|appropriate) (?:validation|error handling|tests)\b/i,
  /\betc\.?\b/i,
  /\band so on\b/i,
  /\bas needed\b/i,
  /\bas appropriate\b/i,
];

const SPECIFICITY_MARKERS = [
  /\b(?:must|shall|should|required|constraint|acceptance criteria)\b/i,
  /\b(?:input|output|returns?|accepts?|throws?|expects?)\b/i,
  /\b(?:\d+\s*(?:ms|seconds?|minutes?|MB|KB|items?|rows?|requests?))\b/i,
  /```[\s\S]*?```/,          // code blocks
  /\b(?:TypeScript|Python|JavaScript|Rust|Go|Java|SQL)\b/i,
  /\b(?:error|exception|failure|edge case|boundary|null|undefined|empty)\b/i,
];

function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

export function analyzeQuality(input: QualityInput): QualityReport {
  const tokenCount = estimateTokens(input.output);
  const budgetExceeded = tokenCount > input.tokenBudget;

  // Vague language detection
  const vagueLanguage: string[] = [];
  for (const pattern of VAGUE_PATTERNS) {
    const match = input.output.match(pattern);
    if (match) vagueLanguage.push(match[0]);
  }

  // Structural improvement check
  const structuralImprovement = checkStructuralImprovement(input.input, input.output);

  // Specificity markers
  const specificityMarkers: string[] = [];
  for (const pattern of SPECIFICITY_MARKERS) {
    const match = input.output.match(pattern);
    if (match) specificityMarkers.push(match[0]);
  }

  // Plan completeness (only for plan mode)
  let planComplete: boolean | null = null;
  if (input.mode === 'plan') {
    planComplete = checkPlanCompleteness(input.output);
  }

  const issues: string[] = [];
  if (budgetExceeded) issues.push(`Token budget exceeded: ~${tokenCount} tokens (budget: ${input.tokenBudget})`);
  if (vagueLanguage.length > 0) issues.push(`Vague language detected: ${vagueLanguage.join(', ')}`);
  if (!structuralImprovement) issues.push('No structural improvement over original input');
  if (specificityMarkers.length === 0) issues.push('Missing specificity markers (constraints, types, examples)');
  if (planComplete === false) issues.push('Plan is missing required TDD structure (files, test commands, commits)');

  const passed = issues.length === 0;

  return {
    passed,
    tokenCount,
    budgetExceeded,
    vagueLanguage,
    structuralImprovement,
    specificityMarkers,
    planComplete,
    issues,
  };
}

function checkStructuralImprovement(input: string, output: string): boolean {
  // Check that output is meaningfully different and more structured
  // If output is barely longer than input, no improvement
  if (output.length < input.length * 1.5) return false;

  // Check for structural elements
  const hasStructure =
    /\n\d+[\.\)]/m.test(output) ||      // numbered lists
    /\n[-*•]/m.test(output) ||           // bullet points
    /\n#+\s/m.test(output) ||            // headers
    /```/m.test(output) ||               // code blocks
    /\*\*[^*]+\*\*/m.test(output) ||     // bold sections
    /\b(Constraints?|Requirements?|Include|Provide|Must|Should):/i.test(output);

  return hasStructure;
}

function checkPlanCompleteness(output: string): boolean {
  // A complete plan task needs: Files section, test step, run command, expected output, commit
  const hasFiles = /\*\*Files:\*\*/i.test(output) || /- (?:Create|Modify|Test):\s*`/i.test(output);
  const hasTestStep = /(?:write|failing)\s+test/i.test(output);
  const hasRunCommand = /Run:\s*`/i.test(output) || /Run:\s*\S+/i.test(output);
  const hasExpected = /Expected:\s*/i.test(output);
  const hasCommit = /commit/i.test(output) && /git (?:add|commit)/i.test(output);

  return hasFiles && hasTestStep && hasRunCommand && hasExpected && hasCommit;
}
