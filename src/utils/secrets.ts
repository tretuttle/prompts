export interface SecretMatch {
  type: string;
  pattern: string;
  position: number;
}

export interface ScanResult {
  found: boolean;
  matches: SecretMatch[];
}

const DEFAULT_PATTERNS: { type: string; pattern: RegExp }[] = [
  { type: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { type: 'Stripe Live Key', pattern: /sk-live-[a-zA-Z0-9]+/ },
  { type: 'GitHub PAT', pattern: /ghp_[a-zA-Z0-9]{36,}/ },
  { type: 'GitLab PAT', pattern: /glpat-[a-zA-Z0-9-]+/ },
  { type: 'Private Key', pattern: /-----BEGIN\s+(RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY-----/ },
  { type: 'ENV Variable with Secret', pattern: /(?:DATABASE_URL|SECRET_KEY|API_KEY|PRIVATE_KEY|PASSWORD|TOKEN)\s*=\s*\S+/i },
];

export function scanForSecrets(content: string, customPatterns: string[] = []): ScanResult {
  const matches: SecretMatch[] = [];

  for (const { type, pattern } of DEFAULT_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      matches.push({
        type,
        pattern: pattern.source,
        position: match.index ?? 0,
      });
    }
  }

  for (const custom of customPatterns) {
    try {
      const re = new RegExp(custom);
      const match = content.match(re);
      if (match) {
        matches.push({
          type: 'Custom Pattern',
          pattern: custom,
          position: match.index ?? 0,
        });
      }
    } catch {
      // invalid regex, skip
    }
  }

  return { found: matches.length > 0, matches };
}
