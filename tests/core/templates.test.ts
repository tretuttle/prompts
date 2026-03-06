import { describe, it, expect } from 'vitest';
import { loadBuiltinTemplates, loadCustomTemplates, applyTemplate, listTemplates } from '../../src/core/templates';

describe('Template Library', () => {
  it('should load at least 40 built-in templates', () => {
    const templates = loadBuiltinTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(40);
  });

  it('should include key templates', () => {
    const templates = loadBuiltinTemplates();
    const names = templates.map(t => t.name);
    expect(names).toContain('debug');
    expect(names).toContain('refactor');
    expect(names).toContain('unit-test');
    expect(names).toContain('code-review');
    expect(names).toContain('docs');
    expect(names).toContain('plan-feature');
    expect(names).toContain('plan-migration');
  });

  it('should apply template with input substitution', () => {
    const templates = loadBuiltinTemplates();
    const debug = templates.find(t => t.name === 'debug')!;
    const result = applyTemplate(debug, 'UserAuthService.ts is throwing null pointer');
    expect(result).toContain('UserAuthService.ts is throwing null pointer');
    expect(result).not.toContain('{{input}}');
  });

  it('should list templates with names and descriptions', () => {
    const listing = listTemplates(loadBuiltinTemplates());
    expect(listing).toContain('debug');
    expect(listing).toContain('refactor');
  });

  it('plan-feature template should produce plan mode output', () => {
    const templates = loadBuiltinTemplates();
    const pf = templates.find(t => t.name === 'plan-feature')!;
    expect(pf.mode).toBe('plan');
  });

  it('plan-migration template should produce plan mode output', () => {
    const templates = loadBuiltinTemplates();
    const pm = templates.find(t => t.name === 'plan-migration')!;
    expect(pm.mode).toBe('plan');
  });
});
