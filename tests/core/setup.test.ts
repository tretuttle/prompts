import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { firstRunSetup } from '../../src/core/setup';
import { readdir, rm, mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const TEST_DIR = '/tmp/test-setup-' + Date.now();

describe('First Run Setup', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it('should copy shipped rules to .claude/ directory', async () => {
    await firstRunSetup(TEST_DIR, join(process.cwd(), 'shipped-rules'));
    const claudeDir = join(TEST_DIR, '.claude');
    const files = await readdir(claudeDir);
    expect(files).toContain('hookify.secret-scan.local.md');
    expect(files).toContain('hookify.anti-pattern.local.md');
    expect(files).toContain('hookify.plan-validation.local.md');
    expect(files).toContain('hookify.context-bloat.local.md');
    expect(files).toContain('hookify.refine-suggestion.local.md');
  });

  it('should not overwrite existing rules', async () => {
    const claudeDir = join(TEST_DIR, '.claude');
    await mkdir(claudeDir, { recursive: true });
    const customContent = 'custom content';
    await writeFile(join(claudeDir, 'hookify.secret-scan.local.md'), customContent);

    await firstRunSetup(TEST_DIR, join(process.cwd(), 'shipped-rules'));

    const content = await readFile(join(claudeDir, 'hookify.secret-scan.local.md'), 'utf-8');
    expect(content).toBe(customContent);
  });
});
