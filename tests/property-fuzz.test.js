import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { compareConfigs } from '../dist/core.js';

const characters = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'];
const atom = fc.array(fc.constantFrom(...characters), { minLength: 1, maxLength: 20 })
  .map((value) => value.join(''));
const config = (extra = {}) => ({ access_scopes: { scopes: 'read_products' }, ...extra });
const propertyOptions = { seed: 20261023, numRuns: 100, endOnFailure: true };

test('webhook grouping and ordering do not create findings or expose delivery values', () => {
  fc.assert(fc.property(
    fc.array(atom, { minLength: 1, maxLength: 8 }),
    fc.array(atom, { maxLength: 8 }),
    atom,
    (topics, fields, destination) => {
      const before = config({ webhooks: { subscriptions: [{
        topics,
        uri: `https://hooks.example.test/${destination}`,
        include_fields: fields,
      }] } });
      const after = config({ webhooks: { subscriptions: [...topics].reverse().map((topic) => ({
        topics: [topic, topic],
        uri: `https://hooks.example.test/${destination}`,
        include_fields: [...fields].reverse(),
      })) } });
      const findings = compareConfigs(before, after);
      assert.deepEqual(findings, []);
      assert.deepEqual(findings, compareConfigs(before, after));
      assert.equal(JSON.stringify(findings).includes(destination), false);
    },
  ), propertyOptions);
});

test('webhook delivery changes stay redacted for bounded adversarial values', () => {
  fc.assert(fc.property(atom, (value) => {
    const oldDestination = `https://hooks.example.test/old-${value}?token=old-${value}`;
    const newDestination = `https://hooks.example.test/new-${value}?token=new-${value}`;
    const before = config({ webhooks: { subscriptions: [{ topics: ['orders/create'], uri: oldDestination }] } });
    const after = config({ webhooks: { subscriptions: [{ topics: ['orders/create'], uri: newDestination }] } });
    const findings = compareConfigs(before, after);
    const output = JSON.stringify(findings);
    assert.equal(findings.filter((finding) => finding.ruleId === 'WEBHOOK_SUBSCRIPTIONS_CHANGED').length, 1);
    assert.match(findings[0].summary, /modified: 1/);
    assert.equal(output.includes(oldDestination), false);
    assert.equal(output.includes(newDestination), false);
  }), propertyOptions);
});

test('GraphQL fragments with formatting-only changes remain equivalent', () => {
  const fieldName = atom.map((value) => `field_${value}`);
  fc.assert(fc.property(fc.array(fieldName, { minLength: 1, maxLength: 12 }), (fields) => {
    const compact = `query Events { product { ...SelectedFields } } fragment SelectedFields on Product { ${fields.join(' ')} }`;
    const formatted = `# formatting comment\nquery Events { product { ...SelectedFields } }\nfragment SelectedFields on Product {\n  ${fields.join(',\n  ')}\n}`;
    const eventConfig = (query) => config({ events: {
      api_version: '2026-10',
      subscription: [{ handle: 'generated', topic: 'Product', actions: ['create'], uri: '/events', query }],
    } });
    assert.deepEqual(compareConfigs(eventConfig(compact), eventConfig(formatted)), []);
  }), propertyOptions);
});
