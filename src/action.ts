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
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  core.setOutput('outcome', outcome);
  core.setOutput('finding_count', String(allFindings.length));
  core.setOutput('highest_severity', allFindings.length ? 'review' : 'none');
  core.setOutput('report', JSON.stringify(report));
  await core.summary.addRaw(renderSummary(report)).write();
  if (policy === 'unreviewed' && report.unreviewed.length > 0) {
    throw new Error('Review incomplete: one or more configurations could not be analyzed.');
  }
  if (policy === 'review' && allFindings.length > 0) throw new Error('Review findings detected.');
}

try {
  await main();
} catch (error: unknown) {
  core.setFailed(error instanceof Error ? error.message : 'Unexpected failure.');
}
