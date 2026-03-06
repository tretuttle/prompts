import { readdir, readFile, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { execSync } from 'child_process';
import type { ProjectContext, HookifyRule, HookifyCondition, PluginConfig } from './types.js';

// Note: execSync is used here only with hardcoded git commands (no user input),
// so there is no command injection risk.

// ── Hookify Rule Parsing ──

export function parseHookifyRule(content: string, filePath: string): HookifyRule {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!frontmatterMatch) {
    return {
      name: basename(filePath),
      enabled: false,
      event: 'all',
      action: 'warn',
      conditions: [],
      body: content,
      filePath,
    };
  }

  const yaml = frontmatterMatch[1];
  const body = frontmatterMatch[2].trim();

  const name = yamlValue(yaml, 'name') || basename(filePath);
  const enabled = yamlValue(yaml, 'enabled') !== 'false';
  const event = yamlValue(yaml, 'event') || 'all';
  const action = yamlValue(yaml, 'action') || 'warn';

  let conditions: HookifyCondition[] = [];

  // Check for simple pattern format
  const simplePattern = yamlValue(yaml, 'pattern');
  if (simplePattern && !yaml.includes('conditions:')) {
    const field = event === 'bash' ? 'command' : event === 'file' ? 'new_text' : event === 'prompt' ? 'user_prompt' : 'command';
    conditions = [{ field, operator: 'regex_match', pattern: simplePattern }];
  } else {
    // Parse conditions array from YAML
    conditions = parseYamlConditions(yaml);
  }

  return { name, enabled, event, action, conditions, body, filePath };
}

function yamlValue(yaml: string, key: string): string | null {
  const match = yaml.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

function parseYamlConditions(yaml: string): HookifyCondition[] {
  const conditions: HookifyCondition[] = [];
  // Match everything after "conditions:" until a non-indented line or end
  const conditionsBlock = yaml.match(/conditions:\n((?:[ \t]+.*\n?)*)/);
  if (!conditionsBlock) return conditions;

  // Split on list item markers
  const items = conditionsBlock[1].split(/^\s*- /m).filter(s => s.trim());
  for (const item of items) {
    const field = yamlValue(item, 'field');
    const operator = yamlValue(item, 'operator');
    const pattern = yamlValue(item, 'pattern');
    if (field && operator && pattern) {
      conditions.push({ field, operator, pattern });
    }
  }
  return conditions;
}

// ── Context Relevance Validation ──

export function validateContextRelevance(
  input: string,
  contextItems: { path: string; content: string }[],
  threshold: number
): { path: string; content: string }[] {
  const stopWords = new Set(['the', 'a', 'an', 'to', 'in', 'on', 'at', 'for', 'of', 'is', 'it', 'and', 'or', 'but', 'not', 'this', 'that', 'with']);
  const inputWords = input.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));

  return contextItems.filter(item => {
    const itemText = `${item.path} ${item.content}`.toLowerCase();
    const itemWords = itemText.split(/\W+/).filter(w => w.length > 2);

    // Score based on keyword overlap with substring/stem matching
    let matchScore = 0;
    const significantInputWords = inputWords.filter(w => w.length >= 4);
    for (const iw of significantInputWords) {
      for (const w of itemWords) {
        if (w === iw) {
          matchScore += 1.0;
          break;
        } else if (w.length >= 3 && (w.includes(iw) || iw.includes(w))) {
          matchScore += 0.8;
          break;
        }
      }
    }
    // Score against significant words only (filter out short/common words)
    const score = matchScore / Math.max(significantInputWords.length, 1);
    return score >= threshold;
  });
}

// ── Project Structure ──

async function getProjectTree(root: string, depth = 2, prefix = ''): Promise<string> {
  const lines: string[] = [];
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const filtered = entries.filter(e =>
      !e.name.startsWith('.') &&
      e.name !== 'node_modules' &&
      e.name !== 'dist' &&
      e.name !== 'coverage'
    );
    for (const entry of filtered) {
      lines.push(`${prefix}${entry.isDirectory() ? '📁' : '📄'} ${entry.name}`);
      if (entry.isDirectory() && depth > 1) {
        const sub = await getProjectTree(join(root, entry.name), depth - 1, prefix + '  ');
        lines.push(sub);
      }
    }
  } catch {
    // directory not readable
  }
  return lines.join('\n');
}

function safeExec(cmd: string, cwd: string): string | null {
  try {
    return execSync(cmd, { cwd, timeout: 5000, encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

// ── Hookify Rule Loading ──

async function loadHookifyRules(projectRoot: string): Promise<HookifyRule[]> {
  const claudeDir = join(projectRoot, '.claude');
  const rules: HookifyRule[] = [];
  try {
    const entries = await readdir(claudeDir);
    for (const entry of entries) {
      if (entry.startsWith('hookify.') && entry.endsWith('.local.md')) {
        const filePath = join(claudeDir, entry);
        const content = await readFile(filePath, 'utf-8');
        const rule = parseHookifyRule(content, filePath);
        if (rule.enabled) {
          rules.push(rule);
        }
      }
    }
  } catch {
    // .claude dir doesn't exist
  }
  return rules;
}

// ── Main Context Gatherer ──

export async function gatherContext(config: PluginConfig, projectRoot: string): Promise<ProjectContext> {
  const empty: ProjectContext = {
    activeFile: null,
    activeLanguage: null,
    codeSnippet: null,
    projectStructure: null,
    activeErrors: null,
    gitBranch: null,
    lastCommitMessage: null,
    hookifyRules: [],
  };

  if (config.context_depth === 'none') return empty;

  const ctx = { ...empty };

  // Git context (always when not "none") - hardcoded commands, no injection risk
  ctx.gitBranch = safeExec('git rev-parse --abbrev-ref HEAD', projectRoot);
  ctx.lastCommitMessage = safeExec('git log -1 --pretty=%s', projectRoot);

  // Hookify rules
  if (config.hookify_constraints) {
    ctx.hookifyRules = await loadHookifyRules(projectRoot);
  }

  if (config.context_depth === 'project') {
    ctx.projectStructure = await getProjectTree(projectRoot);
  }

  return ctx;
}

// ── Context Formatting ──

export function formatContext(ctx: ProjectContext): string {
  const sections: string[] = [];

  if (ctx.gitBranch) {
    sections.push(`**Git Branch:** ${ctx.gitBranch}`);
  }
  if (ctx.lastCommitMessage) {
    sections.push(`**Last Commit:** ${ctx.lastCommitMessage}`);
  }
  if (ctx.activeFile) {
    sections.push(`**Active File:** ${ctx.activeFile} (${ctx.activeLanguage || 'unknown'})`);
  } else if (ctx.activeLanguage) {
    sections.push(`**Language:** ${ctx.activeLanguage}`);
  }
  if (ctx.projectStructure) {
    sections.push(`**Project Structure:**\n\`\`\`\n${ctx.projectStructure}\n\`\`\``);
  }
  if (ctx.activeErrors && ctx.activeErrors.length > 0) {
    sections.push(`**Active Errors:**\n${ctx.activeErrors.map(e => `- ${e}`).join('\n')}`);
  }
  if (ctx.hookifyRules.length > 0) {
    const ruleDescriptions = ctx.hookifyRules
      .map(r => `- **${r.name}** (${r.event}/${r.action}): ${r.body.split('\n')[0]}`)
      .join('\n');
    sections.push(`**Active Hookify Constraints:**\n${ruleDescriptions}`);
  }

  return sections.join('\n\n');
}
