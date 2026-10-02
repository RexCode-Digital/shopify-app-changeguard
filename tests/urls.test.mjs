import test from 'node:test';
import assert from 'node:assert/strict';
import { compareConfigs } from '../dist/core.js';

const cfg = (other = {}) => ({ access_scopes: { scopes: 'read_orders' }, ...other });

test('reports application URL changes without exposing values', () => {
  const before = 'https://old.example.test/?token=SECRET_OLD';
  const after = 'https://new.example.test/?token=SECRET_NEW';
  const findings = compareConfigs(cfg({ application_url: before }), cfg({ application_url: after }));
  assert.deepEqual(findings.map((f) => f.ruleId), ['APPLICATION_URL_CHANGED']);
  assert.doesNotMatch(JSON.stringify(findings), /SECRET_OLD|SECRET_NEW|example\.test/);
});

test('reports URL addition and removal without printing URLs', () => {
  const added = compareConfigs(cfg(), cfg({ application_url: 'https://one.example.test/' }));
  const removed = compareConfigs(cfg({ application_url: 'https://one.example.test/' }), cfg());
  assert.equal(added[0].ruleId, 'APPLICATION_URL_CHANGED');
  assert.match(added[0].summary, /added/);
  assert.match(removed[0].summary, /removed/);
});

test('ignores reordered and duplicate redirect URLs', () => {
  const before = cfg({ auth: { redirect_urls: ['https://a.test/callback', 'https://b.test/callback'] } });
  const after = cfg({ auth: { redirect_urls: ['https://b.test/callback', 'https://a.test/callback', 'https://a.test/callback'] } });
  assert.deepEqual(compareConfigs(before, after), []);
});

test('reports redirect set changes without exposing URL values', () => {
  const before = cfg({ auth: { redirect_urls: ['https://old.test/?key=SECRET_OLD'] } });
  const after = cfg({ auth: { redirect_urls: ['https://new.test/?key=SECRET_NEW'] } });
  const findings = compareConfigs(before, after);
  assert.deepEqual(findings.map((f) => f.ruleId), ['AUTH_REDIRECT_URLS_CHANGED']);
  assert.match(findings[0].summary, /added: 1; removed: 1/);
  assert.doesNotMatch(JSON.stringify(findings), /SECRET_OLD|SECRET_NEW|old\.test|new\.test/);
});

test('redacts all supported URL-bearing configuration fields', () => {
  const before = cfg({
    application_url: 'https://old.example.test/app',
    auth: { redirect_urls: ['https://old.example.test/callback'] },
    customer_authentication: {
      redirect_uris: ['https://old.example.test/customer'],
      javascript_origins: ['https://old.example.test'],
      logout_urls: ['https://old.example.test/logout'],
    },
    app_proxy: { url: 'https://old.example.test/proxy', prefix: 'apps', subpath: 'old' },
    app_preferences: { url: 'https://old.example.test/preferences' },
  });
  const after = cfg({
    application_url: 'https://new.example.test/app',
    auth: { redirect_urls: ['https://new.example.test/callback'] },
    customer_authentication: {
      redirect_uris: ['https://new.example.test/customer'],
      javascript_origins: ['https://new.example.test'],
      logout_urls: ['https://new.example.test/logout'],
    },
    app_proxy: { url: 'https://new.example.test/proxy', prefix: 'apps', subpath: 'new' },
    app_preferences: { url: 'https://new.example.test/preferences' },
  });

  const findings = compareConfigs(before, after);
  const output = JSON.stringify(findings);

  assert.ok(findings.length >= 6);
  assert.doesNotMatch(output, /old\.example\.test|new\.example\.test/);
});

test('does not echo a sensitive URL when URL validation fails', () => {
  const secret = 'SYNTHETIC_INVALID_URL_7A4';
  assert.throws(
    () => compareConfigs(cfg(), cfg({ application_url: [secret] })),
    (error) => {
      assert.match(error.message, /application_url/);
      assert.equal(error.message.includes(secret), false);
      return true;
    },
  );
});

test('rejects invalid URL field shapes instead of claiming success', () => {
  assert.throws(() => compareConfigs(cfg(), cfg({ application_url: 123 })), /application_url/);
  assert.throws(() => compareConfigs(cfg(), cfg({ auth: 'invalid' })), /\[auth\]/);
  assert.throws(() => compareConfigs(cfg(), cfg({ auth: { redirect_urls: ['valid', 42] } })), /redirect_urls/);
});

test('continues to report scope transitions alongside URL changes', () => {
  const before = cfg({ application_url: 'https://before.test/' });
  const after = {
    access_scopes: { scopes: 'read_orders,read_products' },
    application_url: 'https://after.test/',
  };
  const findings = compareConfigs(before, after);
  assert.deepEqual(findings.map((f) => f.ruleId).sort(), [
    'APPLICATION_URL_CHANGED', 'SCOPE_REQUIRED_ADDED',
  ].sort());
});
