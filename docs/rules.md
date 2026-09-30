# Supported rules

ChangeGuard reports review findings, not approvals. Findings never include client IDs, URLs, webhook destinations, topics, filters, or included field names.

## Risk levels

Every finding includes a deterministic `riskLevel` and `riskRationale` in JSON and Action reports. The levels prioritize human review; they do not validate Shopify configuration or certify security.

- **high** — authorization, identity, routing, API access, event delivery, or configuration lifecycle changes that can affect access, deployment targets, traffic, or delivery.
- **medium** — runtime-behaviour changes that can affect installation or execution without directly changing permissions.
- **low** — project-discovery changes that affect which local paths Shopify CLI discovers.

The same category-based heuristic is used for all rules so results remain stable and explainable. Existing `severity: "review"` and failure policies are unchanged.

| Rule | Trigger | Reviewer implication |
| --- | --- | --- |
| `SCOPE_REQUIRED_ADDED` / `SCOPE_REQUIRED_REMOVED` | Required scope set changes | Re-check least privilege and merchant consent |
| `SCOPE_OPTIONAL_ADDED` / `SCOPE_OPTIONAL_REMOVED` | Optional scope set changes | Re-check dynamic authorization behaviour |
| `SCOPE_OPTIONAL_TO_REQUIRED` / `SCOPE_REQUIRED_TO_OPTIONAL` | A scope changes authorization class | Review consent, installation, and runtime assumptions |
| `CLIENT_ID_ADDED` / `CLIENT_ID_REMOVED` / `CLIENT_ID_CHANGED` | Public app identifier changes | Confirm the intended app/environment and deployment target |
| `APPLICATION_URL_CHANGED` | Application URL added, removed, or changed | Confirm environment, host, TLS, and deployment routing |
| `AUTH_REDIRECT_URLS_CHANGED` | Redirect URL set changes | Review OAuth callback allow-list and environment boundaries |
| `EMBEDDED_MODE_CHANGED` | Root `embedded` setting changes | Review App Home and authentication behaviour |
| `APP_HANDLE_CHANGED` | Root `handle` changes | Review Shopify admin links and published app navigation |
| `LEGACY_INSTALL_FLOW_CHANGED` | `access_scopes.use_legacy_install_flow` changes | Review OAuth and scope-management behaviour |
| `APP_NAME_CHANGED` | Root `name` changes | Review app identity and display configuration |
| `ADMIN_DIRECT_API_ACCESS_CHANGED` | Direct API access is enabled or disabled | Review frontend API access and authorization behaviour |
| `ADMIN_DIRECT_API_MODE_CHANGED` | Direct API mode changes | Review online/offline token expectations |
| `CUSTOMER_AUTH_REDIRECTS_CHANGED` / `CUSTOMER_AUTH_ORIGINS_CHANGED` / `CUSTOMER_AUTH_LOGOUT_URLS_CHANGED` | Customer authentication URL/origin sets change | Review Customer Account API authentication flows; values are redacted |
| `APP_PROXY_ENABLED` / `APP_PROXY_DISABLED` | App proxy table is added or removed | Review storefront routing and required scopes |
| `APP_PROXY_DESTINATION_CHANGED` | `app_proxy.url` changes | Review proxy destination without printing the URL |
| `APP_PROXY_ROUTE_CHANGED` | `app_proxy.prefix` or `subpath` changes | Review merchant-facing proxy links |
| `POS_EMBEDDED_MODE_CHANGED` | `pos.embedded` changes | Review Shopify POS behaviour |
| `APP_PREFERENCES_URL_CHANGED` | `app_preferences.url` changes | Review the merchant preferences destination without printing the URL |
| `EXTENSION_DIRECTORIES_CHANGED` / `WEB_DIRECTORIES_CHANGED` | Discovery path-pattern sets change | Review what Shopify CLI will discover |
| `AUTOMATIC_DEV_URLS_CHANGED` | `build.automatically_update_urls_on_dev` changes | Review local tunnel and callback behaviour |
| `WEBHOOK_API_VERSION_CHANGED` | Webhook API version changes | Review payload compatibility and rollout timing |
| `WEBHOOK_SUBSCRIPTIONS_CHANGED` | Webhook topics, destinations, filters, or fields change | Review delivery coverage, endpoint routing, and data exposure |
| `EVENTS_API_VERSION_CHANGED` | `[events].api_version` is added, removed, or changed | Review developer-preview/runtime compatibility |
| `EVENTS_SUBSCRIPTIONS_CHANGED` | An Events subscription is added, removed, or changed | Review topic, actions, triggers, destination, and query settings |
| `CONFIG_ADDED` / `CONFIG_REMOVED` / `CONFIG_RENAMED` | A named Shopify app configuration lifecycle changes | Review environment selection and deployment workflows |

The rule semantics are grounded in [Shopify app configuration](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration), [access scope management](https://shopify.dev/docs/apps/build/authentication-authorization/manage-access-scopes), and [Events subscriptions](https://shopify.dev/docs/apps/build/events/subscribe). Events is currently a developer preview on Shopify's `unstable` API version; this check identifies semantic configuration changes but does not validate whether Shopify accepts a topic, trigger, query, or URI.

Events subscription handles identify entries for comparison. Actions and triggers are treated as unordered sets. Destinations, handles, topics, triggers, GraphQL queries, and filters are never included in findings.

Reordering equivalent sets is ignored where the Shopify configuration semantics are set-like. Malformed supported structures and changed files that cannot be analyzed fail closed in the GitHub Action.
