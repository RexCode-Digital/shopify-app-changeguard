# Security policy

ChangeGuard is an unofficial, read-only review tool. It does not access Shopify or receive Shopify credentials.

## Supported versions

Only the latest published release and the default branch are supported for security fixes while the project is below 1.0.0. Older experimental tags may be unavailable for fixes.

## Report a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/RexCode-Digital/shopify-app-changeguard/security/advisories/new) for this repository. It is enabled for this public repository. Do not open a public issue for a suspected vulnerability. Include a minimal reproduction, affected version or commit, impact, and a safe mitigation if known.

Never include secrets, customer data, private URLs, credentials, or production configuration. The maintainer will acknowledge, reproduce, assess, and publish a sanitised advisory or release note when appropriate. Response timing is not a guarantee.

Sensitive areas include secret leakage, unsafe Git/ref handling, Action code execution, dependency or distribution compromise, and misleading security or Shopify-affiliation claims. ChangeGuard is not a complete security scanner.
