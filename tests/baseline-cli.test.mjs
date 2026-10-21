import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const oldConfig = '[access_scopes]\nscopes = "read_orders"\n';
const reviewedConfig = '[access_scopes]\nscopes = "read_orders,read_products"\n';
const extendedConfig = '[access_scopes]\nscopes = "read_orders,read_products,read_customers"\n';

function run(args, cwd) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
}

test('CLI creates and checks a baseline with new, existing, and resolved counts', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'changeguard-baseline-cli-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const before = join(dir, 'before.toml');
  const after = join(dir, 'after.toml');
  const extended = join(dir, 'extended.toml');
  writeFileSync(before, oldConfig);
  writeFileSync(after, reviewedConfig);
  writeFileSync(extended, extendedConfig);
  const baselinePath = 'review-baseline.json';
  const create = run(['baseline', 'create', '--baseline', baselinePath, '--before', before, '--after', after, '--config-path', 'shopify.app.toml'], dir);
  assert.equal(create.status, 0, create.stderr);
  assert.match(create.stdout, /Baseline created with 1 finding/);
  const baselineText = readFileSync(join(dir, baselinePath), 'utf8');
  assert.doesNotMatch(baselineText, /read_products|read_orders/);
  assert.doesNotMatch(baselineText, new RegExp(dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const existing = run(['baseline', 'check', '--baseline', baselinePath, '--before', before, '--after', after, '--config-path', 'shopify.app.toml', '--fail-on-new', '--json'], dir);
  assert.equal(existing.status, 0, existing.stderr);
  const existingReport = JSON.parse(existing.stdout);
  assert.deepEqual(existingReport.lifecycle, { newCount: 0, existingCount: 1, resolvedCount: 0 });
  assert.equal(existingReport.findings[0].lifecycle, 'EXISTING');
  const repeated = run(['baseline', 'check', '--baseline', baselinePath, '--before', before, '--after', after, '--config-path', 'shopify.app.toml', '--fail-on-new', '--json'], dir);
  assert.equal(repeated.stdout, existing.stdout);

  const added = run(['--baseline', baselinePath, '--before', before, '--after', extended, '--config-path', 'shopify.app.toml', '--fail-on-new', '--format', 'markdown'], dir);
  assert.equal(added.status, 1);
  assert.match(added.stdout, /New: 1; existing: 1; resolved: 0/);
  assert.match(added.stdout, /NEW/);

  const resolved = run(['--baseline', baselinePath, '--before', before, '--after', before, '--config-path', 'shopify.app.toml', '--fail-on-new', '--json'], dir);
  assert.equal(resolved.status, 0, resolved.stderr);
  const resolvedReport = JSON.parse(resolved.stdout);
  assert.deepEqual(resolvedReport.lifecycle, { newCount: 0, existingCount: 0, resolvedCount: 1 });
  assert.equal(resolvedReport.resolvedFindings[0].lifecycle, 'RESOLVED');
  assert.equal(resolvedReport.resolvedFindings[0].path, 'shopify.app.toml');
});

test('existing high-risk findings remain visible and the risk threshold remains independent', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'changeguard-baseline-risk-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const before = join(dir, 'before.toml');
  const after = join(dir, 'after.toml');
  writeFileSync(before, oldConfig);
  writeFileSync(after, reviewedConfig);
  const create = run(['baseline', 'create', '--baseline', 'baseline.json', '--before', before, '--after', after, '--config-path', 'shopify.app.toml'], dir);
  assert.equal(create.status, 0, create.stderr);
  const checked = run(['--baseline', 'baseline.json', '--before', before, '--after', after, '--config-path', 'shopify.app.toml', '--fail-on-new', '--fail-on-risk', 'high', '--json'], dir);
  assert.equal(checked.status, 1);
  const report = JSON.parse(checked.stdout);
  assert.equal(report.lifecycle.existingCount, 1);
  assert.equal(report.findings[0].lifecycle, 'EXISTING');
  assert.equal(report.findings[0].riskLevel, 'high');
});

test('baseline checks fail closed for absent or unsupported files and invalid options', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'changeguard-baseline-invalid-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'before.toml'), oldConfig);
  writeFileSync(join(dir, 'after.toml'), reviewedConfig);
  const common = ['--before', 'before.toml', '--after', 'after.toml', '--config-path', 'shopify.app.toml'];
  assert.equal(run(['--baseline', 'missing.json', ...common], dir).status, 2);
  writeFileSync(join(dir, 'bad.json'), '{broken');
  assert.equal(run(['--baseline', 'bad.json', ...common], dir).status, 2);
  writeFileSync(join(dir, 'v2.json'), JSON.stringify({ schemaVersion: 2, comparisonKind: 'git-all', findings: [] }));
  assert.equal(run(['--baseline', 'v2.json', ...common], dir).status, 2);
  assert.equal(run([...common, '--fail-on-new', '--fail-on-risk', 'critical'], dir).status, 2);
  assert.equal(run(['baseline', 'create', '--baseline', 'created.json', '--before', 'before.toml', '--after', 'after.toml', '--config-path', '../outside.toml'], dir).status, 2);
});

test('Git baseline treats file renames as a new path identity and records resolved findings', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'changeguard-baseline-git-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  const commit = (message) => {
    git('add', '-A');
    git('commit', '-q', '-m', message);
    return git('rev-parse', 'HEAD');
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'ChangeGuard Tests');
  git('config', 'user.email', 'tests@example.invalid');
  writeFileSync(join(dir, 'shopify.app.toml'), oldConfig);
  const base = commit('base');
  writeFileSync(join(dir, 'shopify.app.toml'), reviewedConfig);
  const reviewed = commit('add a finding');
  const create = run(['baseline', 'create', '--baseline', 'baseline.json', '--base-ref', base, '--head-ref', reviewed, '--all-configs'], dir);
  assert.equal(create.status, 0, create.stderr);

  git('mv', 'shopify.app.toml', 'shopify.app.staging.toml');
  const renamed = commit('rename configuration');
  const checkRename = run(['baseline', 'check', '--baseline', 'baseline.json', '--base-ref', reviewed, '--head-ref', renamed, '--all-configs', '--json'], dir);
  assert.equal(checkRename.status, 0, checkRename.stderr);
  const renameReport = JSON.parse(checkRename.stdout);
  assert.deepEqual(renameReport.lifecycle, { newCount: 1, existingCount: 0, resolvedCount: 1 });
  assert.equal(renameReport.files[0].findings[0].ruleId, 'CONFIG_RENAMED');
  assert.equal(renameReport.files[0].findings[0].lifecycle, 'NEW');
  assert.equal(renameReport.resolvedFindings[0].path, 'shopify.app.toml');

  git('rm', 'shopify.app.staging.toml');
  const deleted = commit('delete configuration');
  const checkDelete = run(['baseline', 'check', '--baseline', 'baseline.json', '--base-ref', renamed, '--head-ref', deleted, '--all-configs', '--json'], dir);
  assert.equal(checkDelete.status, 0, checkDelete.stderr);
  const deleteReport = JSON.parse(checkDelete.stdout);
  assert.equal(deleteReport.files[0].findings[0].ruleId, 'CONFIG_REMOVED');
  assert.equal(deleteReport.files[0].findings[0].lifecycle, 'NEW');
  assert.equal(deleteReport.lifecycle.newCount, 1);
});

test('Git baseline supports added configurations and multiple named app files', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'changeguard-baseline-added-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  const commit = (message) => {
    git('add', '-A');
    git('commit', '-q', '-m', message);
    return git('rev-parse', 'HEAD');
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'ChangeGuard Tests');
  git('config', 'user.email', 'tests@example.invalid');
  writeFileSync(join(dir, 'README.md'), 'Synthetic app fixture\n');
  const base = commit('empty base');
  writeFileSync(join(dir, 'shopify.app.toml'), oldConfig);
  const first = commit('add default app configuration');
  const create = run(['baseline', 'create', '--baseline', 'baseline.json', '--base-ref', base, '--head-ref', first, '--all-configs'], dir);
  assert.equal(create.status, 0, create.stderr);
  writeFileSync(join(dir, 'shopify.app.production.toml'), '[access_scopes]\nscopes = "read_orders,read_products"\n');
  const second = commit('add production configuration');
  const checked = run(['baseline', 'check', '--baseline', 'baseline.json', '--base-ref', first, '--head-ref', second, '--all-configs', '--json'], dir);
  assert.equal(checked.status, 0, checked.stderr);
  const report = JSON.parse(checked.stdout);
  assert.deepEqual(report.lifecycle, { newCount: 1, existingCount: 0, resolvedCount: 1 });
  assert.deepEqual(report.files.map((file) => file.path), ['shopify.app.production.toml']);
  assert.equal(report.files[0].findings[0].ruleId, 'CONFIG_ADDED');
});
