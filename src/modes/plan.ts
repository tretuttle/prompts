import type { ProjectContext, PluginConfig } from '../core/types.js';
import { classifyIntent } from '../core/intent.js';

export function generatePlan(input: string, context: ProjectContext, config: PluginConfig): string {
  const featureName = extractFeatureName(input);
  const sections: string[] = [];

  // Plan header
  sections.push(`# ${featureName} Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** ${input}

**Architecture:** This plan implements ${featureName.toLowerCase()} using a modular, test-driven approach. Each task is atomic and independently verifiable, with failing tests written before implementation.

**Tech Stack:** Determined by project context — ${context.activeLanguage || 'TypeScript'}, testing framework, and existing patterns.

---`);

  // Build tasks
  const tasks = generateTasks(input, context, config);
  for (const task of tasks) {
    sections.push(task);
  }

  // Hookify constraint notice
  if (context.hookifyRules.length > 0) {
    sections.push(`---\n\n## Active Hookify Constraints\n\nThe following project rules are embedded in this plan's implementation steps:\n`);
    for (const rule of context.hookifyRules) {
      sections.push(`- **${rule.name}:** ${rule.body.split('\n').filter(l => l.trim())[0]}`);
    }
  }

  return sections.join('\n\n');
}

function extractFeatureName(input: string): string {
  // Extract a concise feature name from the input
  const cleaned = input
    .replace(/^(build|create|implement|add|make|set up)\s+/i, '')
    .replace(/\s+(for|in|with|using|that|which)\s+.*/i, '');
  return cleaned.split(' ').slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function generateTasks(input: string, context: ProjectContext, config: PluginConfig): string[] {
  const lang = context.activeLanguage || 'typescript';
  const ext = lang === 'typescript' ? 'ts' : lang === 'python' ? 'py' : lang === 'go' ? 'go' : 'ts';
  const testExt = ext === 'ts' ? 'test.ts' : ext === 'py' ? 'test.py' : ext === 'go' ? '_test.go' : 'test.ts';
  const testCmd = ext === 'ts' ? 'npm test --' : ext === 'py' ? 'pytest' : 'go test';

  const featureSlug = input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .slice(0, 3)
    .join('-');

  const commitPrefix = config.plan_commit_style === 'gitmoji' ? '✨ ' :
    config.plan_commit_style === 'conventional' ? 'feat: ' : '';

  const tasks: string[] = [];

  // Task 1: Core implementation
  const task1 = `### Task 1: Core ${extractFeatureName(input)} Module

**Files:**
- Create: \`src/services/${featureSlug}.${ext}\`
- Test: \`tests/services/${featureSlug}.${testExt}\`

**Step 1: Write the failing test**

\`\`\`${lang}
// tests/services/${featureSlug}.${testExt}
// TODO: Write specific test for the core behavior described in: "${input}"
// Test should assert the primary success case.
\`\`\`

**Step 2: Run test to verify it fails**

Run: \`${testCmd} tests/services/${featureSlug}.${testExt}\`
Expected: FAIL with "module not found" or "function not defined"

**Step 3: Write minimal implementation**

\`\`\`${lang}
// src/services/${featureSlug}.${ext}
// TODO: Implement minimal code to make the test pass.
\`\`\`

**Step 4: Run test to verify it passes**

Run: \`${testCmd} tests/services/${featureSlug}.${testExt}\`
Expected: PASS

**Step 5: Commit**

\`\`\`bash
git add src/services/${featureSlug}.${ext} tests/services/${featureSlug}.${testExt}
git commit -m "${commitPrefix}add core ${featureSlug} module"
\`\`\``;

  tasks.push(task1);

  // Task 2: Integration / edge cases
  const task2 = `### Task 2: Edge Cases and Error Handling

**Files:**
- Modify: \`src/services/${featureSlug}.${ext}\`
- Modify: \`tests/services/${featureSlug}.${testExt}\`

**Step 1: Write the failing test**

\`\`\`${lang}
// Add edge case tests: null input, invalid data, boundary values
// TODO: Write specific edge case tests for "${input}"
\`\`\`

**Step 2: Run test to verify it fails**

Run: \`${testCmd} tests/services/${featureSlug}.${testExt}\`
Expected: FAIL — edge cases not handled

**Step 3: Write minimal implementation**

\`\`\`${lang}
// Add error handling and edge case support
// TODO: Handle the failing edge cases
\`\`\`

**Step 4: Run test to verify it passes**

Run: \`${testCmd} tests/services/${featureSlug}.${testExt}\`
Expected: PASS

**Step 5: Commit**

\`\`\`bash
git add src/services/${featureSlug}.${ext} tests/services/${featureSlug}.${testExt}
git commit -m "${commitPrefix}add error handling and edge cases for ${featureSlug}"
\`\`\``;

  tasks.push(task2);

  // Embed hookify constraints in TODO comments
  if (context.hookifyRules.length > 0) {
    const constraintNote = `### Hookify Constraint Reminders

When implementing the TODOs above, ensure compliance with these project rules:

${context.hookifyRules.map(r => `- **${r.name}:** ${r.body.split('\n').filter(l => l.trim()).slice(0, 2).join(' ')}`).join('\n')}

These constraints are enforced at write-time by Hookify. Plans that ignore them will trigger warnings or blocks.`;
    tasks.push(constraintNote);
  }

  return tasks;
}
