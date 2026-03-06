import { describe, it, expect } from 'vitest';
import { scanForSecrets } from '../../src/utils/secrets';

describe('Secret Scanner', () => {
  it('should detect AWS access keys', () => {
    const result = scanForSecrets('My key is AKIAIOSFODNN7EXAMPLE');
    expect(result.found).toBe(true);
    expect(result.matches.some(m => m.type === 'AWS Access Key')).toBe(true);
  });

  it('should detect Stripe live keys', () => {
    const result = scanForSecrets('sk-live-abc123def456');
    expect(result.found).toBe(true);
  });

  it('should detect GitHub PATs', () => {
    const result = scanForSecrets('ghp_abcdef1234567890abcdef1234567890abcd');
    expect(result.found).toBe(true);
  });

  it('should detect GitLab PATs', () => {
    const result = scanForSecrets('glpat-abc123def456');
    expect(result.found).toBe(true);
  });

  it('should detect private key blocks', () => {
    const result = scanForSecrets('-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----');
    expect(result.found).toBe(true);
  });

  it('should detect .env patterns', () => {
    const result = scanForSecrets('DATABASE_URL=postgres://user:password@host/db');
    expect(result.found).toBe(true);
  });

  it('should accept custom patterns', () => {
    const result = scanForSecrets('PRIVATE_TOKEN = "abc"', ["PRIVATE_TOKEN\\s*=\\s*['\"]"]);
    expect(result.found).toBe(true);
  });

  it('should pass clean content', () => {
    const result = scanForSecrets('This is a normal prompt about building an API');
    expect(result.found).toBe(false);
  });
});
