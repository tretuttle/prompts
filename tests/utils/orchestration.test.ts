import { describe, it, expect } from 'vitest';
import { buildOrchestrationChain, validateFileReferences } from '../../src/utils/orchestration';

describe('Orchestration', () => {
  it('should build a chain of plugin commands', () => {
    const chain = buildOrchestrationChain(['lint', 'test'], 'execute mode output here');
    expect(chain).toHaveLength(2);
    expect(chain[0].plugin).toBe('lint');
    expect(chain[1].plugin).toBe('test');
  });

  it('should extract and validate file references', () => {
    const output = 'Modify `src/routes/auth.ts` and create `src/middleware/rateLimit.ts`';
    const refs = validateFileReferences(output);
    expect(refs).toContain('src/routes/auth.ts');
    expect(refs).toContain('src/middleware/rateLimit.ts');
  });

  it('should return empty for no file references', () => {
    const refs = validateFileReferences('Just a general prompt with no files');
    expect(refs).toHaveLength(0);
  });
});
