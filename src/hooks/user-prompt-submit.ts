import type { PluginConfig } from '../core/types.js';
import { computeComplexity, detectAutoMode } from '../core/intent.js';
import { runEngine } from '../core/engine.js';
import { PromptHistory } from '../core/history.js';
import { join } from 'path';

interface UserPromptSubmitInput {
  prompt: string;
  config: PluginConfig;
  projectRoot: string;
}

interface UserPromptSubmitResult {
  modified: boolean;
  prompt: string;
  warnings: string[];
}

export async function handleUserPromptSubmit(input: UserPromptSubmitInput): Promise<UserPromptSubmitResult> {
  const { prompt, config, projectRoot } = input;

  // If auto_optimize is off, pass through
  if (!config.auto_optimize) {
    return { modified: false, prompt, warnings: [] };
  }

  // Complexity gate — trivial inputs pass through
  const complexity = computeComplexity(prompt);
  if (complexity < config.complexity_threshold) {
    return { modified: false, prompt, warnings: [] };
  }

  // Duplicate detection
  if (config.dedup) {
    const history = new PromptHistory(join(projectRoot, '.prompt-history.json'), config.history_limit);
    const dup = await history.findDuplicate(prompt, config.dedup_threshold);
    if (dup) {
      return {
        modified: true,
        prompt: dup.output,
        warnings: [`✦ Similar prompt found in history (match). Using previous refined version.`],
      };
    }
  }

  // Auto-mode routing
  let mode: 'standard' | 'research' | 'execute' | 'plan' = config.default_mode as any;
  if (config.auto_mode_routing) {
    mode = detectAutoMode(prompt);
  }

  // Run through engine
  const result = await runEngine(
    {
      input: prompt,
      mode,
      refine: false,
      dryRun: false,
      target: null,
      template: null,
      listTemplates: false,
      history: false,
      historyRetrospectives: false,
      historyPlans: false,
      clearHistory: false,
      orchestrate: false,
      noSuggestions: false,
    },
    { config, projectRoot }
  );

  if (result.blocked) {
    return { modified: true, prompt: result.output, warnings: result.warnings };
  }

  return {
    modified: true,
    prompt: result.output,
    warnings: result.warnings,
  };
}
