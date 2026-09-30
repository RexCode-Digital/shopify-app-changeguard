import test from 'node:test';
import assert from 'node:assert/strict';
import { compareConfigs } from '../dist/core.js';

const cfg = (scopes, optional_scopes = []) => ({ access_scopes: { scopes, optional_scopes } });

test('reports required scope additions', () => {
  const results = compareConfigs(cfg('read_orders'), cfg('read_orders,read_products'));
  assert.equal(results.length, 1);
  assert.equal(results[0].ruleId, 'SCOPE_REQUIRED_ADDED');
  assert.match(results[0].summary, /read_products/);
  assert.equal(results[0].riskLevel, 'high');
  assert.match(results[0].riskRationale, /consent|access|authentication/);
});

test('assigns lower risk to project discovery changes', () => {
  const results = compareConfigs(
    { ...cfg('read_orders'), extension_directories: ['extensions'] },
    { ...cfg('read_orders'), extension_directories: ['extensions', 'more'] },
  );
  assert.equal(results[0].riskLevel, 'low');
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

test('reviews high-value app configuration sections without exposing URLs', () => {
  const before = {
    ...cfg('read_orders'),
    name: 'Old private name',
    access: { admin: { embedded_app_direct_api_access: false, direct_api_mode: 'online' } },
    customer_authentication: {
      redirect_uris: ['https://old.example/callback'],
      javascript_origins: ['https://old.example'],
      logout_urls: ['https://old.example/logout'],
    },
    app_proxy: { url: 'https://old.example/proxy', prefix: 'apps', subpath: 'old' },
    pos: { embedded: false },
    app_preferences: { url: 'https://old.example/preferences' },
    extension_directories: ['extensions'],
  };
  const after = {
    ...cfg('read_orders'),
    name: 'New private name',
    access: { admin: { embedded_app_direct_api_access: true, direct_api_mode: 'offline' } },
    customer_authentication: {
      redirect_uris: ['https://new.example/callback'],
      javascript_origins: ['https://new.example'],
      logout_urls: ['https://new.example/logout'],
    },
    app_proxy: { url: 'https://new.example/proxy', prefix: 'apps', subpath: 'new' },
    pos: { embedded: true },
    app_preferences: { url: 'https://new.example/preferences' },
    extension_directories: ['extensions', 'more-extensions'],
  };
  const findings = compareConfigs(before, after);
  assert.deepEqual(findings.map(({ ruleId }) => ruleId).sort(), [
    'ADMIN_DIRECT_API_ACCESS_CHANGED',
    'ADMIN_DIRECT_API_MODE_CHANGED',
    'APP_NAME_CHANGED',
    'APP_PREFERENCES_URL_CHANGED',
    'APP_PROXY_DESTINATION_CHANGED',
    'APP_PROXY_ROUTE_CHANGED',
    'CUSTOMER_AUTH_LOGOUT_URLS_CHANGED',
    'CUSTOMER_AUTH_ORIGINS_CHANGED',
    'CUSTOMER_AUTH_REDIRECTS_CHANGED',
    'EXTENSION_DIRECTORIES_CHANGED',
    'POS_EMBEDDED_MODE_CHANGED',
  ].sort());
  assert.doesNotMatch(JSON.stringify(findings), /old\.example|new\.example/);
  assert.equal(findings.find((finding) => finding.ruleId === 'APP_NAME_CHANGED')?.category, 'identity');
});

test('ignores ordering-only discovery and customer authentication changes', () => {
  const before = {
    ...cfg('read_orders'),
    customer_authentication: { redirect_uris: ['a', 'b'], javascript_origins: ['x', 'y'], logout_urls: ['z'] },
    extension_directories: ['one', 'two'],
  };
  const after = {
    ...cfg('read_orders'),
    customer_authentication: { redirect_uris: ['b', 'a'], javascript_origins: ['y', 'x'], logout_urls: ['z', 'z'] },
    extension_directories: ['two', 'one', 'one'],
  };
  assert.deepEqual(compareConfigs(before, after), []);
});

test('validates direct API and supported collection shapes', () => {
  assert.throws(() => compareConfigs(cfg('read_orders'), { ...cfg('read_orders'), access: { admin: { direct_api_mode: 'invalid' } } }), /direct_api_mode/);
  assert.throws(() => compareConfigs(cfg('read_orders'), { ...cfg('read_orders'), extension_directories: [''] }), /extension_directories/);
  assert.throws(() => compareConfigs(cfg('read_orders'), { ...cfg('read_orders'), customer_authentication: { logout_urls: 'not-an-array' } }), /logout_urls/);
});
