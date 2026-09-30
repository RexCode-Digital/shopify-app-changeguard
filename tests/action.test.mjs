import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const action = fileURLToPath(new URL('../dist/action/index.js', import.meta.url));
const oldConfig = '[access_scopes]\nscopes = "read_orders"\n';
const newConfig = '[access_scopes]\nscopes = "read_orders,read_products"\n';

function fixture(config, check) {
  const dir = mkdtempSync(join(tmpdir(), 'changeguard-action-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  try {
    git('init', '-q', '-b', 'main');
    git('config', 'user.name', 'ChangeGuard Tests');
    git('config', 'user.email', 'tests@example.invalid');
    writeFileSync(join(dir, 'shopify.app.toml'), oldConfig);
    git('add', '.');
    git('commit', '-q', '-m', 'base');
    const base = git('rev-parse', 'HEAD');
    writeFileSync(join(dir, 'shopify.app.toml'), config);
    git('add', '.');
    git('commit', '-q', '-m', 'head');
    const head = git('rev-parse', 'HEAD');
    check({ dir, base, head });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function run(dir, base, head, policy) {
  const output = join(dir, 'output.txt');
  const summary = join(dir, 'summary.md');
  writeFileSync(output, '');
  writeFileSync(summary, '');
  return spawnSync(process.execPath, [action], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_ACTIONS: 'true',
      GITHUB_OUTPUT: output,
      GITHUB_STEP_SUMMARY: summary,
      INPUT_BASE_SHA: base,
      INPUT_HEAD_SHA: head,
      INPUT_FAIL_ON: policy,
    },
  });
}

test('bundled Action emits outputs and succeeds for informational findings', () => {
  fixture(newConfig, ({ dir, base, head }) => {
    const result = run(dir, base, head, 'never');
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const outputs = readFileSync(join(dir, 'output.txt'), 'utf8');
    assert.match(outputs, /outcome<<ghadelimiter_/);
    assert.match(outputs, /finding_count<<ghadelimiter_/);
    assert.match(outputs, /highest_severity<<ghadelimiter_/);
    assert.match(outputs, /highest_risk<<ghadelimiter_/);
    assert.match(outputs, /report<<ghadelimiter_/);
    assert.match(outputs, /reviewed_file_count<<ghadelimiter_/);
    assert.match(outputs, /unreviewed_count<<ghadelimiter_/);
    assert.match(outputs, /rule_ids<<ghadelimiter_/);
    assert.match(outputs, /findings/);
    assert.match(readFileSync(join(dir, 'summary.md'), 'utf8'), /Manual review recommended/);
  });
});

test('bundled Action fail_on review fails on findings', () => {
  fixture(newConfig, ({ dir, base, head }) => {
    const result = run(dir, base, head, 'review');
    assert.equal(result.status, 1);
    assert.match(result.stdout + result.stderr, /Review findings detected/);
  });
});

test('bundled Action fail_on unreviewed fails closed for malformed configuration', () => {
  fixture('broken = "unterminated\n', ({ dir, base, head }) => {
    const result = run(dir, base, head, 'unreviewed');
    assert.equal(result.status, 1);
    const outputs = readFileSync(join(dir, 'output.txt'), 'utf8');
    assert.match(outputs, /unreviewed_count<<ghadelimiter_/);
    assert.match(result.stdout + result.stderr, /Review incomplete/);
  });
});
