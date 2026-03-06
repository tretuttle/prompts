#!/usr/bin/env node

import { parseArgs } from './core/cli.js';
import { loadConfig } from './core/config.js';
import { runEngine } from './core/engine.js';
import { firstRunSetup } from './core/setup.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const argv = process.argv.slice(2);

  // If invoked as `claude prompts`, strip the command name
  const args = parseArgs(argv);

  const projectRoot = process.cwd();
  const config = await loadConfig(projectRoot);

  // First-run setup: copy shipped rules
  const shippedRulesDir = join(__dirname, '..', 'shipped-rules');
  const copied = await firstRunSetup(projectRoot, shippedRulesDir);
  if (copied.length > 0) {
    console.error(`✦ First run: copied ${copied.length} Hookify rule(s) to .claude/`);
  }

  // Run engine
  const result = await runEngine(args, { config, projectRoot });

  // Output warnings
  for (const warning of result.warnings) {
    console.error(warning);
  }

  // Handle blocked
  if (result.blocked) {
    console.error(result.output);
    process.exit(1);
  }

  // Handle duplicate detection
  if (result.duplicateMatch && !args.refine) {
    const sim = '~high';
    console.error(`✦ Similar prompt found in history (${sim} match).`);
    console.error(`  Use previous result? [y/n/refine]`);
    // In non-interactive mode, just note it
  }

  // Output result
  console.log(result.output);

  // Plan mode: execution handoff
  if (result.mode === 'plan' && result.planPath) {
    console.error(`\n✦ Plan complete and saved to ${result.planPath}`);
    console.error(`
  Two execution options:

  1. Subagent-Driven (this session)
     Fresh subagent per task, code review between tasks, fast iteration.

  2. Parallel Session (separate)
     Open a new session in the worktree with executing-plans skill.

  Which approach?`);
  }

  // Clipboard confirmation
  if (config.auto_clipboard && !args.dryRun && !result.blocked) {
    console.error('✦ Copied to clipboard.');
  }
}

main().catch((err) => {
  console.error('Prompts error:', err.message);
  process.exit(1);
});
