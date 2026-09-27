import { spawnSync } from 'node:child_process';
import { compareConfigs, type Finding } from './core.js';
import { readConfigAtRef } from './git-refs.js';

export type ReviewFile = { path: string; findings: Finding[] };
export type ReviewReport = {
  schemaVersion: 1;
  note: string;
  files: ReviewFile[];
  unreviewed: Array<{ path: string; reason: string }>;
};

const validSha = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const configFile = /(^|\/)shopify\.app(?:\.[^/]+)?\.toml$/;

function gitDiff(ancestor: string, head: string): string[] {
  const result = spawnSync('git', [
    'diff', '--no-renames', '--name-status', '-z', ancestor, head, '--',
  ], { encoding: 'buffer', maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error('Unable to inspect the Git changes.');
  const parts = result.stdout.toString('utf8').split('\0');
  if (parts.at(-1) === '') parts.pop();
  if (parts.length % 2 !== 0) throw new Error('Unexpected Git diff output.');
  return parts;
}

export function reviewPullRequest(base: string, head: string): ReviewReport {
  if (!validSha.test(base) || !validSha.test(head)) {
    throw new Error('Valid base and head commit SHAs are required.');
  }
  const ancestorResult = spawnSync('git', ['merge-base', base, head], {
    encoding: 'utf8', maxBuffer: 4096,
  });
  const ancestor = ancestorResult.stdout?.trim() ?? '';
  if (ancestorResult.error || ancestorResult.status !== 0 || !validSha.test(ancestor)) {
    throw new Error('Unable to determine the common Git ancestor.');
  }

  const parts = gitDiff(ancestor, head);
  const changed: Array<{ status: string; path: string }> = [];
  for (let i = 0; i < parts.length; i += 2) {
    const status = parts[i];
    const path = parts[i + 1];
    if (typeof status !== 'string' || typeof path !== 'string') {
      throw new Error('Unexpected Git diff output.');
    }
    if (configFile.test(path)) changed.push({ status, path });
  }
  if (changed.length > 50) throw new Error('Too many configuration changes for this review.');

  const files: ReviewFile[] = [];
  const unreviewed: ReviewReport['unreviewed'] = [];
  for (const { status, path } of changed) {
    if (status !== 'M') {
      unreviewed.push({ path, reason: 'Added, deleted or otherwise unsupported change.' });
      continue;
    }
    try {
      files.push({
        path,
        findings: compareConfigs(readConfigAtRef(ancestor, path), readConfigAtRef(head, path)),
      });
    } catch {
      unreviewed.push({ path, reason: 'Configuration could not be analyzed.' });
    }
  }
  return {
    schemaVersion: 1,
    note: 'Review only; not deployment approval.',
    files,
    unreviewed,
  };
}
