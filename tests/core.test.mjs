import test from 'node:test';
import assert from 'node:assert/strict';
import { compareConfigs } from '../dist/core.js';

const cfg = (scopes, optional_scopes = []) => ({ access_scopes: { scopes, optional_scopes } });

test('reports required scope additions', () => {
  const results = compareConfigs(cfg('read_orders'), cfg('read_orders,read_products'));
  assert.equal(results.length, 1);
  assert.equal(results[0].ruleId, 'SCOPE_REQUIRED_ADDED');
  assert.match(results[0].summary, /read_products/);
});

test('reports high-impact app setting changes without exposing values', () => {
  const before = {
    ...cfg('read_orders'),
    embedded: true,
    handle: 'old-private-handle',
    access_scopes: { scopes: 'read_orders', use_legacy_install_flow: false },
  };
  const after = {
    ...cfg('read_orders'),
    embedded: false,
    handle: 'new-private-handle',
    access_scopes: { scopes: 'read_orders', use_legacy_install_flow: true },
  };
  const findings = compareConfigs(before, after);
  assert.deepEqual(findings.map(({ ruleId }) => ruleId).sort(), [
    'APP_HANDLE_CHANGED',
    'EMBEDDED_MODE_CHANGED',
    'LEGACY_INSTALL_FLOW_CHANGED',
  ]);
  assert.doesNotMatch(JSON.stringify(findings), /old-private-handle|new-private-handle/);
});

test('ignores unchanged high-impact app settings and validates their types', () => {
  const config = {
    ...cfg('read_orders'),
    embedded: true,
    handle: 'same-handle',
    access_scopes: { scopes: 'read_orders', use_legacy_install_flow: false },
  };
  assert.deepEqual(compareConfigs(config, config), []);
  assert.throws(() => compareConfigs(config, { ...config, embedded: 'yes' }), /embedded/);
  assert.throws(() => compareConfigs(config, { ...config, handle: '' }), /handle/);
});

test('ignores comma list reorder and duplicates', () => {
  assert.deepEqual(compareConfigs(cfg('read_orders,read_products'), cfg(' read_products, read_orders,read_orders ')), []);
});

test('reports optional scope removal', () => {
  const results = compareConfigs(cfg('read_orders', ['read_products']), cfg('read_orders'));
  assert.equal(results.length, 1);
  assert.equal(results[0].ruleId, 'SCOPE_OPTIONAL_REMOVED');
});

test('rejects ambiguous scope declarations', () => {
  assert.throws(() => compareConfigs(cfg('read_orders', ['read_orders']), cfg('read_orders')), /both required and optional/);
});

test('does not expose unrelated app configuration fields in findings', () => {
  const oldConfig = { ...cfg('read_orders'), client_secret: 'do-not-print-me' };
  const newConfig = { ...cfg('read_orders'), client_secret: 'another-secret' };
  assert.deepEqual(compareConfigs(oldConfig, newConfig), []);
});

test('reports optional to required as one transition', () => {
  const results = compareConfigs(
    cfg('read_orders', ['read_products']),
    cfg('read_orders,read_products'),
  );

  assert.deepEqual(
    results.map((finding) => finding.ruleId),
    ['SCOPE_OPTIONAL_TO_REQUIRED'],
  );
});

test('reports required to optional as one transition', () => {
  const results = compareConfigs(
    cfg('read_orders,read_products'),
    cfg('read_orders', ['read_products']),
  );

  assert.deepEqual(
    results.map((finding) => finding.ruleId),
    ['SCOPE_REQUIRED_TO_OPTIONAL'],
  );
});

test('keeps genuine additions and removals separate', () => {
  const results = compareConfigs(
    cfg('read_orders,read_products', ['read_customers']),
    cfg('read_orders,read_customers,write_products'),
  );

  assert.deepEqual(
    results.map((finding) => finding.ruleId).sort(),
    [
      'SCOPE_OPTIONAL_TO_REQUIRED',
      'SCOPE_REQUIRED_ADDED',
      'SCOPE_REQUIRED_REMOVED',
    ].sort(),
  );
});
