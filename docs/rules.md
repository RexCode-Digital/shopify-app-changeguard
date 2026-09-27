# Supported rules

ChangeGuard reports review findings, not approvals. Findings never include client IDs, URLs, webhook destinations, topics, filters, or included field names.

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
| `WEBHOOK_API_VERSION_CHANGED` | Webhook API version changes | Review payload compatibility and rollout timing |
| `WEBHOOK_SUBSCRIPTIONS_CHANGED` | Webhook topics, destinations, filters, or fields change | Review delivery coverage, endpoint routing, and data exposure |

The rule semantics are grounded in [Shopify app configuration](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration), including [access scope management](https://shopify.dev/docs/apps/build/authentication-authorization/manage-access-scopes). Events configuration is intentionally outside the current supported set; see the roadmap and issue tracker before relying on that configuration for review.

Reordering equivalent sets is ignored where the Shopify configuration semantics are set-like. Malformed supported structures and changed files that cannot be analyzed fail closed in the GitHub Action.
