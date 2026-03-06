export interface OrchestrationStep {
  plugin: string;
  input: string;
}

export function buildOrchestrationChain(chain: string[], executeOutput: string): OrchestrationStep[] {
  return chain.map(plugin => ({
    plugin,
    input: executeOutput,
  }));
}

export function validateFileReferences(output: string): string[] {
  // Extract file paths from backtick-quoted references
  const backtickRefs = output.match(/`([^`]*\.[a-zA-Z]{1,5})`/g) || [];
  const paths = backtickRefs.map(ref => ref.replace(/`/g, ''));

  // Also match bare file paths
  const bareRefs = output.match(/\b(?:src|lib|tests?|app|packages?)\/[\w/.-]+\.\w{1,5}\b/g) || [];

  const all = new Set([...paths, ...bareRefs]);
  return [...all];
}
