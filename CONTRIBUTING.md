# Contributing to ChangeGuard

Thanks for helping improve ChangeGuard.

The project deliberately prefers **small, deterministic, privacy-safe review semantics** over a large noisy rule catalogue. ChangeGuard should help a human reviewer understand meaningful Shopify app configuration changes without exposing sensitive values.

## Good contribution areas

- Additional high-value Shopify app configuration semantics backed by current official documentation
- Redaction hardening
- False-positive reductions
- Privacy-safe fixture coverage
- Deterministic risk rationale improvements
- Cross-platform Git/ref handling
- GitHub Action and CLI reliability
- Documentation and reproducible examples

Browse the [open issues](https://github.com/RexCode-Digital/shopify-app-changeguard/issues) for current work.

## Contribution terms

You retain copyright in your contributions. By submitting a contribution, you agree that it is provided under the same MIT licence that applies to this project. You confirm that you have the right to submit the contribution. Disclose any third-party code or assets and identify their applicable licences before including them.

## Development

Requires Node.js 20 or newer. CI covers Node 20, 22, and 24.

```bash
npm ci --ignore-scripts
npm test
npm run coverage
npm run lint
npm audit
npm run package:check
npm run package:smoke
npm run action:check
npm run format:check
```

Use `npm run build` when source changes affect generated output. After rebuilding, ensure the committed Action bundle is deterministic and clean.

## Semantic-change checklist

For comparison or rule changes, include:

1. the Shopify configuration behaviour being reviewed
2. current official Shopify documentation where relevant
3. a positive change fixture
4. an unchanged or negative case
5. ordering/set behaviour where relevant
6. sensitive-value redaction coverage
7. stable rule/risk behaviour where applicable

Unsupported or malformed configuration must never be silently reported as clean.

## Safety principles

Do not add:

- telemetry
- Shopify credentials
- Shopify network/API calls for ordinary review
- unsafe shell interpolation
- execution of repository configuration
- raw sensitive values in findings, errors, summaries, or tests

Never commit real merchant configuration, credentials, customer data, private URLs, webhook destinations, or access tokens.

## Pull requests

Keep PRs focused. Explain:

- the problem
- the intended reviewer behaviour
- any Shopify documentation relied on
- privacy/redaction implications
- commands run and their results

AI-assisted contributions are welcome, but the human submitter must review and understand the change.

## Coverage

Current coverage gates protect comparison and redaction paths. Do not weaken them to land a change.

## Security

Use [GitHub private vulnerability reporting](https://github.com/RexCode-Digital/shopify-app-changeguard/security/advisories/new) for suspected vulnerabilities. Do not disclose security-sensitive details in public issues.

ChangeGuard does not certify Shopify compliance, security, or deployment safety.
