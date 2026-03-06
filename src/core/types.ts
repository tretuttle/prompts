// ── Modes ──
export type PromptMode = 'standard' | 'research' | 'execute' | 'plan';
export type IntentType = 'creative' | 'technical' | 'analytical' | 'instructional';
export type ContextDepth = 'none' | 'file' | 'project';
export type CommitStyle = 'conventional' | 'gitmoji' | 'plain';
export type GateAction = 'warn' | 'refine';
export type ScanAction = 'block' | 'warn';
export type AntiPatternAction = 'warn' | 'block';

// ── Config ──
export interface PluginConfig {
  target_model: string;
  context_depth: ContextDepth;
  token_budget: number;
  auto_clipboard: boolean;
  history_limit: number;
  default_mode: PromptMode;
  template_dir: string | null;
  plan_output_dir: string;
  plan_tdd: boolean;
  plan_commit_style: CommitStyle;
  auto_optimize: boolean;
  auto_mode_routing: boolean;
  auto_refine_on_failure: boolean;
  quality_gate: boolean;
  quality_gate_action: GateAction;
  hookify_constraints: boolean;
  secret_scan: boolean;
  secret_scan_action: ScanAction;
  secret_patterns: string[];
  retrospectives: boolean;
  dedup: boolean;
  dedup_threshold: number;
  template_suggestions: boolean;
  anti_pattern_check: boolean;
  anti_pattern_action: AntiPatternAction;
  orchestration: boolean;
  orchestration_chain: string[];
  complexity_threshold: number;
  max_refine_passes: number;
  context_validation: boolean;
  context_relevance_threshold: number;
}

// ── CLI Args ──
export interface CLIArgs {
  input: string;
  mode: PromptMode;
  refine: boolean;
  dryRun: boolean;
  target: string | null;
  template: string | null;
  listTemplates: boolean;
  history: boolean | number;
  historyRetrospectives: boolean;
  historyPlans: boolean;
  clearHistory: boolean;
  orchestrate: boolean;
  noSuggestions: boolean;
}

// ── Context ──
export interface ProjectContext {
  activeFile: string | null;
  activeLanguage: string | null;
  codeSnippet: string | null;
  projectStructure: string | null;
  activeErrors: string[] | null;
  gitBranch: string | null;
  lastCommitMessage: string | null;
  hookifyRules: HookifyRule[];
}

export interface HookifyRule {
  name: string;
  enabled: boolean;
  event: string;
  action: string;
  conditions: HookifyCondition[];
  body: string;
  filePath: string;
}

export interface HookifyCondition {
  field: string;
  operator: string;
  pattern: string;
}

// ── History ──
export interface HistoryEntry {
  id: string;
  timestamp: string;
  input: string;
  output: string;
  mode: PromptMode;
  target_model: string;
  intent: IntentType | null;
  template: string | null;
  retrospective: boolean;
  plan: boolean;
  metadata: Record<string, unknown>;
}

// ── Quality ──
export interface QualityReport {
  passed: boolean;
  tokenCount: number;
  budgetExceeded: boolean;
  vagueLanguage: string[];
  structuralImprovement: boolean;
  specificityMarkers: string[];
  planComplete: boolean | null; // null if not plan mode
  issues: string[];
}

// ── Plan ──
export interface PlanTask {
  number: number;
  name: string;
  files: { action: 'create' | 'modify' | 'test'; path: string; lines?: string }[];
  steps: PlanStep[];
  commitMessage: string;
}

export interface PlanStep {
  number: number;
  title: string;
  content: string; // markdown with code blocks
  runCommand?: string;
  expectedOutput?: string;
}

export interface Plan {
  featureName: string;
  goal: string;
  architecture: string;
  techStack: string;
  tasks: PlanTask[];
}

// ── Templates ──
export interface PromptTemplate {
  name: string;
  description: string;
  category: string;
  template: string; // prompt template with {{placeholders}}
  mode: PromptMode;
}

// ── Hook Events ──
export interface HookContext {
  event: 'UserPromptSubmit' | 'PreToolUse' | 'PostToolUse' | 'Stop';
  prompt?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  error?: string;
  conversationHistory?: string[];
}

// ── Engine Output ──
export interface EngineResult {
  output: string;
  mode: PromptMode;
  intent: IntentType | null;
  qualityReport: QualityReport | null;
  warnings: string[];
  blocked: boolean;
  blockedReason: string | null;
  planPath: string | null;
  templateSuggestion: string | null;
  duplicateMatch: HistoryEntry | null;
}
