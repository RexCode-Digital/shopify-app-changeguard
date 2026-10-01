import test from 'node:test';
import assert from 'node:assert/strict';
import { compareConfigs } from '../dist/core.js';

const cfg = (events) => ({
  access_scopes: { scopes: 'read_products' },
  ...(events === undefined ? {} : { events: { api_version: 'unstable', ...events } }),
});
const subscription = (handle, overrides = {}) => ({
  handle,
  topic: 'Product',
  actions: ['update'],
  triggers: ['product.title'],
  uri: '/events/products',
  ...overrides,
});

test('reports Events API version changes without printing values', () => {
  const before = cfg({ api_version: 'unstable', subscription: [] });
  const after = cfg({ api_version: '2026-07', subscription: [] });
  const findings = compareConfigs(before, after);
  assert.deepEqual(findings.map((finding) => finding.ruleId), ['EVENTS_API_VERSION_CHANGED']);
  assert.doesNotMatch(JSON.stringify(findings), /unstable|2026-07/);
});

test('reports Events subscription additions and removals without leaking values', () => {
  const secret = 'SYNTHETIC_EVENTS_SECRET_6F2';
  const before = cfg({ api_version: 'unstable', subscription: [] });
  const after = cfg({ api_version: 'unstable', subscription: [subscription(secret, { uri: `https://events.test/${secret}` })] });
  const findings = compareConfigs(before, after);
  assert.match(findings[0].summary, /added: 1; removed: 0; modified: 0/);
  assert.doesNotMatch(JSON.stringify(findings), /SYNTHETIC_EVENTS_SECRET|events\.test/);
  assert.match(compareConfigs(after, before)[0].summary, /added: 0; removed: 1; modified: 0/);
});

test('reports subscription modifications without leaking destinations or queries', () => {
  const before = cfg({ subscription: [subscription('product-events', { query: 'query old_secret { product { id } }' })] });
  const after = cfg({ subscription: [subscription('product-events', { actions: ['create'], uri: 'https://new-secret.test/events', query_filter: 'status:ACTIVE' })] });
  const findings = compareConfigs(before, after);
  assert.deepEqual(findings.map((finding) => finding.ruleId), ['EVENTS_SUBSCRIPTIONS_CHANGED']);
  assert.match(findings[0].summary, /added: 0; removed: 0; modified: 1/);
  assert.doesNotMatch(JSON.stringify(findings), /old_secret|new-secret|status:ACTIVE/);
});

test('redacts every synthetic Events delivery detail in a modification', () => {
  const before = cfg({
    subscription: [
      subscription('SYNTHETIC_EVENTS_OLD_11A', {
        actions: ['update'],
        triggers: ['product.title'],
        uri: 'https://old-events.example/SYNTHETIC_URI_22B',
        query: 'query SYNTHETIC_QUERY_OLD { product { id } }',
        query_filter: 'SYNTHETIC_FILTER_OLD_33C',
      }),
    ],
  });
  const after = cfg({
    subscription: [
      subscription('SYNTHETIC_EVENTS_NEW_44D', {
        actions: ['create'],
        triggers: ['product.status'],
        uri: 'https://new-events.example/SYNTHETIC_URI_55E',
        query: 'query SYNTHETIC_QUERY_NEW { product { title } }',
        query_filter: 'SYNTHETIC_FILTER_NEW_66F',
      }),
    ],
  });

  const findings = compareConfigs(before, after);
  const output = JSON.stringify(findings);

  assert.deepEqual(findings.map(({ ruleId }) => ruleId), ['EVENTS_SUBSCRIPTIONS_CHANGED']);
  assert.match(findings[0].summary, /added: 1; removed: 1; modified: 0/);
  assert.doesNotMatch(output, /SYNTHETIC_EVENTS|SYNTHETIC_URI|SYNTHETIC_QUERY|SYNTHETIC_FILTER|old-events|new-events/);
});

test('ignores subscription order and action/trigger order', () => {
  const before = cfg({ api_version: 'unstable', subscription: [
    subscription('product-events', { actions: ['update', 'create'], triggers: ['product.title', 'product.status'] }),
    subscription('other-events', { actions: ['delete'], triggers: undefined }),
  ] });
  const after = cfg({ api_version: 'unstable', subscription: [
    subscription('other-events', { actions: ['delete'], triggers: undefined }),
    subscription('product-events', { actions: ['create', 'update'], triggers: ['product.status', 'product.title'] }),
  ] });
  assert.deepEqual(compareConfigs(before, after), []);
});

test('rejects malformed Events structures on either side', () => {
  const valid = cfg({ subscription: [subscription('product-events')] });
  const malformed = cfg({ subscription: [{ ...subscription('product-events'), actions: ['update'], triggers: undefined }] });
  assert.throws(() => compareConfigs(valid, malformed), /triggers/);
  assert.throws(() => compareConfigs(valid, { ...cfg(), events: { subscription: [subscription('missing-version')] } }), /api_version is required/);
  assert.throws(() => compareConfigs(cfg({ subscription: [subscription('product-events'), subscription('product-events')] }), valid), /unique/);
  assert.throws(() => compareConfigs(valid, cfg({ subscription: [{ ...subscription('bad handle') }] })), /handle/);
});

test('combines Events findings with other supported rules without exposing secrets', () => {
  const before = {
    ...cfg({ api_version: 'unstable', subscription: [subscription('old-events', { uri: '/old-secret' })] }),
    application_url: 'https://old.test/?token=OLD_SECRET',
  };
  const after = {
    ...cfg({ api_version: '2026-07', subscription: [subscription('new-events', { uri: '/new-secret' })] }),
    application_url: 'https://new.test/?token=NEW_SECRET',
    access_scopes: { scopes: 'read_products,write_products' },
  };
  const findings = compareConfigs(before, after);
  assert.deepEqual(findings.map((finding) => finding.ruleId).sort(), [
    'APPLICATION_URL_CHANGED',
    'EVENTS_API_VERSION_CHANGED',
    'EVENTS_SUBSCRIPTIONS_CHANGED',
    'SCOPE_REQUIRED_ADDED',
  ].sort());
  assert.doesNotMatch(JSON.stringify(findings), /OLD_SECRET|NEW_SECRET|old-secret|new-secret|old\.test|new\.test/);
});
