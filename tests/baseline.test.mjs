import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from '@iarna/toml';
import { compareConfigs } from '../dist/core.js';
import {
  classifyFindings,
  createBaseline,
  findingFingerprint,
  normaliseRepositoryPath,
  readBaseline,
  validateBaseline,
  writeBaseline,
} from '../dist/baseline.js';

const before = { access_scopes: { scopes: 'read_orders' } };
const after = { access_scopes: { scopes: 'read_orders,read_products' } };
const finding = compareConfigs(before, after)[0];

test('fingerprints are stable, path-sensitive, and expose no summary values', () => {
  assert.equal(findingFingerprint(finding, './shopify.app.toml'), findingFingerprint(finding, 'shopify.app.toml'));
  assert.notEqual(findingFingerprint(finding, 'shopify.app.toml'), findingFingerprint(finding, 'shopify.app.staging.toml'));
  const privateFinding = { ...finding, summary: 'Client ID changed; review the app identity configuration' };
  const baseline = createBaseline('configuration-pair', [{ path: 'shopify.app.toml', finding: privateFinding }]);
  const serialised = JSON.stringify(baseline);
  assert.doesNotMatch(serialised, /Client ID changed/);
  assert.doesNotMatch(serialised, /read_products/);
  assert.match(baseline.findings[0].fingerprint, /^[a-f0-9]{64}$/);
});

test('fingerprints remain stable when equivalent TOML fields are reordered', () => {
  const firstBefore = { access_scopes: { scopes: 'read_orders', optional_scopes: ['read_products'] } };
  const firstAfter = { access_scopes: { scopes: 'read_orders,read_products' } };
  const secondBefore = { access_scopes: { optional_scopes: ['read_products'], scopes: 'read_orders' } };
  const secondAfter = { access_scopes: { scopes: 'read_products,read_orders' } };
  const first = compareConfigs(firstBefore, firstAfter);
  const second = compareConfigs(secondBefore, secondAfter);
  assert.deepEqual(first.map((item) => findingFingerprint(item, 'shopify.app.toml')),
    second.map((item) => findingFingerprint(item, 'shopify.app.toml')));
  const formatted = '[access_scopes]\nscopes = "read_orders"\noptional_scopes = ["read_products"]\n';
  const reordered = '[access_scopes]\noptional_scopes=["read_products"]\n\nscopes="read_orders"\n';
  const empty = '[access_scopes]\nscopes = "read_orders"\n';
  const firstParsed = compareConfigs(parse(empty), parse(formatted));
  const secondParsed = compareConfigs(parse(empty), parse(reordered));
  assert.deepEqual(firstParsed.map((item) => findingFingerprint(item, 'shopify.app.toml')),
    secondParsed.map((item) => findingFingerprint(item, 'shopify.app.toml')));
  assert.deepEqual(compareConfigs(parse(formatted), parse(reordered)), []);
});

test('baseline lifecycle distinguishes new, existing, and resolved findings', () => {
  const first = compareConfigs(before, after)[0];
  const second = { ...first, ruleId: 'APP_PROXY_ENABLED', field: 'app_proxy', summary: 'App proxy enabled; review routing behaviour' };
  const baseline = createBaseline('git-all', [
    { path: 'shopify.app.toml', finding: first },
    { path: 'shopify.app.staging.toml', finding: second },
  ]);
  const result = classifyFindings([
    { path: 'shopify.app.toml', finding: first },
    { path: 'shopify.app.toml', finding: second },
  ], baseline, 'git-all');
  assert.deepEqual(result.findings.map((item) => item.lifecycle), ['EXISTING', 'NEW']);
  assert.deepEqual(result.counts, { newCount: 1, existingCount: 1, resolvedCount: 1 });
  assert.equal(result.resolvedFindings[0].path, 'shopify.app.staging.toml');
  assert.equal(result.resolvedFindings[0].lifecycle, 'RESOLVED');
});

test('duplicate findings retain counts without duplicating baseline entries', () => {
  const baseline = createBaseline('git-file', [
    { path: 'shopify.app.toml', finding },
    { path: 'shopify.app.toml', finding },
  ]);
  assert.equal(baseline.findings.length, 1);
  assert.equal(baseline.findings[0].count, 2);
  const result = classifyFindings([{ path: 'shopify.app.toml', finding }], baseline, 'git-file');
  assert.equal(result.counts.existingCount, 1);
  assert.equal(result.counts.resolvedCount, 1);
  assert.equal(result.resolvedFindings[0].count, 1);
});

test('baseline entries use locale-independent path ordering', () => {
  const baseline = createBaseline('git-all', [
    { path: 'a.toml', finding },
    { path: 'Z.toml', finding },
    { path: 'é.toml', finding },
  ]);
  assert.deepEqual(baseline.findings.map((item) => item.path), ['Z.toml', 'a.toml', 'é.toml']);
});

test('baseline version, comparison kind, fields, and fingerprints are validated', () => {
  const baseline = createBaseline('git-all', [{ path: 'shopify.app.toml', finding }]);
  assert.equal(validateBaseline(baseline).schemaVersion, 1);
  assert.throws(() => validateBaseline({ ...baseline, schemaVersion: 2 }), /Unsupported.*schema version/);
  assert.throws(() => validateBaseline({ ...baseline, comparisonKind: 'other' }), /comparisonKind/);
  assert.throws(() => validateBaseline({ ...baseline, findings: [{ ...baseline.findings[0], fingerprint: 'bad' }] }), /fingerprint/);
  assert.throws(() => classifyFindings([], baseline, 'configuration-pair'), /does not match/);
  assert.throws(() => normaliseRepositoryPath('../private.toml'), /traverse/);
  assert.throws(() => normaliseRepositoryPath('/private/shopify.app.toml'), /repository-relative/);
});

test('baseline reads and writes are bounded, relative, and do not overwrite', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'changeguard-baseline-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const baseline = createBaseline('configuration-pair', [{ path: 'shopify.app.toml', finding }]);
  assert.equal(await writeBaseline('baseline.json', baseline, dir), 'baseline.json');
  assert.deepEqual(await readBaseline('baseline.json', dir), baseline);
  await assert.rejects(writeBaseline('baseline.json', baseline, dir), /Unable to create baseline/);
  await assert.rejects(readBaseline('../baseline.json', dir), /traverse/);
  const malformed = join(dir, 'malformed.json');
  writeFileSync(malformed, '{bad json');
  await assert.rejects(readBaseline('malformed.json', dir), /not valid JSON/);
  const unknown = join(dir, 'unknown.json');
  writeFileSync(unknown, JSON.stringify({ ...baseline, schemaVersion: 99 }));
  await assert.rejects(readBaseline('unknown.json', dir), /Unsupported.*schema version/);
  const link = join(dir, 'linked.json');
  try {
    symlinkSync(malformed, link);
  } catch (error) {
    if (error.code === 'EPERM') return t.skip('Symlink privileges unavailable');
    throw error;
  }
  await assert.rejects(readBaseline('linked.json', dir), /regular file/);
  assert.match(readFileSync(join(dir, 'baseline.json'), 'utf8'), /"comparisonKind": "configuration-pair"/);
});
