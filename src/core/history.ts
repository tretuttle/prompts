import { readFile, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import type { HistoryEntry, PromptMode, IntentType } from './types.js';

interface AddEntryInput {
  input: string;
  output: string;
  mode: PromptMode;
  target_model: string;
  intent: IntentType | null;
  template: string | null;
  retrospective: boolean;
  plan: boolean;
  metadata: Record<string, unknown>;
}

export class PromptHistory {
  private filePath: string;
  private limit: number;

  constructor(filePath: string, limit: number) {
    this.filePath = filePath;
    this.limit = limit;
  }

  private async load(): Promise<HistoryEntry[]> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      return JSON.parse(raw) as HistoryEntry[];
    } catch {
      return [];
    }
  }

  private async save(entries: HistoryEntry[]): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(entries, null, 2), 'utf-8');
  }

  async list(): Promise<HistoryEntry[]> {
    return this.load();
  }

  async listRetrospectives(): Promise<HistoryEntry[]> {
    const all = await this.load();
    return all.filter(e => e.retrospective);
  }

  async listPlans(): Promise<HistoryEntry[]> {
    const all = await this.load();
    return all.filter(e => e.plan);
  }

  async add(input: AddEntryInput): Promise<HistoryEntry> {
    const entries = await this.load();
    const entry: HistoryEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      ...input,
    };
    entries.push(entry);
    // Enforce limit: keep most recent
    while (entries.length > this.limit) {
      entries.shift();
    }
    await this.save(entries);
    return entry;
  }

  async getByIndex(index: number): Promise<HistoryEntry | null> {
    const entries = await this.load();
    return entries[index] ?? null;
  }

  async findDuplicate(input: string, threshold: number): Promise<HistoryEntry | null> {
    const entries = await this.load();
    let bestMatch: HistoryEntry | null = null;
    let bestScore = 0;

    for (const entry of entries) {
      const score = computeSimilarity(input, entry.input);
      if (score >= threshold && score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }
    return bestMatch;
  }

  async clear(): Promise<void> {
    await this.save([]);
  }
}

// ── Similarity Scoring ──
// Normalized word-level edit distance (1 - editDistance/maxLen)

export function computeSimilarity(a: string, b: string): number {
  const wordsA = a.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const wordsB = b.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);

  if (wordsA.length === 0 && wordsB.length === 0) return 1;
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  // Word-level Levenshtein distance
  const m = wordsA.length;
  const n = wordsB.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (wordsA[i - 1] === wordsB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  const maxLen = Math.max(m, n);
  return 1 - dp[m][n] / maxLen;
}
