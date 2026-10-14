# ChangeGuard

**Review meaningful Shopify app configuration changes before they reach production.**

[![npm](https://img.shields.io/npm/v/shopify-app-changeguard?logo=npm)](https://www.npmjs.com/package/shopify-app-changeguard)
[![npm downloads](https://img.shields.io/npm/dm/shopify-app-changeguard?logo=npm)](https://www.npmjs.com/package/shopify-app-changeguard)
[![CI](https://github.com/RexCode-Digital/shopify-app-changeguard/actions/workflows/ci.yml/badge.svg)](https://github.com/RexCode-Digital/shopify-app-changeguard/actions/workflows/ci.yml)
[![CodeQL](https://github.com/RexCode-Digital/shopify-app-changeguard/actions/workflows/codeql.yml/badge.svg)](https://github.com/RexCode-Digital/shopify-app-changeguard/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/RexCode-Digital/shopify-app-changeguard/badge)](https://securityscorecards.dev/viewer/?uri=github.com/RexCode-Digital/shopify-app-changeguard)
[![license](https://img.shields.io/github/license/RexCode-Digital/shopify-app-changeguard)](LICENSE)

ChangeGuard is an offline, read-only semantic reviewer for `shopify.app*.toml` changes. It helps reviewers see configuration changes that deserve attention, assigns deterministic risk levels, and redacts sensitive configuration values from findings and summaries.

**No Shopify credentials. No telemetry. No source upload. No Shopify API calls.**

> Unofficial open-source developer tooling. Not affiliated with, endorsed by, or certified by Shopify.

Maintained by RexCode Digital Ltd.

Part of the **RexCode Shopify developer tools** suite. Requires Node.js 20 or later for the CLI. [Releases](https://github.com/RexCode-Digital/shopify-app-changeguard/releases) · [npm](https://www.npmjs.com/package/shopify-app-changeguard) · [Marketplace](https://github.com/marketplace/actions/changeguard-shopify-app-config-review)

## Quick start

Compare two Shopify app configuration files without installing globally:

```bash
npx shopify-app-changeguard --before shopify.app.before.toml --after shopify.app.toml
```

JSON output:

```bash
npx shopify-app-changeguard --before shopify.app.before.toml --after shopify.app.toml --json
```

Review a Git diff:

```bash
npx shopify-app-changeguard --base-ref main --head-ref HEAD --all-configs
```

Or install it in a project:

```bash
npm install --save-dev shopify-app-changeguard
npx changeguard --base-ref main --head-ref HEAD --all-configs
```

## Why ChangeGuard?

Shopify app configuration files can change behaviour without looking like application-code changes. A small TOML diff can alter access scopes, OAuth redirects, webhook delivery, app identity, proxy behaviour, POS settings, or development configuration.

ChangeGuard turns those diffs into a focused review report.

- **Semantic review** — highlights meaningful configuration changes instead of raw line noise.
- **Deterministic risk levels** — each finding is labelled `low`, `medium`, or `high` with a rationale.
- **Privacy-first** — sensitive values are redacted from findings and summaries.
- **PR-ready** — runs as a bundled GitHub Action with no dependency install in consumer jobs.
- **Offline by design** — ordinary review needs no Shopify credentials, network service, or API access.
- **Stable automation** — machine-readable JSON, stable rule IDs, and Action outputs for CI policy.

Risk levels are review guidance, not Shopify validation, security certification, or deployment approval.

## GitHub Action

A minimal pull-request workflow:

```yaml
name: Shopify app configuration review

on:
  pull_request:

permissions:
  contents: read

jobs:
  changeguard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
          persist-credentials: false

      - uses: RexCode-Digital/shopify-app-changeguard@67ef54c622788e11b33caab7d9da51ce07294512 # v0.5.2
        with:
          base_sha: ${{ github.event.pull_request.base.sha }}
          head_sha: ${{ github.event.pull_request.head.sha }}
          fail_on: review
```

For security-sensitive workflows, pin third-party Actions to a reviewed immutable commit SHA rather than `main`.

See the [Action guide](docs/github-action.md) and [copy-paste workflow example](examples/changeguard-workflow.yml).

Use an exact patch release tag or a full commit SHA. The historical `v0.5` alias is retained but is no longer moved by the release workflow.

### Action inputs

| Input | Purpose |
| --- | --- |
| `base_sha` | Pull request base commit SHA |
| `head_sha` | Pull request head commit SHA |
| `fail_on` | Failure policy: `never`, `review`, or `unreviewed` |
| `fail_on_risk` | Optional independent risk threshold: `none` (default), `low`, `medium`, or `high` |

### Action outputs

`outcome`, `finding_count`, `highest_severity`, `highest_risk`, `risk_threshold_exceeded`, `report`, `reviewed_file_count`, `unreviewed_count`, and `rule_ids`.

The optional `fail_on_risk` policy is independent of `fail_on`: either policy can fail the job. `none` disables risk-based failure. The existing `fail_on` default and behaviour are unchanged; when it is `never`, an incomplete result remains visible as `outcome: incomplete` and is not represented as a complete review. Findings produce file-level GitHub warning annotations when a changed configuration file is known; no source line is inferred.

The example above pins v0.5.2, which does not include `fail_on_risk` or `risk_threshold_exceeded`. These Action additions, along with the Markdown and risk-threshold CLI options below, are part of the unreleased changes here and are not available from npm v0.5.2.

The bundled Action runs on GitHub's `node24` JavaScript Action runtime. Consumer jobs do not install project dependencies or compile ChangeGuard.

## What it reviews

| Area | Review behaviour |
| --- | --- |
| Required and optional access scopes | Additions, removals, and required/optional transitions |
| `client_id` | Added, removed, or changed, without printing the ID |
| App identity and settings | `name`, `application_url`, `embedded`, and `handle` changes |
| OAuth | `auth.redirect_urls` set changes, without printing URLs |
| Admin Direct API | Enablement and online/offline mode changes |
| Customer authentication | Redirect, origin, and logout URL set changes, without printing values |
| Installation flow | `access_scopes.use_legacy_install_flow` changes |
| App proxy, POS, preferences | Proxy enablement/destination/route, `pos.embedded`, and preferences URL changes, without printing URLs |
| Project discovery/build | Extension/web directory sets and automatic development URL update policy |
| Webhooks | API version and subscription route/delivery changes, without printing destinations, topics, filters, or field names |
| Events | API version and subscription changes, without printing handles, destinations, topics, triggers, queries, or filters |
| Config lifecycle | Added, removed, or renamed named `shopify.app*.toml` files |

Supported semantics follow the current [Shopify app configuration documentation](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration).

See the [support matrix](docs/support-matrix.md) for supported, ignored, delegated, and intentionally non-planned areas.

## Risk model

Every finding includes a deterministic risk level and a concise rationale.

- **low** — review-worthy change with limited expected operational impact
- **medium** — change that can affect integration or application behaviour and deserves focused review
- **high** — change with broader permission, authentication, delivery, or operational consequences

The risk model is deliberately deterministic so CI and human reviewers see the same classification for the same semantic change.

It is not a claim that a configuration is secure, valid, or approved by Shopify.

## CLI

```text
changeguard --before FILE --after FILE [--json]
changeguard --before FILE --after FILE [--format human|json|markdown] [--fail-on ...] [--fail-on-risk none|low|medium|high]
changeguard --base-ref REF --head-ref REF --file shopify.app.toml [--format human|json|markdown] [--fail-on ...] [--fail-on-risk ...]
changeguard --base-ref REF --head-ref REF --all-configs [--format human|json|markdown] [--fail-on ...] [--fail-on-risk ...]
```

Examples:

```bash
# Compare synthetic fixtures from this repository
npx shopify-app-changeguard --before examples/before.toml --after examples/after.toml

# Machine-readable output
npx shopify-app-changeguard --before examples/before.toml --after examples/after.toml --json

# Review every named Shopify app configuration changed against main
npx shopify-app-changeguard --base-ref main --head-ref HEAD --all-configs --json

# Fail CI when review findings exist
npx shopify-app-changeguard --base-ref main --head-ref HEAD --all-configs --fail-on review

# Write a Markdown report and fail only for high-risk findings
npx shopify-app-changeguard --base-ref main --head-ref HEAD --all-configs --format markdown --fail-on-risk high
```

`--fail-on never` and `--fail-on-risk none` are the defaults. `review` exits 1 when findings exist; a risk threshold exits 1 when a finding reaches that level. Input errors exit 2. In Git-range mode, incomplete reviews exit 2 under `review` or `unreviewed`; `never` reports them with an incomplete status without failing. Repository-wide reports group findings by configuration file and do not infer environment names from arbitrary filenames.

See the [CLI reference](docs/cli.md).

## Security and privacy

ChangeGuard treats repository content as untrusted input and is intentionally narrow.

It:

- does not execute scanned Shopify configuration
- does not call Shopify APIs
- does not require Shopify credentials
- does not upload configuration to a service
- redacts sensitive configuration values from findings and summaries
- uses bounded, reviewable comparison behaviour
- ships a bundled Action so consumer workflows do not run an install step for ChangeGuard

See [SECURITY.md](SECURITY.md), [SUPPORT.md](SUPPORT.md), and the project documentation in [docs/](docs/).

## Non-goals

ChangeGuard does **not**:

- deploy or approve deployments
- replace Shopify schema validation
- certify application security
- validate credentials
- act as a complete vulnerability scanner
- collect telemetry

It highlights changes that deserve human review.

## Related Shopify developer tools

Building or maintaining Shopify apps?

- **[Shopify Upgrade Guard](https://github.com/RexCode-Digital/shopify-upgrade-guard)** — Catch documented Shopify API and platform upgrade risks before production migrations.
- **[Shopify Scope Guard](https://github.com/RexCode-Digital/shopify-scope-guard)** — Audit whether declared Shopify access scopes are supported by offline code evidence.
- **[Shopify App Review Guard](https://github.com/RexCode-Digital/shopify-app-review-guard)** — Run deterministic preflight checks for Shopify App Store and production readiness.

All four tools run offline and require no Shopify credentials.

See the [coordinated workflow example](docs/ecosystem-workflow.md) to run all four published Actions in one pull-request workflow.

## Contributing

Contributions are welcome, especially around new evidence-backed configuration semantics, redaction hardening, privacy-safe fixtures, and deterministic review quality.

A rule or semantic change should include:

1. the Shopify configuration behaviour being reviewed
2. current official Shopify documentation where relevant
3. a positive fixture
4. an unchanged/negative case
5. ordering/set-behaviour coverage where relevant
6. redaction coverage for any sensitive values

Start with [CONTRIBUTING.md](CONTRIBUTING.md) or browse the [open issues](https://github.com/RexCode-Digital/shopify-app-changeguard/issues).

## Roadmap

Current priorities are deterministic/redacted review quality, privacy-safe fixture coverage, additional high-value documented fields, and stronger evidence of external use without telemetry.

See [ROADMAP.md](ROADMAP.md).

## License

MIT — see [LICENSE](LICENSE).

## Immutable SHA usage

The Action example pins the reviewed v0.5.2 release commit. Verify the release reference with:

```bash
git fetch --tags origin && git rev-parse 'v0.5.2^{commit}'
```

Published patch tags are retained. The release workflow does not move existing tags; a reviewed full commit SHA is the immutable execution reference.
