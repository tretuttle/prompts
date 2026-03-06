import { readdir, readFile, writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';

export async function firstRunSetup(projectRoot: string, shippedRulesDir: string): Promise<string[]> {
  const claudeDir = join(projectRoot, '.claude');
  await mkdir(claudeDir, { recursive: true });

  const copied: string[] = [];

  try {
    const ruleFiles = await readdir(shippedRulesDir);
    for (const file of ruleFiles) {
      if (!file.endsWith('.local.md')) continue;
      const destPath = join(claudeDir, file);

      // Don't overwrite existing
      try {
        await access(destPath);
        continue; // file exists, skip
      } catch {
        // file doesn't exist, proceed
      }

      const content = await readFile(join(shippedRulesDir, file), 'utf-8');
      await writeFile(destPath, content, 'utf-8');
      copied.push(file);
    }
  } catch {
    // shipped-rules dir not found, skip
  }

  return copied;
}
