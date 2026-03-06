import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig, DEFAULT_CONFIG, type PluginConfig } from '../../src/core/config';

describe('Config', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return defaults when no config file exists', async () => {
    const config = await loadConfig('/nonexistent/path');
    expect(config.target_model).toBe('claude-sonnet');
    expect(config.context_depth).toBe('file');
    expect(config.token_budget).toBe(4096);
    expect(config.auto_clipboard).toBe(true);
    expect(config.history_limit).toBe(50);
    expect(config.default_mode).toBe('standard');
    expect(config.plan_output_dir).toBe('docs/plans');
    expect(config.plan_tdd).toBe(true);
    expect(config.plan_commit_style).toBe('conventional');
    expect(config.auto_optimize).toBe(false);
    expect(config.auto_mode_routing).toBe(false);
    expect(config.auto_refine_on_failure).toBe(false);
    expect(config.quality_gate).toBe(false);
    expect(config.hookify_constraints).toBe(false);
    expect(config.secret_scan).toBe(true);
    expect(config.retrospectives).toBe(false);
    expect(config.dedup).toBe(true);
    expect(config.template_suggestions).toBe(true);
    expect(config.anti_pattern_check).toBe(true);
    expect(config.orchestration).toBe(false);
    expect(config.complexity_threshold).toBe(0.3);
    expect(config.max_refine_passes).toBe(3);
    expect(config.quality_gate_action).toBe('warn');
    expect(config.secret_scan_action).toBe('block');
    expect(config.secret_patterns).toEqual([]);
    expect(config.dedup_threshold).toBe(0.85);
    expect(config.anti_pattern_action).toBe('warn');
    expect(config.orchestration_chain).toEqual([]);
    expect(config.context_validation).toBe(true);
    expect(config.context_relevance_threshold).toBe(0.6);
  });

  it('should merge user config over defaults', async () => {
    // This test will use a temp file, written in the test setup
    const fs = await import('fs/promises');
    const path = await import('path');
    const tmpDir = '/tmp/test-config-' + Date.now();
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, '.promptcreator.json'),
      JSON.stringify({ target_model: 'claude-opus', token_budget: 8192 })
    );
    const config = await loadConfig(tmpDir);
    expect(config.target_model).toBe('claude-opus');
    expect(config.token_budget).toBe(8192);
    // defaults still apply for unset keys
    expect(config.auto_clipboard).toBe(true);
    await fs.rm(tmpDir, { recursive: true });
  });
});
