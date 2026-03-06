import type { PluginConfig } from '../core/types.js';

interface PostToolUseInput {
  toolName: string;
  toolOutput: string;
  config: PluginConfig;
  projectRoot: string;
  error?: string;
  refineCount?: number;
}

interface PostToolUseResult {
  shouldRefine: boolean;
  failureContext: string | null;
  warnings: string[];
}

const FAILURE_PATTERNS = [
  /\bFAIL\b/,
  /\bERROR\b/i,
  /\bfailed\b/i,
  /\bcompilation error\b/i,
  /\bsyntax error\b/i,
  /\bTypeError\b/,
  /\bReferenceError\b/,
  /\bModuleNotFoundError\b/,
  /\blint.*error/i,
  /\btest.*fail/i,
  /exit code [1-9]/i,
  /\bnpm ERR\b/,
];

export async function handlePostToolUse(input: PostToolUseInput): Promise<PostToolUseResult> {
  const { config, toolOutput, error, refineCount = 0 } = input;
  const warnings: string[] = [];

  if (!config.auto_refine_on_failure) {
    return { shouldRefine: false, failureContext: null, warnings };
  }

  // Check max_refine_passes limit
  if (refineCount >= config.max_refine_passes) {
    return {
      shouldRefine: false,
      failureContext: null,
      warnings: [`⚠️ Max refinement passes (${config.max_refine_passes}) exhausted. Manual intervention needed.`],
    };
  }

  const output = `${toolOutput || ''}\n${error || ''}`;

  for (const pattern of FAILURE_PATTERNS) {
    if (pattern.test(output)) {
      // Extract relevant failure context (first 500 chars around match)
      const match = output.match(pattern);
      const pos = match?.index ?? 0;
      const start = Math.max(0, pos - 100);
      const end = Math.min(output.length, pos + 400);
      const failureContext = output.slice(start, end).trim();

      return {
        shouldRefine: true,
        failureContext,
        warnings: [`⚠️ Failure detected in tool output. Auto-refine triggered (pass ${refineCount + 1}/${config.max_refine_passes}).`],
      };
    }
  }

  return { shouldRefine: false, failureContext: null, warnings };
}
