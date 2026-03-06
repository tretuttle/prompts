import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../src/core/cli';

describe('CLI Parser', () => {
  it('should parse bare input as standard mode', () => {
    const args = parseArgs(['Write a function that parses CSV']);
    expect(args.mode).toBe('standard');
    expect(args.input).toBe('Write a function that parses CSV');
    expect(args.refine).toBe(false);
    expect(args.dryRun).toBe(false);
  });

  it('should parse -r as research mode', () => {
    const args = parseArgs(['-r', 'Best state management approach']);
    expect(args.mode).toBe('research');
    expect(args.input).toBe('Best state management approach');
  });

  it('should parse --research as research mode', () => {
    const args = parseArgs(['--research', 'topic']);
    expect(args.mode).toBe('research');
  });

  it('should parse -e as execute mode', () => {
    const args = parseArgs(['-e', 'Add rate limiting']);
    expect(args.mode).toBe('execute');
  });

  it('should parse --execute as execute mode', () => {
    const args = parseArgs(['--execute', 'task']);
    expect(args.mode).toBe('execute');
  });

  it('should parse -p as plan mode', () => {
    const args = parseArgs(['-p', 'Build billing system']);
    expect(args.mode).toBe('plan');
    expect(args.input).toBe('Build billing system');
  });

  it('should parse --plan as plan mode', () => {
    const args = parseArgs(['--plan', 'task']);
    expect(args.mode).toBe('plan');
  });

  it('should parse --refine', () => {
    const args = parseArgs(['--refine']);
    expect(args.refine).toBe(true);
  });

  it('should parse --dry-run', () => {
    const args = parseArgs(['--dry-run', 'something']);
    expect(args.dryRun).toBe(true);
  });

  it('should parse --target with value', () => {
    const args = parseArgs(['-e', 'task', '--target', 'claude-opus']);
    expect(args.target).toBe('claude-opus');
  });

  it('should parse --template with value', () => {
    const args = parseArgs(['--template', 'debug', 'UserAuthService.ts']);
    expect(args.template).toBe('debug');
    expect(args.input).toBe('UserAuthService.ts');
  });

  it('should parse --list-templates', () => {
    const args = parseArgs(['--list-templates']);
    expect(args.listTemplates).toBe(true);
  });

  it('should parse --history with no number', () => {
    const args = parseArgs(['--history']);
    expect(args.history).toBe(true);
  });

  it('should parse --history with number', () => {
    const args = parseArgs(['--history', '3']);
    expect(args.history).toBe(3);
  });

  it('should parse --history --retrospectives', () => {
    const args = parseArgs(['--history', '--retrospectives']);
    expect(args.history).toBe(true);
    expect(args.historyRetrospectives).toBe(true);
  });

  it('should parse --history --plans', () => {
    const args = parseArgs(['--history', '--plans']);
    expect(args.historyPlans).toBe(true);
  });

  it('should parse --clear-history', () => {
    const args = parseArgs(['--clear-history']);
    expect(args.clearHistory).toBe(true);
  });

  it('should parse --orchestrate', () => {
    const args = parseArgs(['-e', 'task', '--orchestrate']);
    expect(args.orchestrate).toBe(true);
  });

  it('should parse --no-suggestions', () => {
    const args = parseArgs(['--no-suggestions', 'something']);
    expect(args.noSuggestions).toBe(true);
  });

  it('should collect remaining tokens as input', () => {
    const args = parseArgs(['-e', 'Add', 'rate', 'limiting', 'to', 'Express']);
    expect(args.input).toBe('Add rate limiting to Express');
  });
});
