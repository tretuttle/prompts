import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gatherContext, parseHookifyRule, validateContextRelevance } from '../../src/core/context';
import type { PluginConfig } from '../../src/core/types';
import { DEFAULT_CONFIG } from '../../src/core/config';

describe('Context Injection', () => {
  it('should return empty context when depth is none', async () => {
    const config: PluginConfig = { ...DEFAULT_CONFIG, context_depth: 'none' };
    const ctx = await gatherContext(config, '/tmp/fake');
    expect(ctx.activeFile).toBeNull();
    expect(ctx.projectStructure).toBeNull();
    expect(ctx.hookifyRules).toEqual([]);
  });

  it('should parse a hookify rule file', () => {
    const content = `---
name: enforce-zod
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: \\.tsx?$
  - field: new_text
    operator: not_contains
    pattern: z\\.object\\(
action: warn
---

All TypeScript files must use Zod for validation.`;

    const rule = parseHookifyRule(content, '.claude/hookify.enforce-zod.local.md');
    expect(rule.name).toBe('enforce-zod');
    expect(rule.enabled).toBe(true);
    expect(rule.event).toBe('file');
    expect(rule.action).toBe('warn');
    expect(rule.conditions).toHaveLength(2);
    expect(rule.conditions[0].field).toBe('file_path');
    expect(rule.body).toContain('All TypeScript files must use Zod');
  });

  it('should skip disabled hookify rules', () => {
    const content = `---
name: disabled-rule
enabled: false
event: bash
pattern: rm
---

Warning about rm.`;
    const rule = parseHookifyRule(content, 'test.local.md');
    expect(rule.enabled).toBe(false);
  });

  it('should validate context relevance', () => {
    const input = 'Add authentication to the Express API';
    const contextItems = [
      { path: 'src/routes/auth.ts', content: 'export class AuthController' },
      { path: 'src/routes/users.ts', content: 'export class UserController' },
      { path: 'packages/mobile-app/App.tsx', content: 'React Native app' },
      { path: 'packages/docs-site/index.html', content: 'Documentation website' },
    ];
    const relevant = validateContextRelevance(input, contextItems, 0.3);
    // auth and users should be relevant, mobile-app and docs-site should not
    expect(relevant.some(c => c.path.includes('auth'))).toBe(true);
    expect(relevant.some(c => c.path.includes('mobile-app'))).toBe(false);
  });
});
