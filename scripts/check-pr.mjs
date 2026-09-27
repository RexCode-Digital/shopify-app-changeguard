import { appendFileSync } from 'node:fs';
import { renderSummary } from './summary.mjs';
import { reviewPullRequest } from '../dist/pr-review.js';

function stop(message) {
  console.error(`ChangeGuard: ${message}`);
  process.exit(2);
}

try {
  const report = reviewPullRequest(
    process.env.CHANGEGUARD_BASE_SHA ?? '',
    process.env.CHANGEGUARD_HEAD_SHA ?? '',
  );
  console.log(JSON.stringify(report, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderSummary(report), 'utf8');
    } catch {
      stop('Unable to write GitHub Actions summary.');
    }
  }
  if (report.unreviewed.length > 0) process.exitCode = 2;
} catch (error) {
  stop(error instanceof Error ? error.message : 'Unexpected failure.');
}
