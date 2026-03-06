// Plugin entry point — exports for programmatic use and hook registration

export { runEngine } from './core/engine.js';
export { loadConfig, DEFAULT_CONFIG } from './core/config.js';
export { parseArgs } from './core/cli.js';
export { firstRunSetup } from './core/setup.js';
export { handleUserPromptSubmit } from './hooks/user-prompt-submit.js';
export { handlePreToolUse } from './hooks/pre-tool-use.js';
export { handlePostToolUse } from './hooks/post-tool-use.js';
export { handleStop } from './hooks/stop.js';

// Re-export types
export type {
  PluginConfig,
  CLIArgs,
  EngineResult,
  PromptMode,
  IntentType,
  ProjectContext,
  HookifyRule,
  HistoryEntry,
  QualityReport,
  PromptTemplate,
  Plan,
  PlanTask,
  PlanStep,
} from './core/types.js';
