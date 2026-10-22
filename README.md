# ChangeGuard

Review Shopify app configuration changes in CI with semantic diffs and risk findings.

**RexCode Open Source · Shopify developer tools**

[![npm](https://img.shields.io/npm/v/shopify-app-changeguard?logo=npm)](https://www.npmjs.com/package/shopify-app-changeguard)
[![CI](https://github.com/RexCode-Digital/shopify-app-changeguard/actions/workflows/ci.yml/badge.svg)](https://github.com/RexCode-Digital/shopify-app-changeguard/actions/workflows/ci.yml)
[![CodeQL](https://github.com/RexCode-Digital/shopify-app-changeguard/actions/workflows/codeql.yml/badge.svg)](https://github.com/RexCode-Digital/shopify-app-changeguard/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/RexCode-Digital/shopify-app-changeguard/badge)](https://securityscorecards.dev/viewer/?uri=github.com/RexCode-Digital/shopify-app-changeguard)
[![Node.js 22+](https://img.shields.io/badge/Node.js-22+-22B8B2?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MIT licence](https://img.shields.io/github/license/RexCode-Digital/shopify-app-changeguard)](LICENSE)

ChangeGuard compares supported Shopify app configuration fields and explains semantic risks before changes are merged or deployed. It is a read-only CLI and GitHub Action; Shopify CLI remains responsible for validating the complete configuration schema.

## Features

- Explains changes to supported app configuration fields rather than only printing a text diff.
- Classifies baseline findings as new, existing or resolved with deterministic fingerprints.
- Redacts sensitive values and validates paths and Git references.
- Uses the same report model in the CLI and Action.

## Install and run

Requires Node.js 22 or later.

```bash
npm install --save-dev shopify-app-changeguard
npx changeguard --before path/to/before.toml --after path/to/after.toml
```

Compare two files or a Git range. Run `npx changeguard --help` for the available options, or read the [CLI guide](docs/cli.md).

## GitHub Action

Pin the reviewed v0.7.0 release commit:

```yaml
name: Review Shopify app configuration
on: [pull_request]
permissions:
  contents: read

jobs:
  changeguard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
      - uses: RexCode-Digital/shopify-app-changeguard@1ad900a2dc4d8b83305642611a89ea8eb30e165a # v0.7.0
        id: review
        with:
          base_sha: ${{ github.event.pull_request.base.sha }}
          head_sha: ${{ github.event.pull_request.head.sha }}
          fail_on: unreviewed
```

Inputs include `base_sha`, `head_sha`, `fail_on`, `fail_on_risk`, `baseline_path` and `fail_on_new`. Outputs include the outcome, finding and baseline counts, highest severity/risk, reviewed and unreviewed file counts, rule IDs and JSON report. See the full [Action interface](action.yml).

## Example output

```text
ChangeGuard v0.7.0
Only documented semantic changes in supported Shopify app configuration fields are examined; Shopify CLI remains responsible for schema validation and unsupported fields are not checked.
[REVIEW] SCOPE_OPTIONAL_TO_REQUIRED: scope changed from optional to required: read_products
1 finding(s).
```

This is the output for the repository's synthetic before/after fixtures.

## Supported capabilities and evidence

ChangeGuard recognises a documented subset of Shopify app configuration fields. It reports supported semantic changes and risk rationale; it does not validate every TOML field or replace Shopify CLI. See [supported rules](docs/rules.md), the [risk model](docs/architecture.md), and the [support matrix](docs/support-matrix.md).

## Limitations and privacy

ChangeGuard does not call Shopify APIs, require Shopify credentials, execute repository code, or send configuration to a service. Static review cannot establish whether unsupported fields are valid or guarantee deployment safety. Use synthetic fixtures in issues and remove tokens, client secrets, private URLs, webhook destinations and merchant data.

## Documentation

- [Getting started](docs/getting-started.md)
- [CLI reference](docs/cli.md)
- [GitHub Action](docs/github-action.md)
- [Threat model](docs/threat-model.md)
- [Ecosystem workflow](docs/ecosystem-workflow.md)

## Related RexCode OSS tools

- [Shopify Upgrade Guard](https://github.com/RexCode-Digital/shopify-upgrade-guard) checks documented API and platform migration risks.
- [Shopify Scope Guard](https://github.com/RexCode-Digital/shopify-scope-guard) reviews declared scopes against supported static evidence.
- [Shopify App Review Guard](https://github.com/RexCode-Digital/shopify-app-review-guard) reports App Store and production-readiness evidence.

See the [four-tool workflow example](docs/ecosystem-workflow.md).

## Contributing and support

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [RexCode Open Source standards](https://github.com/RexCode-Digital/.github/blob/main/docs/oss/standards.md). Use [SUPPORT.md](SUPPORT.md) or the [issue tracker](https://github.com/RexCode-Digital/shopify-app-changeguard/issues) for safe usage questions and reproducible reports.

## Security

Report suspected vulnerabilities privately through [SECURITY.md](SECURITY.md). Do not include production configuration or secrets in public issues.

## Licence and affiliation

MIT licensed. Shopify and related marks are owned by their respective holders. ChangeGuard is independent open-source software and is not affiliated with, endorsed by, or certified by Shopify.