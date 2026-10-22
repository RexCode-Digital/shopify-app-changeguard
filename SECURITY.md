# Security policy

ChangeGuard is an offline developer tool. An ordinary scan reads repository files; it does not require Shopify credentials, call Shopify APIs, or upload scanned source.

## Supported versions

The latest published release and the default branch receive security fixes. Upgrade to the latest release before reporting an issue.

## Report a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/RexCode-Digital/shopify-app-changeguard/security/advisories/new). Include the affected version, command or Action, impact, and a minimal sanitised reproduction. Do not include credentials, access tokens, private keys, merchant/customer data, private source, or production configuration.

Please coordinate public disclosure with the maintainer while the report is assessed and a fix is prepared. Response time depends on maintainer availability; no response-time guarantee is offered.

## Security boundaries

Static analysis is bounded and cannot prove runtime behaviour, complete security, Shopify compliance, or App Store approval. Review each product's documentation for its specific evidence limits.