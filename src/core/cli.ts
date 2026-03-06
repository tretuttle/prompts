import type { CLIArgs, PromptMode } from './types.js';

export function parseArgs(argv: string[]): CLIArgs {
  const result: CLIArgs = {
    input: '',
    mode: 'standard',
    refine: false,
    dryRun: false,
    target: null,
    template: null,
    listTemplates: false,
    history: false,
    historyRetrospectives: false,
    historyPlans: false,
    clearHistory: false,
    orchestrate: false,
    noSuggestions: false,
  };

  const inputTokens: string[] = [];
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    switch (arg) {
      case '-r':
      case '--research':
        result.mode = 'research';
        break;
      case '-e':
      case '--execute':
        result.mode = 'execute';
        break;
      case '-p':
      case '--plan':
        result.mode = 'plan';
        break;
      case '--refine':
        result.refine = true;
        break;
      case '--dry-run':
        result.dryRun = true;
        break;
      case '--target':
        i++;
        result.target = argv[i] ?? null;
        break;
      case '--template':
        i++;
        result.template = argv[i] ?? null;
        break;
      case '--list-templates':
        result.listTemplates = true;
        break;
      case '--history': {
        const next = argv[i + 1];
        if (next && /^\d+$/.test(next)) {
          result.history = parseInt(next, 10);
          i++;
        } else {
          result.history = true;
        }
        break;
      }
      case '--retrospectives':
        result.historyRetrospectives = true;
        break;
      case '--plans':
        result.historyPlans = true;
        break;
      case '--clear-history':
        result.clearHistory = true;
        break;
      case '--orchestrate':
        result.orchestrate = true;
        break;
      case '--no-suggestions':
        result.noSuggestions = true;
        break;
      default:
        if (!arg.startsWith('-')) {
          inputTokens.push(arg);
        }
        break;
    }
    i++;
  }

  result.input = inputTokens.join(' ');
  return result;
}
