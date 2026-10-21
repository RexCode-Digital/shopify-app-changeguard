import * as core from '@actions/core';
import { renderSummary } from './summary.js';
import { reviewPullRequest } from './pr-review.js';
import { matchesRiskThreshold, validateRiskThreshold } from './risk-policy.js';
import { classifyFindings, readBaseline } from './baseline.js';

async function main(): Promise<void> {
  const originalReport = reviewPullRequest(
    core.getInput('base_sha', { required: true }),
    core.getInput('head_sha', { required: true }),
  );
  const baselinePath = core.getInput('baseline_path');
  const failOnNewValue = core.getInput('fail_on_new').toLowerCase();
  if (failOnNewValue !== '' && failOnNewValue !== 'true' && failOnNewValue !== 'false') {
    throw new Error('fail_on_new must be true or false');
  }
  const failOnNew = failOnNewValue === 'true';
  const baseline = baselinePath ? await readBaseline(baselinePath) : undefined;
  const lifecycle = baselinePath || failOnNew
    ? classifyFindings(originalReport.files.flatMap((file) => file.findings.map((finding) => ({ path: file.path, finding }))), baseline, 'git-all')
    : undefined;
  let findingIndex = 0;
  const report = lifecycle
    ? {
      ...originalReport,
      files: originalReport.files.map((file) => ({ ...file, findings: file.findings.map(() => lifecycle.findings[findingIndex++]!) })),
      lifecycle: lifecycle.counts,
      resolvedFindings: lifecycle.resolvedFindings,
    }
    : originalReport;
  const allFindings = report.files.flatMap((file) => file.findings);
  const policy = core.getInput('fail_on') || 'unreviewed';
  if (!['never', 'review', 'unreviewed'].includes(policy)) {
    throw new Error('fail_on must be one of: never, review, unreviewed');
  }
  const failOnRisk = core.getInput('fail_on_risk') || 'none';
  validateRiskThreshold(failOnRisk);
  const outcome = report.unreviewed.length > 0
    ? 'incomplete' : allFindings.length > 0 ? 'findings' : 'clean';
  // Do not print untrusted TOML-derived text to stdout: GitHub interprets
  // workflow command-looking lines in action output. Consumers use outputs.
  process.stdout.write('ChangeGuard review completed.\n');
  core.setOutput('outcome', outcome);
  core.setOutput('finding_count', String(allFindings.length));
  core.setOutput('reviewed_file_count', String(report.reviewedFileCount));
  core.setOutput('unreviewed_count', String(report.unreviewedFileCount));
  core.setOutput('rule_ids', report.ruleIds.join(','));
  core.setOutput('highest_severity', allFindings.length ? 'review' : 'none');
  const riskRank = { low: 1, medium: 2, high: 3 } as const;
  const highestRisk = allFindings.reduce<'none' | 'low' | 'medium' | 'high'>((highest, finding) => {
    const risk = finding.riskLevel ?? 'medium';
    return riskRank[risk] > (highest === 'none' ? 0 : riskRank[highest]) ? risk : highest;
  }, 'none');
  core.setOutput('highest_risk', highestRisk);
  core.setOutput('risk_threshold_exceeded', String(matchesRiskThreshold(allFindings, failOnRisk)));
  core.setOutput('new_finding_count', lifecycle ? String(lifecycle.counts.newCount) : '');
  core.setOutput('existing_finding_count', lifecycle ? String(lifecycle.counts.existingCount) : '');
  core.setOutput('resolved_finding_count', lifecycle ? String(lifecycle.counts.resolvedCount) : '');
  core.setOutput('report', JSON.stringify(report));
  await core.summary.addRaw(renderSummary(report)).write();
  for (const reviewed of report.files) for (const finding of reviewed.findings) {
    core.warning(`${finding.ruleId}: ${finding.summary}`, { file: reviewed.path, title: `${finding.ruleId} (${finding.riskLevel ?? 'medium'} risk)` });
  }
  if ((policy !== 'never' || failOnNew) && report.unreviewed.length > 0) {
    throw new Error('Review incomplete: one or more configurations could not be analyzed.');
  }
  if (policy === 'review' && allFindings.length > 0) throw new Error('Review findings detected.');
  if (matchesRiskThreshold(allFindings, failOnRisk)) throw new Error(`Review findings meet the ${failOnRisk} risk threshold.`);
  if (failOnNew && (lifecycle?.counts.newCount ?? 0) > 0) throw new Error('New review findings detected.');
}

try {
  await main();
} catch (error: unknown) {
  core.setFailed(error instanceof Error ? error.message : 'Unexpected failure.');
}
