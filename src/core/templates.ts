import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import type { PromptTemplate, PromptMode } from './types.js';

// ── Built-in Template Definitions ──

const BUILTIN_TEMPLATES: PromptTemplate[] = [
  // ── Debugging (5) ──
  { name: 'debug', description: 'Debug a specific error or issue', category: 'debugging', mode: 'standard',
    template: `Analyze and debug the following issue. Identify the root cause, explain why it happens, and provide a fix with before/after code.\n\nIssue: {{input}}\n\nConstraints:\n- Show the exact error flow\n- Provide a minimal, targeted fix\n- Include a test to prevent regression` },
  { name: 'debug-runtime', description: 'Debug a runtime error with stack trace analysis', category: 'debugging', mode: 'standard',
    template: `Analyze this runtime error. Trace through the call stack, identify the root cause, and provide a fix.\n\nError context: {{input}}\n\nProvide:\n1. Root cause analysis\n2. The exact line/expression causing the error\n3. A targeted fix with code\n4. A regression test` },
  { name: 'debug-performance', description: 'Diagnose performance issues', category: 'debugging', mode: 'standard',
    template: `Diagnose the performance issue described below. Identify bottlenecks and provide optimizations with benchmarks.\n\nProblem: {{input}}\n\nProvide:\n- Profiling strategy\n- Identified bottleneck(s)\n- Optimized code with complexity analysis\n- Before/after benchmark comparison` },
  { name: 'debug-memory', description: 'Debug memory leaks', category: 'debugging', mode: 'standard',
    template: `Investigate the following memory issue. Identify the leak source and provide a fix.\n\nSymptoms: {{input}}\n\nProvide:\n- Likely leak pattern (event listeners, closures, circular refs, etc.)\n- Diagnostic steps\n- Fix with before/after code\n- Verification strategy` },
  { name: 'debug-network', description: 'Debug network/API issues', category: 'debugging', mode: 'standard',
    template: `Debug this network or API issue. Identify the failure point and provide a resolution.\n\nIssue: {{input}}\n\nAnalyze:\n- Request/response cycle\n- Headers, status codes, timeouts\n- Authentication/authorization flow\n- Provide fix with error handling` },

  // ── Refactoring (5) ──
  { name: 'refactor', description: 'Refactor code for clarity and maintainability', category: 'refactoring', mode: 'execute',
    template: `Refactor the following code. Improve readability, reduce complexity, and follow best practices while preserving behavior.\n\nTarget: {{input}}\n\nConstraints:\n- Preserve all existing behavior (no functional changes)\n- Reduce cyclomatic complexity\n- Apply DRY and SRP\n- Provide before/after with explanation of each change` },
  { name: 'refactor-extract', description: 'Extract reusable functions/modules', category: 'refactoring', mode: 'execute',
    template: `Identify and extract reusable pieces from the following code into well-named functions or modules.\n\nTarget: {{input}}\n\nConstraints:\n- Each extracted piece must be independently testable\n- Maintain original call sites\n- Name functions by what they do, not how` },
  { name: 'refactor-types', description: 'Improve type safety', category: 'refactoring', mode: 'execute',
    template: `Improve the type safety of the following code. Replace any, add generics, and tighten types.\n\nTarget: {{input}}\n\nConstraints:\n- Eliminate all 'any' types\n- Use discriminated unions where applicable\n- Add generic constraints\n- Ensure no runtime behavior changes` },
  { name: 'refactor-patterns', description: 'Apply design patterns', category: 'refactoring', mode: 'execute',
    template: `Analyze the following code and apply appropriate design patterns to improve architecture.\n\nTarget: {{input}}\n\nConstraints:\n- Only apply patterns that reduce complexity\n- YAGNI — don't over-engineer\n- Document which pattern and why\n- Provide migration path from current to refactored` },
  { name: 'refactor-async', description: 'Refactor async/promise code', category: 'refactoring', mode: 'execute',
    template: `Refactor the async code below. Fix anti-patterns, improve error handling, and optimize concurrency.\n\nTarget: {{input}}\n\nFix:\n- Unhandled promise rejections\n- Sequential awaits that could be parallel\n- Missing error boundaries\n- Race conditions` },

  // ── Testing (5) ──
  { name: 'unit-test', description: 'Generate unit tests for a module', category: 'testing', mode: 'execute',
    template: `Write comprehensive unit tests for the following module/function. Cover happy paths, edge cases, and error states.\n\nTarget: {{input}}\n\nRequirements:\n- AAA pattern (Arrange-Act-Assert)\n- Test each public method/function\n- Include edge cases: null, undefined, empty, boundary values\n- Mock external dependencies\n- Descriptive test names that read as specifications` },
  { name: 'integration-test', description: 'Generate integration tests', category: 'testing', mode: 'execute',
    template: `Write integration tests for the following system interaction. Test real component boundaries.\n\nTarget: {{input}}\n\nRequirements:\n- Test actual component integration, not mocked\n- Include setup/teardown for test fixtures\n- Test both success and failure paths\n- Verify side effects (DB writes, API calls, events)` },
  { name: 'e2e-test', description: 'Generate end-to-end tests', category: 'testing', mode: 'execute',
    template: `Write end-to-end tests for the following user flow.\n\nFlow: {{input}}\n\nRequirements:\n- Test the complete user journey\n- Include assertions on visible UI state\n- Handle async operations with appropriate waits\n- Test on both happy path and key error states` },
  { name: 'test-edge-cases', description: 'Generate edge case tests', category: 'testing', mode: 'standard',
    template: `Identify and write tests for edge cases in the following code.\n\nTarget: {{input}}\n\nConsider:\n- Boundary values (0, -1, MAX_INT, empty string, null, undefined)\n- Concurrent access / race conditions\n- Unicode and special characters\n- Very large inputs\n- Network timeouts and partial failures\n- Time-dependent behavior (DST, timezones, leap years)` },
  { name: 'test-fixtures', description: 'Generate test fixtures and factories', category: 'testing', mode: 'execute',
    template: `Create test fixtures and factory functions for the following data models.\n\nModels: {{input}}\n\nRequirements:\n- Factory pattern with sensible defaults\n- Override any field via parameters\n- Include related entity factories\n- Unique values where needed (IDs, emails)` },

  // ── Code Review (4) ──
  { name: 'code-review', description: 'Review code for issues and improvements', category: 'review', mode: 'standard',
    template: `Review the following code. Identify bugs, security issues, performance problems, and maintainability concerns.\n\nCode: {{input}}\n\nReview for:\n- Bugs and logic errors\n- Security vulnerabilities (injection, XSS, auth bypass)\n- Performance issues (N+1 queries, unnecessary allocations)\n- Code style and readability\n- Missing error handling\n- Test coverage gaps\n\nFor each finding, rate severity (critical/high/medium/low) and provide a fix.` },
  { name: 'pr-review', description: 'Review a pull request', category: 'review', mode: 'standard',
    template: `Review this pull request. Focus on correctness, security, and maintainability.\n\nPR context: {{input}}\n\nProvide:\n- Summary of changes\n- Blocking issues (must fix before merge)\n- Non-blocking suggestions\n- Questions for the author\n- Approval recommendation with confidence level` },
  { name: 'security-review', description: 'Security-focused code review', category: 'review', mode: 'standard',
    template: `Perform a security review of the following code. Focus on OWASP Top 10 and language-specific vulnerabilities.\n\nTarget: {{input}}\n\nCheck:\n- Input validation and sanitization\n- Authentication/authorization flaws\n- Injection vulnerabilities (SQL, XSS, command)\n- Sensitive data exposure\n- Insecure deserialization\n- Misconfigured security headers` },
  { name: 'architecture-review', description: 'Review system architecture', category: 'review', mode: 'research',
    template: `Review the following system architecture for scalability, maintainability, and resilience.\n\nArchitecture: {{input}}\n\nEvaluate:\n- Component coupling and cohesion\n- Scalability bottlenecks\n- Single points of failure\n- Data consistency model\n- Deployment complexity\n- Operational observability` },

  // ── Documentation (5) ──
  { name: 'docs', description: 'Generate documentation for code', category: 'documentation', mode: 'standard',
    template: `Write clear, comprehensive documentation for the following code.\n\nTarget: {{input}}\n\nInclude:\n- Purpose and overview\n- API reference (functions, params, return values)\n- Usage examples with realistic scenarios\n- Error handling and edge cases\n- Configuration options if applicable` },
  { name: 'docs-api', description: 'Generate API documentation', category: 'documentation', mode: 'standard',
    template: `Write API documentation for the following endpoints.\n\nEndpoints: {{input}}\n\nFor each endpoint include:\n- Method, path, description\n- Request params, body, headers\n- Response schema with examples\n- Error codes and messages\n- Authentication requirements\n- Rate limits if applicable` },
  { name: 'docs-readme', description: 'Generate a README', category: 'documentation', mode: 'standard',
    template: `Write a README.md for the following project.\n\nProject: {{input}}\n\nSections:\n- Title and description\n- Features\n- Installation\n- Usage with examples\n- Configuration\n- Development setup\n- Contributing\n- License` },
  { name: 'docs-jsdoc', description: 'Add JSDoc/TSDoc comments', category: 'documentation', mode: 'execute',
    template: `Add comprehensive JSDoc/TSDoc comments to the following code.\n\nTarget: {{input}}\n\nRequirements:\n- @param with type and description\n- @returns with type and description\n- @throws for known error conditions\n- @example with realistic usage\n- @see for related functions` },
  { name: 'docs-changelog', description: 'Generate changelog entry', category: 'documentation', mode: 'standard',
    template: `Write a changelog entry for the following changes.\n\nChanges: {{input}}\n\nFormat: Keep a Changelog (https://keepachangelog.com)\nCategories: Added, Changed, Deprecated, Removed, Fixed, Security` },

  // ── Implementation (5) ──
  { name: 'implement', description: 'Implement a feature from description', category: 'implementation', mode: 'execute',
    template: `Implement the following feature. Provide complete, production-ready code.\n\nFeature: {{input}}\n\nRequirements:\n- Complete implementation (not pseudocode)\n- Error handling for all failure modes\n- TypeScript types if applicable\n- Input validation\n- Follow existing project conventions` },
  { name: 'implement-api', description: 'Implement an API endpoint', category: 'implementation', mode: 'execute',
    template: `Implement the following API endpoint with full request validation, business logic, and error handling.\n\nEndpoint: {{input}}\n\nInclude:\n- Route definition\n- Request validation (params, body, query)\n- Business logic\n- Error responses with proper status codes\n- Response serialization\n- Tests` },
  { name: 'implement-component', description: 'Implement a UI component', category: 'implementation', mode: 'execute',
    template: `Implement the following UI component with proper state management, accessibility, and styling.\n\nComponent: {{input}}\n\nInclude:\n- Component with TypeScript props interface\n- Accessible markup (ARIA attributes, keyboard nav)\n- Responsive styling\n- Loading and error states\n- Unit tests` },
  { name: 'implement-cli', description: 'Implement a CLI command', category: 'implementation', mode: 'execute',
    template: `Implement the following CLI command with argument parsing, validation, and help text.\n\nCommand: {{input}}\n\nInclude:\n- Argument parsing with help text\n- Input validation with helpful error messages\n- Colored output for status/errors\n- Exit codes\n- Tests` },
  { name: 'implement-middleware', description: 'Implement middleware', category: 'implementation', mode: 'execute',
    template: `Implement the following middleware with proper error handling and configuration.\n\nMiddleware: {{input}}\n\nInclude:\n- Middleware function with next() handling\n- Configuration options\n- Error handling that doesn't swallow errors\n- Logging\n- Tests` },

  // ── Database (3) ──
  { name: 'db-migration', description: 'Generate database migration', category: 'database', mode: 'execute',
    template: `Write a database migration for the following schema change.\n\nChange: {{input}}\n\nInclude:\n- Up migration\n- Down migration (rollback)\n- Data migration if needed\n- Index considerations\n- Zero-downtime deployment notes` },
  { name: 'db-query', description: 'Optimize a database query', category: 'database', mode: 'standard',
    template: `Analyze and optimize the following database query.\n\nQuery: {{input}}\n\nProvide:\n- Query plan analysis\n- Optimization recommendations\n- Rewritten query\n- Index suggestions\n- Estimated performance improvement` },
  { name: 'db-schema', description: 'Design database schema', category: 'database', mode: 'standard',
    template: `Design a database schema for the following requirements.\n\nRequirements: {{input}}\n\nInclude:\n- Table definitions with types and constraints\n- Relationships and foreign keys\n- Indexes for common queries\n- Normalization notes\n- Migration SQL` },

  // ── DevOps (3) ──
  { name: 'docker', description: 'Write Dockerfile and compose config', category: 'devops', mode: 'execute',
    template: `Create a Dockerfile and docker-compose.yml for the following service.\n\nService: {{input}}\n\nRequirements:\n- Multi-stage build\n- Non-root user\n- Health check\n- Minimal image size\n- Environment variable configuration` },
  { name: 'ci-pipeline', description: 'Create CI/CD pipeline config', category: 'devops', mode: 'execute',
    template: `Create a CI/CD pipeline configuration for the following project.\n\nProject: {{input}}\n\nInclude:\n- Build stage\n- Test stage with coverage\n- Lint/format check\n- Security scan\n- Deploy stage with environment gates\n- Caching for fast builds` },
  { name: 'monitoring', description: 'Set up monitoring and alerting', category: 'devops', mode: 'execute',
    template: `Design monitoring and alerting for the following system.\n\nSystem: {{input}}\n\nInclude:\n- Key metrics to track\n- Alert thresholds and escalation\n- Dashboard layout\n- Log aggregation strategy\n- SLO/SLI definitions` },

  // ── Plan Templates (2) ──
  { name: 'plan-feature', description: 'TDD implementation plan for a new feature', category: 'planning', mode: 'plan',
    template: `Create a complete TDD implementation plan for the following feature.\n\nFeature: {{input}}\n\nThis plan must include:\n- Structured header with goal, architecture, tech stack\n- Bite-sized tasks (2-5 min each)\n- TDD sequence: write failing test → verify fail → implement → verify pass → commit\n- Exact file paths for every file\n- Complete code blocks (not pseudocode)\n- Test commands with expected output\n- Conventional commit messages\n\nPrinciples: DRY, YAGNI, TDD, frequent atomic commits.` },
  { name: 'plan-migration', description: 'TDD implementation plan for a data/schema migration', category: 'planning', mode: 'plan',
    template: `Create a complete TDD implementation plan for the following migration.\n\nMigration: {{input}}\n\nThis plan must include:\n- Data inventory and mapping\n- Rollback strategy at each step\n- Validation queries (row counts, data integrity checks)\n- Zero-downtime deployment steps\n- TDD tasks with exact file paths and complete code\n- Test commands with expected output for each step\n- Conventional commit messages\n\nPrinciples: DRY, YAGNI, TDD, frequent atomic commits, always have a rollback.` },

  // ── Miscellaneous (8) ──
  { name: 'error-handling', description: 'Add error handling to code', category: 'quality', mode: 'execute',
    template: `Add comprehensive error handling to the following code.\n\nTarget: {{input}}\n\nInclude:\n- Try/catch at appropriate boundaries\n- Custom error types with context\n- User-facing error messages\n- Logging for debugging\n- Graceful degradation where possible\n- Recovery strategies` },
  { name: 'accessibility', description: 'Improve accessibility', category: 'quality', mode: 'execute',
    template: `Audit and fix accessibility issues in the following UI code.\n\nTarget: {{input}}\n\nCheck:\n- ARIA labels and roles\n- Keyboard navigation\n- Color contrast ratios\n- Screen reader compatibility\n- Focus management\n- Alternative text` },
  { name: 'i18n', description: 'Internationalize code', category: 'quality', mode: 'execute',
    template: `Internationalize the following code. Extract strings and add locale support.\n\nTarget: {{input}}\n\nInclude:\n- String extraction to locale files\n- Pluralization support\n- Date/number formatting\n- RTL considerations\n- Fallback locale handling` },
  { name: 'logging', description: 'Add structured logging', category: 'quality', mode: 'execute',
    template: `Add structured logging to the following code.\n\nTarget: {{input}}\n\nRequirements:\n- Structured JSON format\n- Log levels (debug, info, warn, error)\n- Correlation IDs for request tracing\n- Sensitive data masking\n- Performance-critical path awareness` },
  { name: 'validation', description: 'Add input validation', category: 'quality', mode: 'execute',
    template: `Add comprehensive input validation to the following code.\n\nTarget: {{input}}\n\nInclude:\n- Type validation\n- Range/length constraints\n- Format validation (email, URL, etc.)\n- Sanitization for security\n- Clear error messages\n- Validation schema (Zod/Joi/Yup)` },
  { name: 'optimize', description: 'Optimize code for performance', category: 'quality', mode: 'standard',
    template: `Optimize the following code for performance without sacrificing readability.\n\nTarget: {{input}}\n\nAnalyze:\n- Time complexity\n- Space complexity\n- I/O bottlenecks\n- Caching opportunities\n- Lazy evaluation possibilities\n\nProvide optimized code with before/after benchmarks.` },
  { name: 'convert', description: 'Convert code between languages/frameworks', category: 'utility', mode: 'execute',
    template: `Convert the following code to the target language/framework while preserving behavior.\n\nSource: {{input}}\n\nRequirements:\n- Idiomatic target language patterns\n- Equivalent error handling\n- Preserve all edge case behavior\n- Add type annotations if target supports them\n- Note any behavior differences between source and target` },
  { name: 'explain', description: 'Explain complex code', category: 'utility', mode: 'standard',
    template: `Explain the following code in detail. Cover what it does, why, and how.\n\nCode: {{input}}\n\nExplain:\n- High-level purpose\n- Step-by-step walkthrough\n- Key algorithms or patterns used\n- Edge cases handled\n- Potential issues or improvements` },
];

export function loadBuiltinTemplates(): PromptTemplate[] {
  return [...BUILTIN_TEMPLATES];
}

export async function loadCustomTemplates(templateDir: string): Promise<PromptTemplate[]> {
  const templates: PromptTemplate[] = [];
  try {
    const entries = await readdir(templateDir);
    for (const entry of entries) {
      if (entry.endsWith('.prompt.md')) {
        const content = await readFile(join(templateDir, entry), 'utf-8');
        const parsed = parseTemplateFile(content, basename(entry, '.prompt.md'));
        if (parsed) templates.push(parsed);
      }
    }
  } catch {
    // dir not found
  }
  return templates;
}

function parseTemplateFile(content: string, fallbackName: string): PromptTemplate | null {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) {
    return {
      name: fallbackName,
      description: '',
      category: 'custom',
      mode: 'standard',
      template: content.trim(),
    };
  }
  const yaml = fmMatch[1];
  const body = fmMatch[2].trim();
  const name = yamlVal(yaml, 'name') || fallbackName;
  const description = yamlVal(yaml, 'description') || '';
  const category = yamlVal(yaml, 'category') || 'custom';
  const mode = (yamlVal(yaml, 'mode') || 'standard') as PromptMode;
  return { name, description, category, mode, template: body };
}

function yamlVal(yaml: string, key: string): string | null {
  const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

export function applyTemplate(template: PromptTemplate, input: string): string {
  return template.template.replace(/\{\{input\}\}/g, input);
}

export function listTemplates(templates: PromptTemplate[]): string {
  const grouped: Record<string, PromptTemplate[]> = {};
  for (const t of templates) {
    (grouped[t.category] ??= []).push(t);
  }
  const lines: string[] = [];
  for (const [category, temps] of Object.entries(grouped).sort()) {
    lines.push(`\n${category.toUpperCase()}`);
    for (const t of temps) {
      lines.push(`  ${t.name.padEnd(24)} ${t.description}  [${t.mode}]`);
    }
  }
  return lines.join('\n');
}
