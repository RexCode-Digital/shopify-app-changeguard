# Shopify app configuration support matrix

Reviewed against Shopify's [app configuration reference](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration) and [configuration-file management guide](https://shopify.dev/docs/apps/build/cli-for-apps/manage-app-config-files) on 2026-09-27.

ChangeGuard reviews semantic differences between configuration revisions. It does not replace `shopify app config validate --json`; Shopify CLI remains responsible for complete schema and value validation.

| Configuration area | Status | ChangeGuard behaviour |
| --- | --- | --- |
| `name`, `client_id`, `handle` | Supported | Reports identity changes without printing client IDs or values. |
| `application_url`, `embedded` | Supported | Reports app destination and embedding changes without printing URLs. |
| `access_scopes` | Supported | Reviews required/optional additions, removals, and transitions. |
| `access.admin` | Supported | Reviews Direct API enablement and online/offline mode changes. |
| `auth.redirect_urls` | Supported | Reviews set changes without printing URLs. |
| `customer_authentication` | Supported | Reviews redirect, JavaScript-origin, and logout URL set changes without printing values. |
| `webhooks` | Supported | Reviews API version and subscription/delivery changes without printing destinations, topics, filters, or fields. |
| `events` | Supported | Reviews API version and subscription changes without printing destinations, queries, or trigger details. |
| `app_proxy` | Supported | Separately reviews enablement, destination, and storefront route changes without printing the destination. |
| `pos.embedded` | Supported | Reviews POS embedded-mode changes. |
| `app_preferences.url` | Supported | Reviews destination changes without printing the URL. |
| `extension_directories`, `web_directories` | Supported | Reviews deterministic set changes; Shopify CLI validates the paths and patterns. |
| `build.automatically_update_urls_on_dev` | Supported | Reviews development URL update policy changes. |
| `dev_store_url` | Intentionally ignored | It is environment-specific and may identify a private store; Shopify CLI validates it. |
| Other root tables and fields | Intentionally ignored | Unsupported fields are not guessed or treated as a security finding. |
| TOML syntax and complete Shopify schema | Delegated to Shopify CLI | Malformed supported structures fail closed, but ChangeGuard does not duplicate Shopify's schema validator. |
| `shopify.extension.toml` | Not supported in the current scope | Extension configuration is a separate type-specific system. |

ChangeGuard is offline, read-only, deterministic, and independent from Shopify. It does not call Shopify APIs, approve deployments, certify security, or validate credentials.
