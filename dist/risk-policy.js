const rank = { low: 1, medium: 2, high: 3 };
export function validateRiskThreshold(value) {
    if (!['none', 'low', 'medium', 'high'].includes(value))
        throw new Error('fail_on_risk must be one of: none, low, medium, high');
}
export function matchesRiskThreshold(findings, threshold) {
    if (threshold === 'none')
        return false;
    return findings.some((finding) => rank[finding.riskLevel ?? 'medium'] >= rank[threshold]);
}
