import { spawnSync } from 'node:child_process';
import { compareConfigs, type Finding } from './core.js';
import { readConfigAtRef } from './git-refs.js';
import { metadataFor } from './rule-catalog.js';

export type ReviewFile = { path: string; previousPath?: string; status: 'M' | 'A' | 'D' | 'R'; findings: Finding[] };
export type ReviewReport = {
  schemaVersion: 1;
  note: string;
  files: ReviewFile[];
  unreviewed: Array<{ path: string; reason: string }>;
  changedFileCount: number;
  reviewedFileCount: number;
  unreviewedFileCount: number;
  ruleIds: string[];
};

const validSha = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
export const configFile = /(^|\/)shopify\.app(?:\.[^/]+)?\.toml$/;

type Change = { status: 'M' | 'A' | 'D' | 'R'; path: string; previousPath?: string };

function gitDiff(ancestor: string, head: string): Change[] {
  const result = spawnSync('git', ['diff', '--find-renames=20%', '--name-status', '-z', ancestor, head, '--'], { encoding: 'buffer', maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error('Unable to inspect the Git changes.');
  const parts = result.stdout.toString('utf8').split('\0');
  if (parts.at(-1) === '') parts.pop();
  const changes: Change[] = [];
  for (let i = 0; i < parts.length;) {
    const token = parts[i++];
    if (!token) continue;
    const status = token[0];
    if (!status) throw new Error('Unexpected Git diff status.');
    if (status === 'R' || status === 'C') {
      const previousPath = parts[i++];
      const path = parts[i++];
      if (!previousPath || !path) throw new Error('Unexpected Git rename output.');
      changes.push({ status: 'R', previousPath, path });
    } else {
      const path = parts[i++];
      if (!path || !['M', 'A', 'D'].includes(status)) throw new Error('Unexpected Git diff output.');
      changes.push({ status: status as 'M' | 'A' | 'D', path });
    }
  }
  return changes;
}

function commonAncestor(base: string, head: string): string {
  const result = spawnSync('git', ['merge-base', base, head], { encoding: 'utf8', maxBuffer: 4096 });
  const ancestor = result.stdout?.trim() ?? '';
  if (result.error || result.status !== 0 || !validSha.test(ancestor)) throw new Error('Unable to determine the common Git ancestor.');
  return ancestor;
}

function lifecycleFinding(ruleId: string, field: string, summary: string): Finding {
  const metadata = metadataFor(ruleId, field);
  return { ruleId, severity: 'review', field, summary, category: metadata.category, documentationUrl: metadata.documentationUrl, riskLevel: metadata.riskLevel, riskRationale: metadata.riskRationale };
}

export function reviewGitRange(base: string, head: string): ReviewReport {
  if (!validSha.test(base) || !validSha.test(head)) throw new Error('Valid base and head commit SHAs are required.');
  const ancestor = commonAncestor(base, head);
  const changed = gitDiff(ancestor, head).filter((item) => configFile.test(item.path) || (item.previousPath ? configFile.test(item.previousPath) : false));
  if (changed.length > 50) throw new Error('Too many configuration changes for this review.');
  const files: ReviewFile[] = [];
  const unreviewed: ReviewReport['unreviewed'] = [];
  for (const change of changed) {
    try {
      if (change.status === 'M') {
        files.push({ status: 'M', path: change.path, findings: compareConfigs(readConfigAtRef(ancestor, change.path), readConfigAtRef(head, change.path)) });
      } else if (change.status === 'A') {
        readConfigAtRef(head, change.path);
        files.push({ status: 'A', path: change.path, findings: [lifecycleFinding('CONFIG_ADDED', 'configuration', 'Shopify app configuration file added; review the new environment and its deployment selection')] });
      } else if (change.status === 'D') {
        files.push({ status: 'D', path: change.path, findings: [lifecycleFinding('CONFIG_REMOVED', 'configuration', 'Shopify app configuration file removed; review which environment remains deployable')] });
      } else {
        readConfigAtRef(ancestor, change.previousPath ?? change.path);
        readConfigAtRef(head, change.path);
        files.push({ status: 'R', previousPath: change.previousPath, path: change.path, findings: [lifecycleFinding('CONFIG_RENAMED', 'configuration', 'Shopify app configuration file renamed; review environment selection and deployment workflows'), ...compareConfigs(readConfigAtRef(ancestor, change.previousPath ?? change.path), readConfigAtRef(head, change.path))] });
      }
    } catch {
      unreviewed.push({ path: change.path, reason: 'Configuration could not be analyzed.' });
    }
  }
  const ruleIds = [...new Set(files.flatMap((file) => file.findings.map((finding) => finding.ruleId)))].sort();
  return { schemaVersion: 1, note: 'Review only; not deployment approval.', files, unreviewed, changedFileCount: changed.length, reviewedFileCount: files.length, unreviewedFileCount: unreviewed.length, ruleIds };
}

export function reviewPullRequest(base: string, head: string): ReviewReport {
  return reviewGitRange(base, head);
}
