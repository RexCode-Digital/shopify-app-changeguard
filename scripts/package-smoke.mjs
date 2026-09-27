import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspace = mkdtempSync(join(tmpdir(), 'changeguard-package-smoke-'));

function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8', stdio: 'pipe', ...options });
}

try {
  const packDir = join(workspace, 'pack');
  const installDir = join(workspace, 'install');
  mkdirSync(packDir);
  mkdirSync(installDir);
  run('npm', ['pack', '--pack-destination', packDir]);
  const tarball = join(packDir, readdirSync(packDir).find((file) => file.endsWith('.tgz')));
  run('npm', ['init', '-y'], { cwd: installDir });
  run('npm', ['install', '--ignore-scripts', tarball], { cwd: installDir });
  const cli = join(installDir, 'node_modules', '.bin', 'changeguard');
  run(cli, ['--help']);
  const version = run(cli, ['--version']).trim();
  const expected = JSON.parse(run('node', ['-e', "console.log(JSON.stringify(require('./package.json').version))"])).trim();
  if (version !== expected.replaceAll('"', '')) throw new Error(`Version mismatch: ${version} != ${expected}`);

  const before = resolve('examples/before.toml');
  const after = resolve('examples/after.toml');
  const json = JSON.parse(run(cli, ['--before', before, '--after', after, '--json']));
  if (!json.findings.length) throw new Error('Direct package comparison produced no findings.');
  const fail = spawnSync(cli, ['--before', before, '--after', after, '--fail-on', 'review'], { cwd: root, encoding: 'utf8' });
  if (fail.status !== 1) throw new Error(`Expected --fail-on review to exit 1, got ${fail.status}`);

  const gitDir = join(workspace, 'git-fixture');
  mkdirSync(gitDir);
  const git = (...args) => run('git', ['-C', gitDir, ...args]).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'ChangeGuard package smoke');
  git('config', 'user.email', 'tests@example.invalid');
  writeFileSync(join(gitDir, 'shopify.app.toml'), '[access_scopes]\nscopes = "read_orders"\n');
  git('add', '.');
  git('commit', '-q', '-m', 'base');
  const base = git('rev-parse', 'HEAD');
  writeFileSync(join(gitDir, 'shopify.app.toml'), '[access_scopes]\nscopes = "read_orders,read_products"\n');
  git('add', '.');
  git('commit', '-q', '-m', 'head');
  const head = git('rev-parse', 'HEAD');
  const gitResult = JSON.parse(run(cli, ['--base-ref', base, '--head-ref', head, '--file', 'shopify.app.toml', '--json'], { cwd: gitDir }));
  if (!gitResult.findings.length) throw new Error('Git package comparison produced no findings.');
  console.log('Package smoke test passed.');
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
