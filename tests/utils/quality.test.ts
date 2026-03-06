import { describe, it, expect } from 'vitest';
import { analyzeQuality } from '../../src/utils/quality';

describe('Quality Gate', () => {
  it('should pass a well-structured prompt', () => {
    const report = analyzeQuality({
      input: 'Write a CSV parser',
      output: 'Implement a CSV parser function in TypeScript that:\n1. Accepts a string input\n2. Handles quoted fields with commas\n3. Returns an array of objects with typed headers\n4. Throws ParseError for malformed input\n\nConstraints:\n- Use streaming for files > 1MB\n- Support custom delimiters via options parameter\n- Include unit tests for edge cases: empty input, single column, escaped quotes',
      mode: 'standard',
      tokenBudget: 4096,
    });
    expect(report.passed).toBe(true);
    expect(report.structuralImprovement).toBe(true);
  });

  it('should flag vague language', () => {
    const report = analyzeQuality({
      input: 'Fix the code',
      output: 'Make the code better and do something good with it',
      mode: 'standard',
      tokenBudget: 4096,
    });
    expect(report.vagueLanguage.length).toBeGreaterThan(0);
  });

  it('should detect budget overrun', () => {
    const longOutput = 'word '.repeat(5000);
    const report = analyzeQuality({
      input: 'short',
      output: longOutput,
      mode: 'standard',
      tokenBudget: 100,
    });
    expect(report.budgetExceeded).toBe(true);
  });

  it('should detect lack of structural improvement', () => {
    const report = analyzeQuality({
      input: 'Write a function that parses CSV',
      output: 'Write a function that parses CSV files',
      mode: 'standard',
      tokenBudget: 4096,
    });
    expect(report.structuralImprovement).toBe(false);
  });

  it('should check plan completeness', () => {
    const incompletePlan = '### Task 1: Auth\nDo the auth thing.';
    const report = analyzeQuality({
      input: 'Build auth',
      output: incompletePlan,
      mode: 'plan',
      tokenBudget: 4096,
    });
    expect(report.planComplete).toBe(false);
  });

  it('should pass a complete plan', () => {
    const completePlan = `### Task 1: Auth
**Files:**
- Create: \`src/auth.ts\`
- Test: \`tests/auth.test.ts\`

**Step 1: Write the failing test**
\`\`\`typescript
test code
\`\`\`

**Step 2: Run test to verify it fails**
Run: \`npm test\`
Expected: FAIL

**Step 3: Write minimal implementation**
\`\`\`typescript
implementation
\`\`\`

**Step 4: Run test to verify it passes**
Run: \`npm test\`
Expected: PASS

**Step 5: Commit**
\`\`\`bash
git commit -m "feat: auth"
\`\`\``;
    const report = analyzeQuality({
      input: 'Build auth',
      output: completePlan,
      mode: 'plan',
      tokenBudget: 50000,
    });
    expect(report.planComplete).toBe(true);
  });
});
