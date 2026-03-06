import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runEngine } from '../../src/core/engine';
import type { CLIArgs } from '../../src/core/types';
import { DEFAULT_CONFIG } from '../../src/core/config';

const baseArgs: CLIArgs = {
  input: 'Write a function that parses CSV files',
  mode: 'standard',
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
};

describe('Engine', () => {
  it('should produce output in standard mode', async () => {
    const result = await runEngine(baseArgs, { config: DEFAULT_CONFIG, projectRoot: '/tmp' });
    expect(result.output.length).toBeGreaterThan(0);
    expect(result.mode).toBe('standard');
    expect(result.blocked).toBe(false);
  });

  it('should produce output in research mode', async () => {
    const result = await runEngine({ ...baseArgs, mode: 'research', input: 'Best React state management' }, { config: DEFAULT_CONFIG, projectRoot: '/tmp' });
    expect(result.mode).toBe('research');
    expect(result.output).toMatch(/(?:compare|evaluate|trade-?off|alternative|criteria|recommend)/i);
  });

  it('should produce output in execute mode', async () => {
    const result = await runEngine({ ...baseArgs, mode: 'execute', input: 'Add rate limiting' }, { config: DEFAULT_CONFIG, projectRoot: '/tmp' });
    expect(result.mode).toBe('execute');
  });

  it('should produce output in plan mode', async () => {
    const result = await runEngine({ ...baseArgs, mode: 'plan', input: 'Build auth system' }, { config: DEFAULT_CONFIG, projectRoot: '/tmp' });
    expect(result.mode).toBe('plan');
    expect(result.output).toContain('Implementation Plan');
  });

  it('should return dry run analysis without full output', async () => {
    const result = await runEngine({ ...baseArgs, dryRun: true }, { config: DEFAULT_CONFIG, projectRoot: '/tmp' });
    expect(result.output).toContain('Dry Run');
  });

  it('should block prompts with secrets', async () => {
    const result = await runEngine(
      { ...baseArgs, input: 'Use key AKIAIOSFODNN7EXAMPLE to access S3' },
      { config: { ...DEFAULT_CONFIG, secret_scan: true, secret_scan_action: 'block' }, projectRoot: '/tmp' }
    );
    expect(result.blocked).toBe(true);
  });

  it('should override target model via --target flag', async () => {
    const result = await runEngine(
      { ...baseArgs, target: 'claude-opus' },
      { config: DEFAULT_CONFIG, projectRoot: '/tmp' }
    );
    expect(result.output).toContain('claude-opus');
  });
});
