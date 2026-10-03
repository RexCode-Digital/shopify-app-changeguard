# ChangeGuard

**Review meaningful Shopify app configuration changes before they reach production.**

[![npm](https://img.shields.io/npm/v/shopify-app-changeguard?logo=npm)](https://www.npmjs.com/package/shopify-app-changeguard)
[![npm downloads](https://img.shields.io/npm/dm/shopify-app-changeguard?logo=npm)](https://www.npmjs.com/package/shopify-app-changeguard)
[![CI](https://github.com/efegokdemir/shopify-app-changeguard/actions/workflows/ci.yml/badge.svg)](https://github.com/efegokdemir/shopify-app-changeguard/actions/workflows/ci.yml)
[![CodeQL](https://github.com/efegokdemir/shopify-app-changeguard/actions/workflows/codeql.yml/badge.svg)](https://github.com/efegokdemir/shopify-app-changeguard/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/efegokdemir/shopify-app-changeguard/badge)](https://securityscorecards.dev/viewer/?uri=github.com/efegokdemir/shopify-app-changeguard)
[![license](https://img.shields.io/github/license/efegokdemir/shopify-app-changeguard)](LICENSE)

ChangeGuard is an offline, read-only semantic reviewer for `shopify.app*.toml` changes. It helps reviewers see configuration changes that deserve attention, assigns deterministic risk levels, and redacts sensitive configuration values from findings and summaries.

**No Shopify credentials. No telemetry. No source upload. No Shopify API calls.**

> Unofficial open-source developer tooling. Not affiliated with, endorsed by, or certified by Shopify.

Part of the **RexCode Shopify developer tools** suite. Requires Node.js 20 or later for the CLI. [Releases](https://github.com/efegokdemir/shopify-app-changeguard/releases) · [npm](https://www.npmjs.com/package/shopify-app-changeguard) · [Marketplace](https://github.com/marketplace/actions/changeguard-shopify-app-config-review)

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

      - uses: efegokdemir/shopify-app-changeguard@1aa53118ea9d8c47d2d362cb33acd18156624914 # v0.5.1
        with:
          base_sha: ${{ github.event.pull_request.base.sha }}
          head_sha: ${{ github.event.pull_request.head.sha }}
          fail_on: review
```

For security-sensitive workflows, pin third-party Actions to a reviewed immutable commit SHA rather than `main`.

See the [Action guide](docs/github-action.md) and [copy-paste workflow example](examples/changeguard-workflow.yml).

For convenience, workflows may use the movable minor release alias `efegokdemir/shopify-app-changeguard@v0.5`. For high-assurance supply-chain usage, resolve the current patch release to a full commit SHA; minor aliases are not immutable.

### Action inputs

| Input | Purpose |
| --- | --- |
| `base_sha` | Pull request base commit SHA |
| `head_sha` | Pull request head commit SHA |
| `fail_on` | Failure policy: `never`, `review`, or `unreviewed` |

### Action outputs

`outcome`, `finding_count`, `highest_severity`, `highest_risk`, `report`, `reviewed_file_count`, `unreviewed_count`, and `rule_ids`.

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
| Events | Developer-preview API version and subscription changes, without printing handles, destinations, topics, triggers, queries, or filters |
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
changeguard --base-ref REF --head-ref REF --file shopify.app.toml [--fail-on ...]
changeguard --base-ref REF --head-ref REF --all-configs [--json]
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
```

`--fail-on never` is the default. `review` exits 1 when findings exist. Input errors exit 2. In Git-range mode, incomplete reviews exit 2 under `review` or `unreviewed`; `never` reports them without failing.

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

- **[Shopify Upgrade Guard](https://github.com/efegokdemir/shopify-upgrade-guard)** — Catch documented Shopify API and platform upgrade risks before production migrations.
- **[Shopify Scope Guard](https://github.com/efegokdemir/shopify-scope-guard)** — Audit whether declared Shopify access scopes are supported by offline code evidence.
- **[Shopify App Review Guard](https://github.com/efegokdemir/shopify-app-review-guard)** — Run deterministic preflight checks for Shopify App Store and production readiness.

All four tools run offline and require no Shopify credentials.

## Contributing

Contributions are welcome, especially around new evidence-backed configuration semantics, redaction hardening, privacy-safe fixtures, and deterministic review quality.

A rule or semantic change should include:

1. the Shopify configuration behaviour being reviewed
2. current official Shopify documentation where relevant
3. a positive fixture
4. an unchanged/negative case
5. ordering/set-behaviour coverage where relevant
6. redaction coverage for any sensitive values

Start with [CONTRIBUTING.md](CONTRIBUTING.md) or browse the [open issues](https://github.com/efegokdemir/shopify-app-changeguard/issues).

## Roadmap

Current priorities are deterministic/redacted review quality, privacy-safe fixture coverage, additional high-value documented fields, and stronger evidence of external use without telemetry.

See [ROADMAP.md](ROADMAP.md).

## License

MIT — see [LICENSE](LICENSE).

## Immutable SHA usage

The Action example pins the reviewed v0.5.1 release commit. Verify the release reference with:

```bash
gh api repos/efegokdemir/shopify-app-changeguard/git/ref/tags/v0.5.1 --jq .object.sha
```

Published patch tags are retained; existing minor aliases are movable. A reviewed full commit SHA is the immutable execution reference.
