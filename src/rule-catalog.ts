export type RuleCategory =
  | 'authorization'
  | 'identity'
  | 'routing'
  | 'api-access'
  | 'event-delivery'
  | 'runtime-behaviour'
  | 'project-discovery'
  | 'configuration-lifecycle';

export type RiskLevel = 'low' | 'medium' | 'high';

export type RuleMetadata = {
  ruleId: string;
  category: RuleCategory;
  field: string;
  explanation: string;
  documentationUrl: string;
  redaction?: string;
  riskLevel?: RiskLevel;
  riskRationale?: string;
};

const APP_CONFIGURATION = 'https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration';
const APP_CONFIG_FILES = 'https://shopify.dev/docs/apps/build/cli-for-apps/manage-app-config-files';
const APP_PROXIES = 'https://shopify.dev/docs/apps/build/online-store/app-proxies';
const RULES: RuleMetadata[] = [
  { ruleId: 'SCOPE_REQUIRED_ADDED', category: 'authorization', field: 'access_scopes.scopes', explanation: 'A required access scope was added.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'SCOPE_REQUIRED_REMOVED', category: 'authorization', field: 'access_scopes.scopes', explanation: 'A required access scope was removed.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'SCOPE_OPTIONAL_ADDED', category: 'authorization', field: 'access_scopes.optional_scopes', explanation: 'An optional access scope was added.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'SCOPE_OPTIONAL_REMOVED', category: 'authorization', field: 'access_scopes.optional_scopes', explanation: 'An optional access scope was removed.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'SCOPE_OPTIONAL_TO_REQUIRED', category: 'authorization', field: 'access_scopes', explanation: 'An optional scope became required.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'SCOPE_REQUIRED_TO_OPTIONAL', category: 'authorization', field: 'access_scopes', explanation: 'A required scope became optional.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'CLIENT_ID_ADDED', category: 'identity', field: 'client_id', explanation: 'The app client ID was added.', documentationUrl: APP_CONFIGURATION, redaction: 'The client ID is never included in findings.' },
  { ruleId: 'CLIENT_ID_REMOVED', category: 'identity', field: 'client_id', explanation: 'The app client ID was removed.', documentationUrl: APP_CONFIGURATION, redaction: 'The client ID is never included in findings.' },
  { ruleId: 'CLIENT_ID_CHANGED', category: 'identity', field: 'client_id', explanation: 'The app client ID changed.', documentationUrl: APP_CONFIGURATION, redaction: 'The client ID is never included in findings.' },
  { ruleId: 'APPLICATION_URL_CHANGED', category: 'routing', field: 'application_url', explanation: 'The app application URL changed.', documentationUrl: APP_CONFIGURATION, redaction: 'URL values are never included in findings.' },
  { ruleId: 'AUTH_REDIRECT_URLS_CHANGED', category: 'routing', field: 'auth.redirect_urls', explanation: 'The OAuth redirect URL set changed.', documentationUrl: APP_CONFIGURATION, redaction: 'URL values are never included in findings.' },
  { ruleId: 'EMBEDDED_MODE_CHANGED', category: 'runtime-behaviour', field: 'embedded', explanation: 'The embedded app mode changed.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'APP_HANDLE_CHANGED', category: 'identity', field: 'handle', explanation: 'The app handle changed.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'APP_NAME_CHANGED', category: 'identity', field: 'name', explanation: 'The app name changed.', documentationUrl: APP_CONFIGURATION, redaction: 'Name values are not included in findings.' },
  { ruleId: 'LEGACY_INSTALL_FLOW_CHANGED', category: 'authorization', field: 'access_scopes.use_legacy_install_flow', explanation: 'The legacy installation flow setting changed.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'ADMIN_DIRECT_API_ACCESS_CHANGED', category: 'api-access', field: 'access.admin.embedded_app_direct_api_access', explanation: 'Admin Direct API access was enabled or disabled.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'ADMIN_DIRECT_API_MODE_CHANGED', category: 'api-access', field: 'access.admin.direct_api_mode', explanation: 'Admin Direct API online/offline mode changed.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'CUSTOMER_AUTH_REDIRECTS_CHANGED', category: 'authorization', field: 'customer_authentication.redirect_uris', explanation: 'Customer account authentication redirect URIs changed.', documentationUrl: APP_CONFIGURATION, redaction: 'URL values are never included in findings.' },
  { ruleId: 'CUSTOMER_AUTH_ORIGINS_CHANGED', category: 'authorization', field: 'customer_authentication.javascript_origins', explanation: 'Customer account authentication JavaScript origins changed.', documentationUrl: APP_CONFIGURATION, redaction: 'Origin values are never included in findings.' },
  { ruleId: 'CUSTOMER_AUTH_LOGOUT_URLS_CHANGED', category: 'authorization', field: 'customer_authentication.logout_urls', explanation: 'Customer account authentication logout URLs changed.', documentationUrl: APP_CONFIGURATION, redaction: 'URL values are never included in findings.' },
  { ruleId: 'APP_PROXY_ENABLED', category: 'routing', field: 'app_proxy', explanation: 'An app proxy was enabled.', documentationUrl: APP_PROXIES, redaction: 'Proxy destinations are never included in findings.' },
  { ruleId: 'APP_PROXY_DISABLED', category: 'routing', field: 'app_proxy', explanation: 'An app proxy was disabled.', documentationUrl: APP_PROXIES, redaction: 'Proxy destinations are never included in findings.' },
  { ruleId: 'APP_PROXY_DESTINATION_CHANGED', category: 'routing', field: 'app_proxy.url', explanation: 'The app proxy destination changed.', documentationUrl: APP_PROXIES, redaction: 'URL values are never included in findings.' },
  { ruleId: 'APP_PROXY_ROUTE_CHANGED', category: 'routing', field: 'app_proxy.prefix/subpath', explanation: 'The app proxy storefront route changed.', documentationUrl: APP_PROXIES },
  { ruleId: 'POS_EMBEDDED_MODE_CHANGED', category: 'runtime-behaviour', field: 'pos.embedded', explanation: 'Shopify POS embedded mode changed.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'APP_PREFERENCES_URL_CHANGED', category: 'routing', field: 'app_preferences.url', explanation: 'The app preferences URL changed.', documentationUrl: APP_CONFIGURATION, redaction: 'URL values are never included in findings.' },
  { ruleId: 'EXTENSION_DIRECTORIES_CHANGED', category: 'project-discovery', field: 'extension_directories', explanation: 'The extension discovery directory set changed.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'WEB_DIRECTORIES_CHANGED', category: 'project-discovery', field: 'web_directories', explanation: 'The web discovery directory set changed.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'AUTOMATIC_DEV_URLS_CHANGED', category: 'runtime-behaviour', field: 'build.automatically_update_urls_on_dev', explanation: 'Automatic development URL updates changed.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'WEBHOOK_API_VERSION_CHANGED', category: 'event-delivery', field: 'webhooks.api_version', explanation: 'The webhook API version changed.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'WEBHOOK_SUBSCRIPTIONS_CHANGED', category: 'event-delivery', field: 'webhooks.subscriptions', explanation: 'Webhook routes or delivery settings changed.', documentationUrl: APP_CONFIGURATION, redaction: 'Destinations, topics, filters, and field names are never included in findings.' },
  { ruleId: 'EVENTS_API_VERSION_CHANGED', category: 'event-delivery', field: 'events.api_version', explanation: 'The Events API version changed.', documentationUrl: APP_CONFIGURATION },
  { ruleId: 'EVENTS_SUBSCRIPTIONS_CHANGED', category: 'event-delivery', field: 'events.subscription', explanation: 'Events subscriptions changed.', documentationUrl: APP_CONFIGURATION, redaction: 'Handles, destinations, topics, triggers, queries, and filters are never included in findings.' },
  { ruleId: 'CONFIG_ADDED', category: 'configuration-lifecycle', field: 'configuration', explanation: 'A named Shopify app configuration file was added.', documentationUrl: APP_CONFIG_FILES },
  { ruleId: 'CONFIG_REMOVED', category: 'configuration-lifecycle', field: 'configuration', explanation: 'A named Shopify app configuration file was removed.', documentationUrl: APP_CONFIG_FILES },
  { ruleId: 'CONFIG_RENAMED', category: 'configuration-lifecycle', field: 'configuration', explanation: 'A named Shopify app configuration file was renamed.', documentationUrl: APP_CONFIG_FILES },
];

const RULES_BY_ID = new Map(RULES.map((rule) => [rule.ruleId, rule]));

const RISK_BY_CATEGORY: Record<RuleCategory, { level: RiskLevel; rationale: string }> = {
  authorization: { level: 'high', rationale: 'Can change merchant consent, access, or authentication behaviour.' },
  identity: { level: 'high', rationale: 'Can change the app or environment a deployment targets.' },
  routing: { level: 'high', rationale: 'Can redirect app, OAuth, proxy, or merchant-facing traffic.' },
  'api-access': { level: 'high', rationale: 'Can change how the app obtains or uses Admin API access.' },
  'event-delivery': { level: 'high', rationale: 'Can change event coverage, payload compatibility, or delivery destinations.' },
  'runtime-behaviour': { level: 'medium', rationale: 'Can change runtime or installation behaviour without directly changing permissions.' },
  'project-discovery': { level: 'low', rationale: 'Changes which local project paths Shopify CLI discovers.' },
  'configuration-lifecycle': { level: 'high', rationale: 'Can change which environment configuration is selected for deployment.' },
};

function withRisk(rule: Omit<RuleMetadata, 'riskLevel' | 'riskRationale'>): RuleMetadata {
  const risk = RISK_BY_CATEGORY[rule.category];
  return { ...rule, riskLevel: risk.level, riskRationale: risk.rationale };
}

export function metadataFor(ruleId: string, field: string): RuleMetadata {
  const rule = RULES_BY_ID.get(ruleId);
  if (rule) return rule;
  const category = categoryFor(field);
  return withRisk({
    ruleId,
    category,
    field,
    explanation: 'An internal or otherwise unknown Shopify app configuration value changed.',
    documentationUrl: APP_CONFIGURATION,
  });
}

function categoryFor(field: string): RuleCategory {
  if (field.startsWith('access_scopes') || field.startsWith('customer_authentication')) return 'authorization';
  if (field.includes('client_id') || field === 'name' || field === 'handle') return 'identity';
  if (field.includes('url') || field.includes('proxy') || field.includes('redirect')) return 'routing';
  if (field.startsWith('access.admin')) return 'api-access';
  if (field.startsWith('webhooks') || field.startsWith('events')) return 'event-delivery';
  if (field.startsWith('extension_directories') || field.startsWith('web_directories')) return 'project-discovery';
  if (field.startsWith('configuration')) return 'configuration-lifecycle';
  return 'runtime-behaviour';
}

export function ruleCatalogue(): RuleMetadata[] {
  return RULES.map((rule) => ({ ...rule }));
}

// Category-level heuristics keep risk deterministic and explainable. Risk is a
// review-prioritisation signal, not Shopify schema validation or a security verdict.
for (let index = 0; index < RULES.length; index++) {
  const rule = RULES[index];
  if (rule) {
    const enriched = withRisk(rule);
    RULES[index] = enriched;
    RULES_BY_ID.set(enriched.ruleId, enriched);
  }
}
