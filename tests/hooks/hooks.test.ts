import { describe, it, expect } from 'vitest';
import { handleUserPromptSubmit } from '../../src/hooks/user-prompt-submit';
import { handlePreToolUse } from '../../src/hooks/pre-tool-use';
import { handlePostToolUse } from '../../src/hooks/post-tool-use';
import { handleStop } from '../../src/hooks/stop';
import { DEFAULT_CONFIG } from '../../src/core/config';

describe('UserPromptSubmit Hook', () => {
  it('should pass through trivial prompts when auto_optimize is on', async () => {
    const result = await handleUserPromptSubmit({
      prompt: 'yes',
      config: { ...DEFAULT_CONFIG, auto_optimize: true },
      projectRoot: '/tmp',
    });
    expect(result.modified).toBe(false);
    expect(result.prompt).toBe('yes');
  });

  it('should optimize complex prompts when auto_optimize is on', async () => {
    const result = await handleUserPromptSubmit({
      prompt: 'Refactor the authentication module to use JWT tokens with refresh rotation',
      config: { ...DEFAULT_CONFIG, auto_optimize: true },
      projectRoot: '/tmp',
    });
    expect(result.modified).toBe(true);
    expect(result.prompt.length).toBeGreaterThan('Refactor the authentication module to use JWT tokens with refresh rotation'.length);
  });

  it('should not modify when auto_optimize is off', async () => {
    const result = await handleUserPromptSubmit({
      prompt: 'Refactor auth',
      config: { ...DEFAULT_CONFIG, auto_optimize: false },
      projectRoot: '/tmp',
    });
    expect(result.modified).toBe(false);
  });
});

describe('PreToolUse Hook', () => {
  it('should block secrets in tool input', async () => {
    const result = await handlePreToolUse({
      toolName: 'write_file',
      toolInput: { content: 'AKIAIOSFODNN7EXAMPLE' },
      config: { ...DEFAULT_CONFIG, secret_scan: true, secret_scan_action: 'block' },
      projectRoot: '/tmp',
    });
    expect(result.blocked).toBe(true);
  });

  it('should pass clean tool input', async () => {
    const result = await handlePreToolUse({
      toolName: 'write_file',
      toolInput: { content: 'normal code here' },
      config: { ...DEFAULT_CONFIG, secret_scan: true },
      projectRoot: '/tmp',
    });
    expect(result.blocked).toBe(false);
  });
});

describe('PostToolUse Hook', () => {
  it('should detect failure signals in tool output', async () => {
    const result = await handlePostToolUse({
      toolName: 'bash',
      toolOutput: 'FAIL tests/auth.test.ts: Expected 200 but got 401',
      config: { ...DEFAULT_CONFIG, auto_refine_on_failure: true },
      projectRoot: '/tmp',
    });
    expect(result.shouldRefine).toBe(true);
    expect(result.failureContext).toContain('FAIL');
  });

  it('should not trigger refine on success', async () => {
    const result = await handlePostToolUse({
      toolName: 'bash',
      toolOutput: 'All tests passed. 15/15',
      config: { ...DEFAULT_CONFIG, auto_refine_on_failure: true },
      projectRoot: '/tmp',
    });
    expect(result.shouldRefine).toBe(false);
  });
});

describe('Stop Hook', () => {
  it('should suggest template when applicable', async () => {
    const result = await handleStop({
      conversationHistory: [
        'Review the code in auth.ts',
        'Here are the issues I found...',
        'Fix the null check',
        'Done, the fix is applied',
      ],
      config: { ...DEFAULT_CONFIG, template_suggestions: true },
      projectRoot: '/tmp',
    });
    expect(result.templateSuggestion).toBeDefined();
  });
});
