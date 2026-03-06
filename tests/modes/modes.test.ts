import { describe, it, expect } from 'vitest';
import { generateStandard } from '../../src/modes/standard';
import { generateResearch } from '../../src/modes/research';
import { generateExecute } from '../../src/modes/execute';
import { generatePlan } from '../../src/modes/plan';
import type { ProjectContext, PluginConfig } from '../../src/core/types';
import { DEFAULT_CONFIG } from '../../src/core/config';

const emptyContext: ProjectContext = {
  activeFile: null, activeLanguage: null, codeSnippet: null,
  projectStructure: null, activeErrors: null,
  gitBranch: null, lastCommitMessage: null, hookifyRules: [],
};

const baseConfig: PluginConfig = { ...DEFAULT_CONFIG };

describe('Standard Mode', () => {
  it('should produce an improved prompt with structure', () => {
    const result = generateStandard('Write a function that parses CSV files', emptyContext, baseConfig);
    expect(result.length).toBeGreaterThan('Write a function that parses CSV files'.length);
    expect(result).toMatch(/(?:constraint|requirement|input|output|error|edge case)/i);
  });

  it('should include context when available', () => {
    const ctx: ProjectContext = { ...emptyContext, gitBranch: 'feature/csv-parser', activeLanguage: 'typescript' };
    const result = generateStandard('Write a CSV parser', ctx, baseConfig);
    expect(result).toContain('typescript');
  });
});

describe('Research Mode', () => {
  it('should produce a research-oriented prompt', () => {
    const result = generateResearch('Best state management for React', emptyContext, baseConfig);
    expect(result).toMatch(/(?:compare|evaluate|trade-?offs?|alternatives|criteria|recommend)/i);
  });
});

describe('Execute Mode', () => {
  it('should produce an execution-ready prompt', () => {
    const result = generateExecute('Add rate limiting to Express API', emptyContext, baseConfig);
    expect(result).toMatch(/(?:implement|step|file|code|test|error handling)/i);
  });
});

describe('Plan Mode', () => {
  it('should produce a plan with header and tasks', () => {
    const result = generatePlan('Build JWT auth system', emptyContext, baseConfig);
    expect(result).toContain('Implementation Plan');
    expect(result).toContain('Goal:');
    expect(result).toContain('Task');
    expect(result).toMatch(/\*\*Files:\*\*/);
    expect(result).toMatch(/Step 1/);
  });

  it('should include TDD structure when plan_tdd is true', () => {
    const result = generatePlan('Build auth', emptyContext, { ...baseConfig, plan_tdd: true });
    expect(result).toMatch(/failing test/i);
    expect(result).toMatch(/Run:/);
    expect(result).toMatch(/Expected:/);
    expect(result).toMatch(/git commit/);
  });

  it('should embed hookify constraints when present', () => {
    const ctx: ProjectContext = {
      ...emptyContext,
      hookifyRules: [{
        name: 'enforce-zod', enabled: true, event: 'file', action: 'warn',
        conditions: [{ field: 'file_path', operator: 'regex_match', pattern: '\\.tsx?$' }],
        body: 'All TypeScript files must use Zod for validation.',
        filePath: '.claude/hookify.enforce-zod.local.md',
      }],
    };
    const result = generatePlan('Build user registration', ctx, { ...baseConfig, hookify_constraints: true });
    expect(result.toLowerCase()).toContain('zod');
  });
});
