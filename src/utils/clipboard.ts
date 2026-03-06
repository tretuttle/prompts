import { execSync } from 'child_process';
import { platform } from 'os';

// Note: All commands here are hardcoded constants — no user input is interpolated
// into shell commands. The `which` lookup and clipboard commands use known binary names only.

export function getClipboardCommand(): string | null {
  const os = platform();
  if (os === 'darwin') return 'pbcopy';
  if (os === 'win32') return 'clip';
  // Linux — check for common tools
  for (const cmd of ['xclip -selection clipboard', 'xsel --clipboard --input', 'wl-copy']) {
    try {
      const bin = cmd.split(' ')[0];
      execSync(`which ${bin}`, { stdio: 'ignore' });
      return cmd;
    } catch {
      continue;
    }
  }
  return null;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  const cmd = getClipboardCommand();
  if (!cmd) return false;
  try {
    execSync(cmd, { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
    return true;
  } catch {
    return false;
  }
}
