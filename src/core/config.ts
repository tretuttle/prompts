import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { PluginConfig } from './types.js';

export const DEFAULT_CONFIG: PluginConfig = {
  target_model: 'claude-sonnet',
  context_depth: 'file',
  token_budget: 4096,
  auto_clipboard: true,
  history_limit: 50,
  default_mode: 'standard',
  template_dir: null,
  plan_output_dir: 'docs/plans',
  plan_tdd: true,
  plan_commit_style: 'conventional',
  auto_optimize: false,
  auto_mode_routing: false,
  auto_refine_on_failure: false,
  quality_gate: false,
  quality_gate_action: 'warn',
  hookify_constraints: false,
  secret_scan: true,
  secret_scan_action: 'block',
  secret_patterns: [],
  retrospectives: false,
  dedup: true,
  dedup_threshold: 0.85,
  template_suggestions: true,
  anti_pattern_check: true,
  anti_pattern_action: 'warn',
  orchestration: false,
  orchestration_chain: [],
  complexity_threshold: 0.3,
  max_refine_passes: 3,
  context_validation: true,
  context_relevance_threshold: 0.6,
};

export { PluginConfig };

async function tryReadJson(filePath: string): Promise<Partial<PluginConfig> | null> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Partial<PluginConfig>;
  } catch {
    return null;
  }
}

export async function loadConfig(projectRoot?: string): Promise<PluginConfig> {
  const root = projectRoot || process.cwd();
  // project-level config takes precedence over home-level
  const projectConfig = await tryReadJson(join(root, '.promptcreator.json'));
  const homeConfig = await tryReadJson(join(homedir(), '.promptcreator.json'));

  return {
    ...DEFAULT_CONFIG,
    ...(homeConfig ?? {}),
    ...(projectConfig ?? {}),
  };
}
