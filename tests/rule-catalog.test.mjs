import test from 'node:test';
import assert from 'node:assert/strict';
import { metadataFor, ruleCatalogue } from '../dist/rule-catalog.js';

const productionRuleIds = new Set([
  'SCOPE_REQUIRED_ADDED', 'SCOPE_REQUIRED_REMOVED', 'SCOPE_OPTIONAL_ADDED',
  'SCOPE_OPTIONAL_REMOVED', 'SCOPE_OPTIONAL_TO_REQUIRED', 'SCOPE_REQUIRED_TO_OPTIONAL',
  'CLIENT_ID_ADDED', 'CLIENT_ID_REMOVED', 'CLIENT_ID_CHANGED',
  'APPLICATION_URL_CHANGED', 'AUTH_REDIRECT_URLS_CHANGED', 'EMBEDDED_MODE_CHANGED',
  'APP_HANDLE_CHANGED', 'APP_NAME_CHANGED', 'LEGACY_INSTALL_FLOW_CHANGED',
  'ADMIN_DIRECT_API_ACCESS_CHANGED', 'ADMIN_DIRECT_API_MODE_CHANGED',
  'CUSTOMER_AUTH_REDIRECTS_CHANGED', 'CUSTOMER_AUTH_ORIGINS_CHANGED',
  'CUSTOMER_AUTH_LOGOUT_URLS_CHANGED', 'APP_PROXY_ENABLED', 'APP_PROXY_DISABLED',
  'APP_PROXY_DESTINATION_CHANGED', 'APP_PROXY_ROUTE_CHANGED', 'POS_EMBEDDED_MODE_CHANGED',
  'APP_PREFERENCES_URL_CHANGED', 'EXTENSION_DIRECTORIES_CHANGED', 'WEB_DIRECTORIES_CHANGED',
  'AUTOMATIC_DEV_URLS_CHANGED', 'WEBHOOK_API_VERSION_CHANGED',
  'WEBHOOK_SUBSCRIPTIONS_CHANGED', 'EVENTS_API_VERSION_CHANGED',
  'EVENTS_SUBSCRIPTIONS_CHANGED', 'CONFIG_ADDED', 'CONFIG_REMOVED', 'CONFIG_RENAMED',
]);

test('every production rule ID has explicit catalogue metadata', () => {
  const catalogue = ruleCatalogue();
  const catalogueIds = new Set(catalogue.map((rule) => rule.ruleId));
  assert.deepEqual(catalogueIds, productionRuleIds);
  for (const ruleId of productionRuleIds) {
    const metadata = metadataFor(ruleId, 'audited.field');
    assert.equal(metadata.ruleId, ruleId);
    assert.ok(metadata.category);
    assert.ok(metadata.field);
    assert.ok(metadata.explanation);
    assert.match(metadata.riskLevel, /^(low|medium|high)$/);
    assert.ok(metadata.riskRationale);
    assert.match(metadata.documentationUrl, /^https:\/\/shopify\.dev\//);
  }
});

test('catalogue metadata describes redaction for sensitive rule families', () => {
  for (const ruleId of [
    'CLIENT_ID_CHANGED', 'APPLICATION_URL_CHANGED', 'AUTH_REDIRECT_URLS_CHANGED',
    'APP_PROXY_DESTINATION_CHANGED', 'EVENTS_SUBSCRIPTIONS_CHANGED',
    'WEBHOOK_SUBSCRIPTIONS_CHANGED',
  ]) {
    assert.ok(metadataFor(ruleId, 'audited.field').redaction, `${ruleId} should document redaction`);
  }
});

test('unknown internal IDs retain a defensive fallback without entering the catalogue', () => {
  const unknown = metadataFor('INTERNAL_UNKNOWN_RULE', 'runtime.field');
  assert.equal(unknown.ruleId, 'INTERNAL_UNKNOWN_RULE');
  assert.equal(ruleCatalogue().some((rule) => rule.ruleId === unknown.ruleId), false);
});
