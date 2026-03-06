import { describe, it, expect } from 'vitest';
import { detectAntiPatterns } from '../../src/utils/antipatterns';

describe('Anti-Pattern Detection', () => {
  it('should detect rewording without improvement', () => {
    const result = detectAntiPatterns({
      input: 'Write a function that parses CSV files',
      output: 'Create a function that parses CSV files for me',
      tokenBudget: 4096,
      hookifyRules: [],
    });
    expect(result.some(a => a.type === 'rewording')).toBe(true);
  });

  it('should detect missing acceptance criteria', () => {
    const result = detectAntiPatterns({
      input: 'Build an auth system',
      output: 'Build an authentication system that handles users. Make sure it works well.',
      tokenBudget: 4096,
      hookifyRules: [],
    });
    expect(result.some(a => a.type === 'missing-criteria')).toBe(true);
  });

  it('should detect token budget violation', () => {
    const result = detectAntiPatterns({
      input: 'short',
      output: 'word '.repeat(5000),
      tokenBudget: 100,
      hookifyRules: [],
    });
    expect(result.some(a => a.type === 'budget-exceeded')).toBe(true);
  });

  it('should pass clean prompts', () => {
    const result = detectAntiPatterns({
      input: 'Write a CSV parser',
      output: 'Implement a streaming CSV parser in TypeScript that:\n\n**Requirements:**\n1. Accept ReadableStream input\n2. Handle quoted fields\n3. Return typed rows\n\n**Constraints:**\n- Max 50MB file size\n- < 100ms for 1000 rows\n\n**Tests:**\n- Empty input returns []\n- Single column\n- Escaped quotes',
      tokenBudget: 4096,
      hookifyRules: [],
    });
    expect(result).toHaveLength(0);
  });
});
