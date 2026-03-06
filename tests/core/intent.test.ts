import { describe, it, expect } from 'vitest';
import { classifyIntent, detectAutoMode, computeComplexity } from '../../src/core/intent';

describe('Intent Detection', () => {
  describe('classifyIntent', () => {
    it('should classify implementation requests as technical', () => {
      expect(classifyIntent('Add rate limiting to my Express API')).toBe('technical');
    });

    it('should classify comparison/exploration as analytical', () => {
      expect(classifyIntent('Compare Redux vs Zustand for large React apps')).toBe('analytical');
    });

    it('should classify writing requests as creative', () => {
      expect(classifyIntent('Write a blog post about AI trends in 2025')).toBe('creative');
    });

    it('should classify how-to requests as instructional', () => {
      expect(classifyIntent('How do I set up ESLint with TypeScript')).toBe('instructional');
    });
  });

  describe('detectAutoMode', () => {
    it('should detect research intent', () => {
      expect(detectAutoMode("What's the best way to handle auth in this stack")).toBe('research');
    });

    it('should detect execute intent', () => {
      expect(detectAutoMode('Add rate limiting to this endpoint')).toBe('execute');
    });

    it('should detect plan intent for multi-step tasks', () => {
      expect(detectAutoMode('Build a notification system with email, SMS, and push channels')).toBe('plan');
    });

    it('should default to standard for ambiguous input', () => {
      expect(detectAutoMode('Write a function that parses CSV files')).toBe('standard');
    });
  });

  describe('computeComplexity', () => {
    it('should return low complexity for trivial inputs', () => {
      expect(computeComplexity('yes')).toBeLessThan(0.3);
      expect(computeComplexity('list files')).toBeLessThan(0.3);
      expect(computeComplexity('ok')).toBeLessThan(0.3);
    });

    it('should return high complexity for substantial prompts', () => {
      expect(computeComplexity('Refactor the authentication module to use JWT tokens with refresh token rotation and session management')).toBeGreaterThan(0.3);
    });
  });
});
