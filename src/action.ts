import * as core from '@actions/core';
import { renderSummary } from './summary.js';
import { reviewPullRequest } from './pr-review.js';

async function main(): Promise<void> {
  const report = reviewPullRequest(
    core.getInput('base_sha', { required: true }),
    core.getInput('head_sha', { required: true }),
  );
  const allFindings = report.files.flatMap((file) => file.findings);
  const policy = core.getInput('fail_on') || 'unreviewed';
  if (!['never', 'review', 'unreviewed'].includes(policy)) {
    throw new Error('fail_on must be one of: never, review, unreviewed');
  }
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
  core.setOutput('report', JSON.stringify(report));
  await core.summary.addRaw(renderSummary(report)).write();
  if (policy !== 'never' && report.unreviewed.length > 0) {
    throw new Error('Review incomplete: one or more configurations could not be analyzed.');
  }
  if (policy === 'review' && allFindings.length > 0) throw new Error('Review findings detected.');
}

try {
  await main();
} catch (error: unknown) {
  core.setFailed(error instanceof Error ? error.message : 'Unexpected failure.');
}
