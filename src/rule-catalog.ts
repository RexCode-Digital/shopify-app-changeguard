export type RuleCategory =
  | 'authorization'
  | 'identity'
  | 'routing'
  | 'api-access'
  | 'event-delivery'
  | 'runtime-behaviour'
  | 'project-discovery'
  | 'configuration-lifecycle';

export type RuleMetadata = {
  ruleId: string;
  category: RuleCategory;
  field: string;
  explanation: string;
  documentationUrl?: string;
};

const APP_CONFIGURATION = 'https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration';
const RULES = new Map<string, RuleMetadata>([
  ['SCOPE_REQUIRED_ADDED', { ruleId: 'SCOPE_REQUIRED_ADDED', category: 'authorization', field: 'access_scopes.scopes', explanation: 'A required access scope was added.', documentationUrl: APP_CONFIGURATION }],
  ['SCOPE_REQUIRED_REMOVED', { ruleId: 'SCOPE_REQUIRED_REMOVED', category: 'authorization', field: 'access_scopes.scopes', explanation: 'A required access scope was removed.', documentationUrl: APP_CONFIGURATION }],
  ['SCOPE_OPTIONAL_ADDED', { ruleId: 'SCOPE_OPTIONAL_ADDED', category: 'authorization', field: 'access_scopes.optional_scopes', explanation: 'An optional access scope was added.', documentationUrl: APP_CONFIGURATION }],
  ['SCOPE_OPTIONAL_REMOVED', { ruleId: 'SCOPE_OPTIONAL_REMOVED', category: 'authorization', field: 'access_scopes.optional_scopes', explanation: 'An optional access scope was removed.', documentationUrl: APP_CONFIGURATION }],
  ['SCOPE_OPTIONAL_TO_REQUIRED', { ruleId: 'SCOPE_OPTIONAL_TO_REQUIRED', category: 'authorization', field: 'access_scopes', explanation: 'An optional scope became required.', documentationUrl: APP_CONFIGURATION }],
  ['SCOPE_REQUIRED_TO_OPTIONAL', { ruleId: 'SCOPE_REQUIRED_TO_OPTIONAL', category: 'authorization', field: 'access_scopes', explanation: 'A required scope became optional.', documentationUrl: APP_CONFIGURATION }],
]);

export function metadataFor(ruleId: string, field: string): RuleMetadata {
  return RULES.get(ruleId) ?? {
    ruleId,
    category: categoryFor(field),
    field,
    explanation: 'A supported Shopify app configuration value changed.',
    documentationUrl: APP_CONFIGURATION,
  };
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
  return [...RULES.values()];
}
