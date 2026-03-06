import type { PluginConfig } from '../core/types.js';
import { loadBuiltinTemplates } from '../core/templates.js';
import { PromptHistory } from '../core/history.js';
import { join } from 'path';

interface StopInput {
  conversationHistory: string[];
  config: PluginConfig;
  projectRoot: string;
  noSuggestions?: boolean;
}

interface StopResult {
  templateSuggestion: string | null;
  retrospective: string | null;
  warnings: string[];
}

const TEMPLATE_SIGNALS: Record<string, RegExp[]> = {
  'code-review': [/\breview\b/i, /\bissue\b/i, /\bfound\b/i, /\bfix\b/i],
  'debug': [/\bbug\b/i, /\berror\b/i, /\bcrash\b/i, /\bstack\s*trace\b/i],
  'refactor': [/\brefactor\b/i, /\bclean\s*up\b/i, /\brestructure\b/i],
  'unit-test': [/\btest\b/i, /\bcoverage\b/i, /\bspec\b/i],
  'docs': [/\bdocument/i, /\breadme\b/i, /\bjsdoc\b/i],
};

export async function handleStop(input: StopInput): Promise<StopResult> {
  const { conversationHistory, config, projectRoot, noSuggestions = false } = input;
  const warnings: string[] = [];

  let templateSuggestion: string | null = null;
  let retrospective: string | null = null;

  // Template suggestion (skip if noSuggestions is set)
  if (config.template_suggestions && !noSuggestions && conversationHistory.length > 0) {
    const fullText = conversationHistory.join(' ');

    // Check for multi-file conversations that could have been plans
    const fileRefs = fullText.match(/\b[\w/]+\.\w{1,4}\b/g);
    const uniqueFiles = new Set(fileRefs || []);
    if (uniqueFiles.size >= 5) {
      templateSuggestion = `✦ This conversation touched ${uniqueFiles.size} files.\n  Next time, try: claude prompts -p "your task description"\n  Plan mode would have generated a structured task sequence with TDD steps.`;
    } else {
      // Check for template pattern matches
      let bestTemplate: string | null = null;
      let bestScore = 0;
      for (const [name, patterns] of Object.entries(TEMPLATE_SIGNALS)) {
        let score = 0;
        for (const p of patterns) {
          if (p.test(fullText)) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestTemplate = name;
        }
      }
      if (bestTemplate && bestScore >= 2) {
        templateSuggestion = `✦ Next time, try: claude prompts --template ${bestTemplate} "your input"`;
      }
    }
  }

  // Retrospective
  if (config.retrospectives && conversationHistory.length >= 2) {
    const firstPrompt = conversationHistory[0];
    const lastResponse = conversationHistory[conversationHistory.length - 1];
    retrospective = `Based on this conversation, the ideal initial prompt would have been:\n\n"${firstPrompt}"\n\nWith the additional context of what was learned during execution.`;

    // Save retrospective to history
    const history = new PromptHistory(join(projectRoot, '.prompt-history.json'), config.history_limit);
    await history.add({
      input: firstPrompt,
      output: retrospective,
      mode: 'standard',
      target_model: config.target_model,
      intent: null,
      template: null,
      retrospective: true,
      plan: false,
      metadata: { conversationLength: conversationHistory.length },
    });
  }

  return { templateSuggestion, retrospective, warnings };
}
