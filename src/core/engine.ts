import type { CLIArgs, PluginConfig, EngineResult, ProjectContext, PromptMode } from './types.js';
import { gatherContext, validateContextRelevance } from './context.js';
import { classifyIntent, detectAutoMode, computeComplexity } from './intent.js';
import { PromptHistory } from './history.js';
import { loadBuiltinTemplates, loadCustomTemplates, applyTemplate, listTemplates } from './templates.js';
import { generateStandard } from '../modes/standard.js';
import { generateResearch } from '../modes/research.js';
import { generateExecute } from '../modes/execute.js';
import { generatePlan } from '../modes/plan.js';
import { analyzeQuality } from '../utils/quality.js';
import { detectAntiPatterns } from '../utils/antipatterns.js';
import { scanForSecrets } from '../utils/secrets.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { buildOrchestrationChain, validateFileReferences } from '../utils/orchestration.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface EngineOptions {
  config: PluginConfig;
  projectRoot: string;
  lastOutput?: string; // for --refine
}

export async function runEngine(args: CLIArgs, options: EngineOptions): Promise<EngineResult> {
  const { config, projectRoot } = options;
  const historyPath = join(projectRoot, '.prompt-history.json');
  const history = new PromptHistory(historyPath, config.history_limit);

  // ── Handle history commands ──
  if (args.clearHistory) {
    await history.clear();
    return makeResult('✦ Prompt history cleared.', 'standard');
  }

  if (args.history !== false) {
    return await handleHistoryCommand(args, history);
  }

  // ── Handle list-templates ──
  if (args.listTemplates) {
    const builtins = loadBuiltinTemplates();
    const custom = config.template_dir ? await loadCustomTemplates(config.template_dir) : [];
    return makeResult(listTemplates([...builtins, ...custom]), 'standard');
  }

  // ── Secret scan on input ──
  const inputWarnings: string[] = [];
  if (config.secret_scan) {
    const scan = scanForSecrets(args.input, config.secret_patterns);
    if (scan.found) {
      const detectedTypes = scan.matches.map(m => m.type).join(', ');
      if (config.secret_scan_action === 'block') {
        const msg = `🚫 Secret detected in input.\n\nDetected: ${detectedTypes}\n\nRemove the sensitive content and retry.`;
        return { ...makeResult(msg, args.mode), blocked: true, blockedReason: 'Secret detected in input' };
      }
      inputWarnings.push(`⚠️ Potential secret in input: ${detectedTypes}`);
    }
  }

  // ── Duplicate detection ──
  let duplicateMatch = null;
  if (config.dedup && args.input && !args.refine) {
    duplicateMatch = await history.findDuplicate(args.input, config.dedup_threshold);
    if (duplicateMatch) {
      // Return the match info, let the caller decide
    }
  }

  // ── Dry run ──
  if (args.dryRun) {
    const intent = classifyIntent(args.input);
    const complexity = computeComplexity(args.input);
    const autoMode = detectAutoMode(args.input);
    return makeResult(
      `## Dry Run Analysis\n\n` +
      `**Input:** ${args.input}\n` +
      `**Intent:** ${intent}\n` +
      `**Complexity:** ${complexity.toFixed(2)}\n` +
      `**Auto-mode would select:** ${autoMode}\n` +
      `**Explicit mode:** ${args.mode}\n` +
      `**Target model:** ${args.target || config.target_model}\n` +
      `**Would pass complexity gate:** ${complexity >= config.complexity_threshold ? 'yes' : 'no (trivial input)'}`,
      args.mode
    );
  }

  // ── Resolve mode ──
  let mode: PromptMode = args.mode;
  if (mode === 'standard' && config.auto_mode_routing) {
    mode = detectAutoMode(args.input);
  }

  // ── Override target model ──
  const effectiveConfig = args.target
    ? { ...config, target_model: args.target }
    : config;

  // ── Gather context ──
  const context = await gatherContext(effectiveConfig, projectRoot);

  // ── Context validation — trim irrelevant project structure ──
  if (config.context_validation && config.context_depth === 'project' && context.projectStructure) {
    const structureLines = context.projectStructure.split('\n').filter(l => l.trim());
    const contextItems = structureLines.map(line => {
      const name = line.replace(/^[\s📁📄]+/, '').trim();
      return { path: name, content: name };
    });
    const relevant = validateContextRelevance(args.input, contextItems, config.context_relevance_threshold);
    if (relevant.length < contextItems.length && relevant.length > 0) {
      context.projectStructure = relevant.map(r => r.path).join('\n');
    }
  }

  // ── Apply template if specified ──
  let input = args.input;
  let usedTemplate: string | null = args.template;
  if (args.template) {
    const builtins = loadBuiltinTemplates();
    const custom = effectiveConfig.template_dir ? await loadCustomTemplates(effectiveConfig.template_dir) : [];
    const all = [...builtins, ...custom];
    const tmpl = all.find(t => t.name === args.template);
    if (tmpl) {
      input = applyTemplate(tmpl, args.input);
      if (tmpl.mode !== 'standard') mode = tmpl.mode;
    }
  }

  // ── Refine: prepend last output context ──
  if (args.refine && options.lastOutput) {
    input = `Refine and improve this prompt. Previous version:\n\n${options.lastOutput}\n\nOriginal request: ${input}`;
  }

  // ── Generate ──
  let output: string;
  switch (mode) {
    case 'research':
      output = generateResearch(input, context, effectiveConfig);
      break;
    case 'execute':
      output = generateExecute(input, context, effectiveConfig);
      break;
    case 'plan':
      output = generatePlan(input, context, effectiveConfig);
      break;
    default:
      output = generateStandard(input, context, effectiveConfig);
      break;
  }

  // ── Secret scan on output ──
  const warnings: string[] = [...inputWarnings];
  if (config.secret_scan) {
    const outScan = scanForSecrets(output, config.secret_patterns);
    if (outScan.found) {
      if (config.secret_scan_action === 'block') {
        return { ...makeResult('🚫 Secret detected in generated output. Output blocked.', mode), blocked: true, blockedReason: 'Secret in output' };
      }
      warnings.push(`⚠️ Potential secret in output: ${outScan.matches.map(m => m.type).join(', ')}`);
    }
  }

  // ── Quality gate ──
  let qualityReport = null;
  if (config.quality_gate) {
    qualityReport = analyzeQuality({ input: args.input, output, mode, tokenBudget: config.token_budget });
    if (!qualityReport.passed) {
      if (config.quality_gate_action === 'refine') {
        // Auto-refine: re-run generation with failed output as context (one pass only)
        const refinedInput = `Refine and improve this prompt. Previous version:\n\n${output}\n\nOriginal request: ${input}`;
        switch (mode) {
          case 'research': output = generateResearch(refinedInput, context, effectiveConfig); break;
          case 'execute': output = generateExecute(refinedInput, context, effectiveConfig); break;
          case 'plan': output = generatePlan(refinedInput, context, effectiveConfig); break;
          default: output = generateStandard(refinedInput, context, effectiveConfig); break;
        }
        qualityReport = analyzeQuality({ input: args.input, output, mode, tokenBudget: config.token_budget });
        if (!qualityReport.passed) {
          warnings.push(...qualityReport.issues.map(i => `⚠️ Quality (after refine): ${i}`));
        }
      } else {
        warnings.push(...qualityReport.issues.map(i => `⚠️ Quality: ${i}`));
      }
    }
  }

  // ── Anti-pattern check ──
  if (config.anti_pattern_check) {
    const antiPatterns = detectAntiPatterns({
      input: args.input,
      output,
      tokenBudget: config.token_budget,
      hookifyRules: context.hookifyRules,
    });
    if (antiPatterns.length > 0) {
      if (config.anti_pattern_action === 'block') {
        return { ...makeResult(`🚫 Anti-pattern detected:\n${antiPatterns.map(a => `- ${a.message}`).join('\n')}`, mode), blocked: true, blockedReason: 'Anti-pattern detected' };
      }
      warnings.push(...antiPatterns.map(a => `⚠️ Anti-pattern: ${a.message}`));
    }
  }

  // ── Orchestration — cross-plugin chain for execute mode ──
  if (mode === 'execute' && (args.orchestrate || config.orchestration) && config.orchestration_chain.length > 0) {
    const chain = buildOrchestrationChain(config.orchestration_chain, output);
    warnings.push(`✦ Orchestration chain: ${chain.map(s => s.plugin).join(' → ')}`);
    const fileRefs = validateFileReferences(output);
    if (fileRefs.length > 0) {
      warnings.push(`✦ Referenced files: ${fileRefs.join(', ')}`);
    }
  }

  // ── Save plan to file ──
  let planPath: string | null = null;
  if (mode === 'plan') {
    const dateStr = new Date().toISOString().slice(0, 10);
    const slug = args.input.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const fileName = `${dateStr}-${slug}.md`;
    const planDir = join(projectRoot, config.plan_output_dir);
    await mkdir(planDir, { recursive: true });
    planPath = join(planDir, fileName);
    await writeFile(planPath, output, 'utf-8');
  }

  // ── Save to history ──
  const intent = classifyIntent(args.input);
  await history.add({
    input: args.input,
    output,
    mode,
    target_model: effectiveConfig.target_model,
    intent,
    template: usedTemplate,
    retrospective: false,
    plan: mode === 'plan',
    metadata: { warnings, planPath },
  });

  // ── Clipboard ──
  if (config.auto_clipboard && !args.dryRun) {
    await copyToClipboard(output);
  }

  return {
    output,
    mode,
    intent,
    qualityReport,
    warnings,
    blocked: false,
    blockedReason: null,
    planPath,
    templateSuggestion: null,
    duplicateMatch,
  };
}

async function handleHistoryCommand(args: CLIArgs, history: PromptHistory): Promise<EngineResult> {
  if (typeof args.history === 'number') {
    const entry = await history.getByIndex(args.history);
    if (entry) {
      return makeResult(`## History Entry #${args.history}\n\n**Input:** ${entry.input}\n**Mode:** ${entry.mode}\n**Time:** ${entry.timestamp}\n\n---\n\n${entry.output}`, 'standard');
    }
    return makeResult(`No history entry at index ${args.history}.`, 'standard');
  }

  let entries;
  if (args.historyRetrospectives) {
    entries = await history.listRetrospectives();
  } else if (args.historyPlans) {
    entries = await history.listPlans();
  } else {
    entries = await history.list();
  }

  if (entries.length === 0) {
    return makeResult('No prompt history found.', 'standard');
  }

  const listing = entries.map((e, i) =>
    `${i}. [${e.mode}] ${e.input.slice(0, 80)}${e.input.length > 80 ? '...' : ''} (${e.timestamp})`
  ).join('\n');

  return makeResult(`## Prompt History\n\n${listing}`, 'standard');
}

function makeResult(output: string, mode: PromptMode): EngineResult {
  return {
    output,
    mode,
    intent: null,
    qualityReport: null,
    warnings: [],
    blocked: false,
    blockedReason: null,
    planPath: null,
    templateSuggestion: null,
    duplicateMatch: null,
  };
}
