import type { Finding } from './core.js';

export type RiskThreshold = 'none' | 'low' | 'medium' | 'high';
const rank: Record<Exclude<RiskThreshold, 'none'>, number> = { low: 1, medium: 2, high: 3 };

export function validateRiskThreshold(value: string): asserts value is RiskThreshold {
  if (!['none', 'low', 'medium', 'high'].includes(value)) throw new Error('fail_on_risk must be one of: none, low, medium, high');
}

export function matchesRiskThreshold(findings: Finding[], threshold: RiskThreshold): boolean {
  if (threshold === 'none') return false;
  return findings.some((finding) => rank[finding.riskLevel ?? 'medium'] >= rank[threshold]);
}
