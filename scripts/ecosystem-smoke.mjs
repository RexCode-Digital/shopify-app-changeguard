import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const changeguardRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoriesRoot = resolve(process.env.REXCODE_OSS_REPOS_DIR || dirname(changeguardRoot));
const roots = {
  changeguard: changeguardRoot,
  upgrade: join(repositoriesRoot, 'shopify-upgrade-guard'),
  scope: join(repositoriesRoot, 'shopify-scope-guard'),
  appReview: join(repositoriesRoot, 'shopify-app-review-guard'),
};
const fixtureSource = join(changeguardRoot, 'ecosystem-fixtures');
const workspace = mkdtempSync(join(tmpdir(), 'rexcode-ecosystem-smoke-'));
const appRoot = join(workspace, 'consumer-app');

function runNode(root, script, args, { expectedStatus = 0 } = {}) {
  const result = spawnSync(process.execPath, [join(root, script), ...args], {
    cwd: appRoot,
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, CI: '1' },
  });
  if (result.error) throw result.error;
  assert.equal(result.status, expectedStatus, `${script} exited ${result.status}:\n${result.stderr}\n${result.stdout}`);
  return result.stdout;
}

function commit(message) {
  execFileSync('git', ['add', '-A'], { cwd: appRoot, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', message], { cwd: appRoot, stdio: 'ignore' });
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: appRoot, encoding: 'utf8' }).trim();
}

try {
  mkdirSync(appRoot);
  for (const entry of readdirSync(fixtureSource)) cpSync(join(fixtureSource, entry), join(appRoot, entry), { recursive: true });
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: appRoot });
  execFileSync('git', ['config', 'user.name', 'RexCode ecosystem fixture'], { cwd: appRoot });
  execFileSync('git', ['config', 'user.email', 'ecosystem@example.invalid'], { cwd: appRoot });
  const base = commit('synthetic app baseline');

  const configPath = join(appRoot, 'shopify.app.toml');
  let appConfig = readFileSync(configPath, 'utf8').replace('scopes = ""', 'scopes = "read_orders"');
  writeFileSync(configPath, appConfig);
  const reviewed = commit('introduce a reviewed scope configuration change');

  runNode(roots.changeguard, 'dist/cli.js', [
    'baseline', 'create', '--baseline', '.changeguard-baseline.json',
    '--base-ref', base, '--head-ref', reviewed, '--all-configs',
  ]);

  appConfig = appConfig.replace('api_version = "2026-10"', 'api_version = "2026-10"\napplication_url = "https://shop.example.test"');
  writeFileSync(configPath, appConfig);
  const head = commit('introduce a separate application URL change');

  const ordinary = JSON.parse(runNode(roots.changeguard, 'dist/cli.js', [
    '--base-ref', base, '--head-ref', head, '--all-configs', '--json',
  ]));
  assert.ok(ordinary.files.some((file) => file.findings.length > 0), 'ChangeGuard should review the changed app configuration');

  const lifecycle = JSON.parse(runNode(roots.changeguard, 'dist/cli.js', [
    'baseline', 'check', '--baseline', '.changeguard-baseline.json',
    '--base-ref', base, '--head-ref', head, '--all-configs', '--fail-on-new', '--json',
  ], { expectedStatus: 1 }));
  assert.ok(lifecycle.lifecycle.existingCount > 0, 'ChangeGuard should retain the reviewed finding');
  assert.ok(lifecycle.lifecycle.newCount > 0, 'ChangeGuard should identify the new finding');

  const upgrade = JSON.parse(runNode(roots.upgrade, 'src/cli.js', [
    'scan', '--target', '2027-01', '--format', 'json', '--fail-on', 'never', '--path', appRoot,
  ]));
  assert.ok(upgrade.findings.some((finding) => finding.ruleId === 'UG-EXT-001' && finding.severity === 'error'), 'Upgrade Guard should report the 2027-01 owner_type blocker');

  const scope = JSON.parse(runNode(roots.scope, 'src/cli/index.js', [
    'audit', '--path', appRoot, '--api-version', '2026-10', '--format', 'json', '--fail-on', 'none',
  ]));
  assert.equal(scope.summary.classicWebhooks.notEvidenced, 1, 'Scope Guard should report missing product read scope evidence');
  assert.ok(scope.findings.some((finding) => finding.ruleId === 'SG-SCOPE-001'), 'Scope Guard should emit the mapped webhook scope finding');

  const review = JSON.parse(runNode(roots.appReview, 'src/cli.js', [
    'check', '--path', appRoot, '--format', 'json', '--fail-on', 'none',
  ]));
  assert.ok(review.findings.some((finding) => finding.ruleId === 'AR-WEBHOOK-001'
    && finding.status === 'NEEDS_REVIEW'
    && finding.file === 'app/api/webhooks/products/route.ts'), 'App Review Guard should flag the matched Next.js route for review');

  console.log('Four-tool local integration smoke test passed.');
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
