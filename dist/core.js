import { compareClientIds } from './client-id.js';
import { compareUrls } from './urls.js';
import { compareWebhooks } from './webhooks.js';
import { compareEvents } from './events.js';
import { metadataFor } from './rule-catalog.js';
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function readScopes(config) {
    if (!isObject(config.access_scopes))
        throw new Error('Missing or invalid [access_scopes] table');
    const section = config.access_scopes;
    if (typeof section.scopes !== 'string')
        throw new Error('[access_scopes].scopes must be a comma-separated string');
    const optional = section.optional_scopes ?? [];
    if (!Array.isArray(optional) || !optional.every((s) => typeof s === 'string' && s.trim()))
        throw new Error('[access_scopes].optional_scopes must be an array of non-empty strings');
    const required = new Set(section.scopes.split(',').map((s) => s.trim()).filter(Boolean));
    const optionalSet = new Set(optional.map((s) => s.trim()));
    const overlap = [...required].filter((scope) => optionalSet.has(scope));
    if (overlap.length > 0)
        throw new Error('Scope cannot be both required and optional: ' + overlap.sort().join(', '));
    return { required, optional: optionalSet };
}
function readOptionalBoolean(config, field) {
    const value = config[field];
    if (value !== undefined && typeof value !== 'boolean')
        throw new Error(`${field} must be a boolean`);
    return value;
}
function readOptionalString(config, field) {
    const value = config[field];
    if (value !== undefined && (typeof value !== 'string' || !value.trim()))
        throw new Error(`${field} must be a non-empty string`);
    return value;
}
function readTable(config, field) {
    const value = config[field];
    if (value === undefined)
        return {};
    if (!isObject(value))
        throw new Error(`[${field}] must be a table`);
    return value;
}
function readStringSet(config, field) {
    const value = config[field];
    if (value === undefined)
        return new Set();
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && item.trim()))
        throw new Error(`${field} must be an array of non-empty strings`);
    return new Set(value.map((item) => item.trim()));
}
function changedSetFinding(ruleId, field, label, before, after) {
    const added = [...after].filter((item) => !before.has(item)).length;
    const removed = [...before].filter((item) => !after.has(item)).length;
    if (!added && !removed)
        return [];
    return [{ ruleId, severity: 'review', field, summary: `${label} changed (added: ${added}; removed: ${removed}); review the affected Shopify behaviour` }];
}
function compareRootSettings(before, after) {
    const findings = [];
    const settings = [['embedded', 'EMBEDDED_MODE_CHANGED', 'boolean'], ['handle', 'APP_HANDLE_CHANGED', 'string'], ['name', 'APP_NAME_CHANGED', 'string']];
    for (const [field, ruleId, type] of settings) {
        const oldValue = type === 'boolean' ? readOptionalBoolean(before, field) : readOptionalString(before, field);
        const newValue = type === 'boolean' ? readOptionalBoolean(after, field) : readOptionalString(after, field);
        if (oldValue !== newValue)
            findings.push({ ruleId, severity: 'review', field, summary: `${field} changed; review the intended app behaviour and deployment impact` });
    }
    const oldScopes = isObject(before.access_scopes) ? before.access_scopes : {};
    const newScopes = isObject(after.access_scopes) ? after.access_scopes : {};
    const oldLegacy = readOptionalBoolean(oldScopes, 'use_legacy_install_flow');
    const newLegacy = readOptionalBoolean(newScopes, 'use_legacy_install_flow');
    if (oldLegacy !== newLegacy)
        findings.push({ ruleId: 'LEGACY_INSTALL_FLOW_CHANGED', severity: 'review', field: 'access_scopes.use_legacy_install_flow', summary: 'legacy installation flow setting changed; review OAuth and scope-management behaviour' });
    const oldAdmin = readTable(readTable(before, 'access'), 'admin');
    const newAdmin = readTable(readTable(after, 'access'), 'admin');
    const oldDirect = readOptionalBoolean(oldAdmin, 'embedded_app_direct_api_access') ?? false;
    const newDirect = readOptionalBoolean(newAdmin, 'embedded_app_direct_api_access') ?? false;
    if (oldDirect !== newDirect)
        findings.push({ ruleId: 'ADMIN_DIRECT_API_ACCESS_CHANGED', severity: 'review', field: 'access.admin.embedded_app_direct_api_access', summary: 'Admin Direct API access was enabled or disabled; review client-side API access and authorization behaviour' });
    const oldMode = readOptionalString(oldAdmin, 'direct_api_mode') ?? 'online';
    const newMode = readOptionalString(newAdmin, 'direct_api_mode') ?? 'online';
    if (!['online', 'offline'].includes(oldMode) || !['online', 'offline'].includes(newMode))
        throw new Error('[access.admin].direct_api_mode must be online or offline');
    if (oldMode !== newMode)
        findings.push({ ruleId: 'ADMIN_DIRECT_API_MODE_CHANGED', severity: 'review', field: 'access.admin.direct_api_mode', summary: 'Admin Direct API access mode changed; review online/offline token expectations' });
    const oldCustomer = readTable(before, 'customer_authentication');
    const newCustomer = readTable(after, 'customer_authentication');
    findings.push(...changedSetFinding('CUSTOMER_AUTH_REDIRECTS_CHANGED', 'customer_authentication.redirect_uris', 'Customer authentication redirect URI set', readStringSet(oldCustomer, 'redirect_uris'), readStringSet(newCustomer, 'redirect_uris')));
    findings.push(...changedSetFinding('CUSTOMER_AUTH_ORIGINS_CHANGED', 'customer_authentication.javascript_origins', 'Customer authentication JavaScript origin set', readStringSet(oldCustomer, 'javascript_origins'), readStringSet(newCustomer, 'javascript_origins')));
    findings.push(...changedSetFinding('CUSTOMER_AUTH_LOGOUT_URLS_CHANGED', 'customer_authentication.logout_urls', 'Customer authentication logout URL set', readStringSet(oldCustomer, 'logout_urls'), readStringSet(newCustomer, 'logout_urls')));
    const oldProxy = readTable(before, 'app_proxy');
    const newProxy = readTable(after, 'app_proxy');
    const oldProxyEnabled = Object.keys(oldProxy).length > 0;
    const newProxyEnabled = Object.keys(newProxy).length > 0;
    if (oldProxyEnabled !== newProxyEnabled)
        findings.push({ ruleId: newProxyEnabled ? 'APP_PROXY_ENABLED' : 'APP_PROXY_DISABLED', severity: 'review', field: 'app_proxy', summary: `app proxy ${newProxyEnabled ? 'enabled' : 'disabled'}; review storefront routing and access scope behaviour` });
    if (readOptionalString(oldProxy, 'url') !== readOptionalString(newProxy, 'url'))
        findings.push({ ruleId: 'APP_PROXY_DESTINATION_CHANGED', severity: 'review', field: 'app_proxy.url', summary: 'app proxy destination changed; review proxy routing and deployment behaviour' });
    const oldRoute = `${readOptionalString(oldProxy, 'prefix') ?? ''}/${readOptionalString(oldProxy, 'subpath') ?? ''}`;
    const newRoute = `${readOptionalString(newProxy, 'prefix') ?? ''}/${readOptionalString(newProxy, 'subpath') ?? ''}`;
    if (oldRoute !== newRoute)
        findings.push({ ruleId: 'APP_PROXY_ROUTE_CHANGED', severity: 'review', field: 'app_proxy.prefix/subpath', summary: 'app proxy storefront route changed; review links, theme integrations and merchant-facing URLs' });
    const oldPos = readTable(before, 'pos');
    const newPos = readTable(after, 'pos');
    if (readOptionalBoolean(oldPos, 'embedded') !== readOptionalBoolean(newPos, 'embedded'))
        findings.push({ ruleId: 'POS_EMBEDDED_MODE_CHANGED', severity: 'review', field: 'pos.embedded', summary: 'POS embedded mode changed; review Shopify POS app behaviour' });
    const oldPreferences = readTable(before, 'app_preferences');
    const newPreferences = readTable(after, 'app_preferences');
    if (readOptionalString(oldPreferences, 'url') !== readOptionalString(newPreferences, 'url'))
        findings.push({ ruleId: 'APP_PREFERENCES_URL_CHANGED', severity: 'review', field: 'app_preferences.url', summary: 'app preferences URL changed; review the destination used by merchants' });
    findings.push(...changedSetFinding('EXTENSION_DIRECTORIES_CHANGED', 'extension_directories', 'Extension discovery directory set', readStringSet(before, 'extension_directories'), readStringSet(after, 'extension_directories')));
    findings.push(...changedSetFinding('WEB_DIRECTORIES_CHANGED', 'web_directories', 'Web discovery directory set', readStringSet(before, 'web_directories'), readStringSet(after, 'web_directories')));
    const oldBuild = readTable(before, 'build');
    const newBuild = readTable(after, 'build');
    if (readOptionalBoolean(oldBuild, 'automatically_update_urls_on_dev') !== readOptionalBoolean(newBuild, 'automatically_update_urls_on_dev'))
        findings.push({ ruleId: 'AUTOMATIC_DEV_URLS_CHANGED', severity: 'review', field: 'build.automatically_update_urls_on_dev', summary: 'automatic development URL updates changed; review local tunnel and callback behaviour' });
    return findings;
}
function decorate(findings) {
    return findings.map((finding) => {
        const metadata = metadataFor(finding.ruleId, finding.field);
        return {
            ...finding,
            category: metadata.category,
            documentationUrl: metadata.documentationUrl,
            riskLevel: metadata.riskLevel,
            riskRationale: metadata.riskRationale,
        };
    });
}
export function compareConfigs(before, after) {
    const oldScopes = readScopes(before);
    const newScopes = readScopes(after);
    const changes = [];
    for (const scope of [...oldScopes.optional].filter((s) => newScopes.required.has(s)).sort())
        changes.push({ ruleId: 'SCOPE_OPTIONAL_TO_REQUIRED', severity: 'review', field: 'access_scopes', summary: `scope changed from optional to required: ${scope}` });
    for (const scope of [...oldScopes.required].filter((s) => newScopes.optional.has(s)).sort())
        changes.push({ ruleId: 'SCOPE_REQUIRED_TO_OPTIONAL', severity: 'review', field: 'access_scopes', summary: `scope changed from required to optional: ${scope}` });
    const compare = (oldValues, newValues, kind) => {
        const oldOther = kind === 'required' ? oldScopes.optional : oldScopes.required;
        const newOther = kind === 'required' ? newScopes.optional : newScopes.required;
        for (const scope of [...newValues].filter((value) => !oldValues.has(value) && !oldOther.has(value)).sort())
            changes.push({ ruleId: `SCOPE_${kind.toUpperCase()}_ADDED`, severity: 'review', field: `access_scopes.${kind === 'required' ? 'scopes' : 'optional_scopes'}`, summary: `${kind} scope added: ${scope}` });
        for (const scope of [...oldValues].filter((value) => !newValues.has(value) && !newOther.has(value)).sort())
            changes.push({ ruleId: `SCOPE_${kind.toUpperCase()}_REMOVED`, severity: 'review', field: `access_scopes.${kind === 'required' ? 'scopes' : 'optional_scopes'}`, summary: `${kind} scope removed: ${scope}` });
    };
    compare(oldScopes.required, newScopes.required, 'required');
    compare(oldScopes.optional, newScopes.optional, 'optional');
    changes.push(...compareRootSettings(before, after), ...compareClientIds(before, after), ...compareUrls(before, after), ...compareWebhooks(before, after), ...compareEvents(before, after));
    return decorate(changes.sort((a, b) => a.field.localeCompare(b.field) || a.ruleId.localeCompare(b.ruleId) || a.summary.localeCompare(b.summary)));
}
