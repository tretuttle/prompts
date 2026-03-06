import type { PluginConfig } from '../core/types.js';
import { scanForSecrets } from '../utils/secrets.js';

interface PreToolUseInput {
  toolName: string;
  toolInput: Record<string, unknown>;
  config: PluginConfig;
  projectRoot: string;
}

interface PreToolUseResult {
  blocked: boolean;
  reason: string | null;
  warnings: string[];
}

export async function handlePreToolUse(input: PreToolUseInput): Promise<PreToolUseResult> {
  const { config, toolInput } = input;
  const warnings: string[] = [];

  // Secret scan on tool input
  if (config.secret_scan) {
    const content = JSON.stringify(toolInput);
    const scan = scanForSecrets(content, config.secret_patterns);
    if (scan.found) {
      const detectedTypes = scan.matches.map(m => m.type).join(', ');
      if (config.secret_scan_action === 'block') {
        return {
          blocked: true,
          reason: `🚫 Secret detected in outbound content: ${detectedTypes}`,
          warnings: [],
        };
      }
      warnings.push(`⚠️ Potential secret in outbound content: ${detectedTypes}`);
    }
  }

  return { blocked: false, reason: null, warnings };
}
