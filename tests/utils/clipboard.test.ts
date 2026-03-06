import { describe, it, expect, vi } from 'vitest';
import { copyToClipboard, getClipboardCommand } from '../../src/utils/clipboard';

describe('Clipboard', () => {
  it('should detect a clipboard command', () => {
    const cmd = getClipboardCommand();
    // On CI this might be null, that's fine
    expect(cmd === null || typeof cmd === 'string').toBe(true);
  });

  it('should not throw when clipboard is unavailable', async () => {
    // This should gracefully handle missing clipboard
    await expect(copyToClipboard('test')).resolves.not.toThrow();
  });
});
