import type { IntentType, PromptMode } from './types.js';

// ── Keyword banks ──

const TECHNICAL_SIGNALS = [
  /\b(add|implement|create|build|fix|refactor|optimize|deploy|configure|set\s?up|write|install|migrate|update|remove|delete|replace)\b/i,
  /\b(function|class|module|component|endpoint|api|service|handler|middleware|route|schema|model|controller)\b/i,
  /\b(bug|error|crash|issue|broken|failing)\b/i,
];

const ANALYTICAL_SIGNALS = [
  /\b(compare|contrast|analyze|evaluate|assess|review|benchmark|trade-?offs?|pros?\s+and\s+cons?|which\s+is\s+better|advantages|disadvantages)\b/i,
  /\b(vs\.?|versus)\b/i,
];

const CREATIVE_SIGNALS = [
  /\b(write|draft|compose|blog|post|article|story|essay|poem|copy|content|describe|narrative)\b/i,
  /\b(creative|engaging|compelling|tone|voice|style)\b/i,
];

const INSTRUCTIONAL_SIGNALS = [
  /\b(how\s+(do|to|can|should)|explain|teach|guide|walk\s+me|tutorial|steps?\s+to|show\s+me\s+how)\b/i,
  /\b(what\s+is|what\s+are|why\s+(does|do|is|are)|when\s+should)\b/i,
];

const RESEARCH_SIGNALS = [
  /\b(best\s+(way|approach|practice|option)|what('s|\s+is)\s+the\s+best|explore|investigate|research|survey|landscape|alternatives|options|state\s+of\s+the\s+art)\b/i,
  /\b(how\s+does|how\s+do\s+(?:people|teams|companies))\b/i,
];

const EXECUTE_SIGNALS = [
  /\b(add|implement|fix|refactor|optimize|deploy|configure|set\s?up|install|migrate|update|remove|delete|replace|connect|integrate|enable)\b/i,
];

const PLAN_SIGNALS = [
  /\b(build|architect|design|plan|system|platform|infrastructure|pipeline)\b/i,
  /\b(with\s+.+,\s*.+\s+and\s+)/i,  // "with X, Y, and Z" = multi-component
  /\b(multi-?\s*(tenant|step|service|component|phase|stage))\b/i,
  /\b(end.to.end|full.stack|from\s+scratch)\b/i,
];

function scoreSignals(input: string, patterns: RegExp[]): number {
  let hits = 0;
  for (const p of patterns) {
    if (p.test(input)) hits++;
  }
  return hits / Math.max(patterns.length, 1);
}

export function classifyIntent(input: string): IntentType {
  const scores: Record<IntentType, number> = {
    technical: scoreSignals(input, TECHNICAL_SIGNALS),
    analytical: scoreSignals(input, ANALYTICAL_SIGNALS),
    creative: scoreSignals(input, CREATIVE_SIGNALS),
    instructional: scoreSignals(input, INSTRUCTIONAL_SIGNALS),
  };

  let best: IntentType = 'technical';
  let bestScore = -1;
  for (const [intent, score] of Object.entries(scores) as [IntentType, number][]) {
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }
  return best;
}

export function detectAutoMode(input: string): PromptMode {
  const planScore = scoreSignals(input, PLAN_SIGNALS);
  const researchScore = scoreSignals(input, RESEARCH_SIGNALS);
  const executeScore = scoreSignals(input, EXECUTE_SIGNALS);

  // Plan requires highest confidence — multi-step indicators
  if (planScore > 0.3 && planScore >= researchScore && planScore >= executeScore) {
    return 'plan';
  }
  if (researchScore > 0.3 && researchScore >= executeScore) {
    return 'research';
  }
  if (executeScore > 0.3) {
    return 'execute';
  }
  return 'standard';
}

export function computeComplexity(input: string): number {
  const wordCount = input.trim().split(/\s+/).length;
  const hasCodeTerms = /\b(function|class|module|api|component|service|interface|type|schema|endpoint|database|model)\b/i.test(input);
  const hasMultipleClauses = (input.match(/,|\band\b|\bor\b|\bthen\b|\bwith\b/gi) || []).length;

  let score = 0;
  // Word count contribution (0-0.4)
  score += Math.min(wordCount / 25, 0.4);
  // Technical term bonus (0-0.3)
  if (hasCodeTerms) score += 0.3;
  // Clause complexity bonus (0-0.3)
  score += Math.min(hasMultipleClauses * 0.1, 0.3);

  return Math.min(score, 1.0);
}
