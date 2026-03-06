import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PromptHistory } from '../../src/core/history';
import { writeFile, rm, mkdir } from 'fs/promises';
import { join } from 'path';

const TEST_DIR = '/tmp/test-history-' + Date.now();
const HISTORY_PATH = join(TEST_DIR, '.prompt-history.json');

describe('Prompt History', () => {
  let history: PromptHistory;

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    history = new PromptHistory(HISTORY_PATH, 50);
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it('should start empty', async () => {
    const entries = await history.list();
    expect(entries).toEqual([]);
  });

  it('should add and retrieve entries', async () => {
    await history.add({
      input: 'test prompt',
      output: 'improved prompt',
      mode: 'standard',
      target_model: 'claude-sonnet',
      intent: 'technical',
      template: null,
      retrospective: false,
      plan: false,
      metadata: {},
    });
    const entries = await history.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].input).toBe('test prompt');
  });

  it('should enforce history limit', async () => {
    const smallHistory = new PromptHistory(HISTORY_PATH, 3);
    for (let i = 0; i < 5; i++) {
      await smallHistory.add({
        input: `prompt ${i}`, output: `output ${i}`, mode: 'standard',
        target_model: 'claude-sonnet', intent: null, template: null,
        retrospective: false, plan: false, metadata: {},
      });
    }
    const entries = await smallHistory.list();
    expect(entries).toHaveLength(3);
    // most recent should be last added
    expect(entries[entries.length - 1].input).toBe('prompt 4');
  });

  it('should filter retrospectives', async () => {
    await history.add({ input: 'a', output: 'b', mode: 'standard', target_model: 'x', intent: null, template: null, retrospective: true, plan: false, metadata: {} });
    await history.add({ input: 'c', output: 'd', mode: 'standard', target_model: 'x', intent: null, template: null, retrospective: false, plan: false, metadata: {} });
    const retros = await history.listRetrospectives();
    expect(retros).toHaveLength(1);
    expect(retros[0].input).toBe('a');
  });

  it('should filter plans', async () => {
    await history.add({ input: 'a', output: 'b', mode: 'plan', target_model: 'x', intent: null, template: null, retrospective: false, plan: true, metadata: {} });
    await history.add({ input: 'c', output: 'd', mode: 'standard', target_model: 'x', intent: null, template: null, retrospective: false, plan: false, metadata: {} });
    const plans = await history.listPlans();
    expect(plans).toHaveLength(1);
  });

  it('should find duplicates by similarity', async () => {
    await history.add({ input: 'Add rate limiting to my Express API', output: 'improved', mode: 'execute', target_model: 'x', intent: null, template: null, retrospective: false, plan: false, metadata: {} });
    const match = await history.findDuplicate('Add rate limiting to the Express API', 0.85);
    expect(match).not.toBeNull();
    expect(match!.input).toContain('rate limiting');
  });

  it('should not match dissimilar prompts', async () => {
    await history.add({ input: 'Add rate limiting to my Express API', output: 'improved', mode: 'execute', target_model: 'x', intent: null, template: null, retrospective: false, plan: false, metadata: {} });
    const match = await history.findDuplicate('Write a blog post about Rust', 0.85);
    expect(match).toBeNull();
  });

  it('should clear history', async () => {
    await history.add({ input: 'x', output: 'y', mode: 'standard', target_model: 'x', intent: null, template: null, retrospective: false, plan: false, metadata: {} });
    await history.clear();
    const entries = await history.list();
    expect(entries).toHaveLength(0);
  });

  it('should get entry by index', async () => {
    await history.add({ input: 'first', output: 'a', mode: 'standard', target_model: 'x', intent: null, template: null, retrospective: false, plan: false, metadata: {} });
    await history.add({ input: 'second', output: 'b', mode: 'standard', target_model: 'x', intent: null, template: null, retrospective: false, plan: false, metadata: {} });
    const entry = await history.getByIndex(0);
    expect(entry!.input).toBe('first');
  });
});
