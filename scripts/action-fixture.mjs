import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const action = join(root, 'dist', 'action', 'index.js');
const work = mkdtempSync(join(tmpdir(), 'changeguard-action-fixture-'));

function git(cwd, args) {
  return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
}

function commitConfig(cwd, content, message) {
  writeFileSync(join(cwd, 'shopify.app.toml'), content);
  execFileSync('git', ['add', 'shopify.app.toml'], { cwd, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', message], { cwd, stdio: 'ignore' });
  return git(cwd, ['rev-parse', 'HEAD']);
}

function runAction(cwd, baseSha, headSha, failOn, name) {
  const output = join(cwd, `${name}.output`);
  const summary = join(cwd, `${name}.summary`);
  writeFileSync(output, '');
  writeFileSync(summary, '');
  return spawnSync(process.execPath, [action], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_ACTIONS: 'true',
      GITHUB_OUTPUT: output,
      GITHUB_STEP_SUMMARY: summary,
      INPUT_BASE_SHA: baseSha,
      INPUT_HEAD_SHA: headSha,
      INPUT_FAIL_ON: failOn,
    },
  });
}

try {
  const repo = join(work, 'fixture');
  mkdirSync(repo);
  git(repo, ['init']);
  git(repo, ['config', 'user.email', 'changeguard-fixture@example.invalid']);
  git(repo, ['config', 'user.name', 'ChangeGuard fixture']);
  const base = commitConfig(repo, '[access_scopes]\nscopes = "read_orders"\n', 'base');

  const cleanHead = base;
  const clean = runAction(repo, base, cleanHead, 'unreviewed', 'clean');
  if (clean.status !== 0) throw new Error(`clean fixture failed: ${clean.stderr}`);

  const findingHead = commitConfig(repo, '[access_scopes]\nscopes = "read_orders,read_products"\n', 'finding');
  const finding = runAction(repo, cleanHead, findingHead, 'never', 'finding');
  if (finding.status !== 0 || !readFileSync(join(repo, 'finding.output'), 'utf8').includes('finding_count')) {
    throw new Error(`finding fixture failed: ${finding.stderr}`);
  }

  const malformedHead = commitConfig(repo, '[access_scopes\nscopes = "malformed"\n', 'malformed');
  const malformed = runAction(repo, findingHead, malformedHead, 'unreviewed', 'malformed');
  if (malformed.status === 0) throw new Error('malformed fixture unexpectedly succeeded');

  console.log('Cross-platform Action fixture passed: clean, finding, and malformed cases.');
} finally {
  rmSync(work, { recursive: true, force: true });
}
