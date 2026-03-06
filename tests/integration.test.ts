import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runEngine } from '../src/core/engine';
import { loadConfig, DEFAULT_CONFIG } from '../src/core/config';
import { PromptHistory } from '../src/core/history';
import { handleUserPromptSubmit } from '../src/hooks/user-prompt-submit';
import { handlePreToolUse } from '../src/hooks/pre-tool-use';
import { handlePostToolUse } from '../src/hooks/post-tool-use';
import { handleStop } from '../src/hooks/stop';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';

const TEST_DIR = '/tmp/test-integration-' + Date.now();

describe('Integration', () => {
  beforeEach(async () => {
    await mkdir(join(TEST_DIR, 'docs/plans'), { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it('full pipeline: standard mode', async () => {
    const result = await runEngine(
      { input: 'Write a CSV parser', mode: 'standard', refine: false, dryRun: false, target: null, template: null, listTemplates: false, history: false, historyRetrospectives: false, historyPlans: false, clearHistory: false, orchestrate: false, noSuggestions: false },
      { config: { ...DEFAULT_CONFIG, auto_clipboard: false }, projectRoot: TEST_DIR }
    );
    expect(result.output).toBeTruthy();
    expect(result.blocked).toBe(false);
    expect(result.mode).toBe('standard');

    // Verify history was saved
    const history = new PromptHistory(join(TEST_DIR, '.prompt-history.json'), 50);
    const entries = await history.list();
    expect(entries).toHaveLength(1);
  });

  it('full pipeline: plan mode saves file', async () => {
    const result = await runEngine(
      { input: 'Build auth system', mode: 'plan', refine: false, dryRun: false, target: null, template: null, listTemplates: false, history: false, historyRetrospectives: false, historyPlans: false, clearHistory: false, orchestrate: false, noSuggestions: false },
      { config: { ...DEFAULT_CONFIG, auto_clipboard: false }, projectRoot: TEST_DIR }
    );
    expect(result.planPath).toBeTruthy();
    expect(result.output).toContain('Implementation Plan');
  });

  it('full pipeline: secret blocking', async () => {
    const result = await runEngine(
      { input: 'Use AKIAIOSFODNN7EXAMPLE to auth', mode: 'standard', refine: false, dryRun: false, target: null, template: null, listTemplates: false, history: false, historyRetrospectives: false, historyPlans: false, clearHistory: false, orchestrate: false, noSuggestions: false },
      { config: { ...DEFAULT_CONFIG, secret_scan: true, secret_scan_action: 'block', auto_clipboard: false }, projectRoot: TEST_DIR }
    );
    expect(result.blocked).toBe(true);
  });

  it('full pipeline: template application', async () => {
    const result = await runEngine(
      { input: 'UserAuthService.ts', mode: 'standard', refine: false, dryRun: false, target: null, template: 'debug', listTemplates: false, history: false, historyRetrospectives: false, historyPlans: false, clearHistory: false, orchestrate: false, noSuggestions: false },
      { config: { ...DEFAULT_CONFIG, auto_clipboard: false }, projectRoot: TEST_DIR }
    );
    expect(result.output).toContain('UserAuthService.ts');
  });

  it('hook pipeline: auto-optimize with complexity gating', async () => {
    // Trivial input passes through
    const trivial = await handleUserPromptSubmit({
      prompt: 'ok',
      config: { ...DEFAULT_CONFIG, auto_optimize: true },
      projectRoot: TEST_DIR,
    });
    expect(trivial.modified).toBe(false);

    // Complex input gets optimized
    const complex = await handleUserPromptSubmit({
      prompt: 'Refactor the authentication module to use JWT tokens with refresh token rotation and session invalidation',
      config: { ...DEFAULT_CONFIG, auto_optimize: true, auto_clipboard: false },
      projectRoot: TEST_DIR,
    });
    expect(complex.modified).toBe(true);
    expect(complex.prompt.length).toBeGreaterThan(50);
  });

  it('hook pipeline: PreToolUse blocks secrets', async () => {
    const result = await handlePreToolUse({
      toolName: 'write_file',
      toolInput: { content: 'ghp_abcdef1234567890abcdef1234567890abcd' },
      config: { ...DEFAULT_CONFIG, secret_scan: true, secret_scan_action: 'block' },
      projectRoot: TEST_DIR,
    });
    expect(result.blocked).toBe(true);
  });

  it('hook pipeline: PostToolUse detects failures', async () => {
    const result = await handlePostToolUse({
      toolName: 'bash',
      toolOutput: 'FAIL tests/auth.test.ts\nExpected 200 received 401',
      config: { ...DEFAULT_CONFIG, auto_refine_on_failure: true },
      projectRoot: TEST_DIR,
    });
    expect(result.shouldRefine).toBe(true);
  });

  it('hook pipeline: Stop suggests templates', async () => {
    const result = await handleStop({
      conversationHistory: [
        'Review the code in auth.ts for security issues',
        'Found 3 issues: SQL injection, missing auth check, XSS',
        'Fix the SQL injection',
        'Applied parameterized queries',
      ],
      config: { ...DEFAULT_CONFIG, template_suggestions: true },
      projectRoot: TEST_DIR,
    });
    // Should suggest code-review template
    expect(result.templateSuggestion).toBeTruthy();
  });
});
