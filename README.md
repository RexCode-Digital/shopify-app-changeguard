# ChangeGuard

ChangeGuard reviews `shopify.app*.toml` configuration changes in pull requests before deployment. It is an offline, read-only semantic reviewer: it highlights meaningful changes for human review and redacts sensitive configuration values from findings and summaries.

No Shopify credentials, network access, or Shopify API calls are required. ChangeGuard is not affiliated with, endorsed by, or certified by Shopify.

## GitHub Action

```yaml
name: Shopify app configuration review
on: pull_request
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
      - uses: efegokdemir/shopify-app-changeguard@1fee675575e3dfbbe2c8d702323aa7c4240efcb1 # v0.5.0
        with:
          base_sha: ${{ github.event.pull_request.base.sha }}
          head_sha: ${{ github.event.pull_request.head.sha }}
          fail_on: review
```

The Action contains its production dependencies and compiled code. Consumer jobs do not install npm dependencies or compile ChangeGuard. Pin a reviewed full commit SHA; do not use `main` for a security-sensitive workflow. See [the Action guide](docs/github-action.md) and the [copy-paste workflow example](examples/changeguard-workflow.yml).

## CLI

The package is published on the [npm registry](https://www.npmjs.com/package/shopify-app-changeguard)
with GitHub Actions provenance.

```sh
npm install --save-dev shopify-app-changeguard
npx changeguard --before examples/before.toml --after examples/after.toml --json
npx changeguard --base-ref main --head-ref HEAD --file shopify.app.toml --fail-on review
npx changeguard --base-ref main --head-ref HEAD --all-configs --json
```

`--fail-on never` is the default. `review` exits 1 when findings exist. Invalid or unreviewable input exits 2. See [CLI reference](docs/cli.md).

## Supported checks

Each finding also includes a deterministic risk level (`low`, `medium`, or `high`) and a short rationale so reviewers can prioritize attention. Risk levels are review guidance, not Shopify validation or deployment approval; sensitive values remain redacted.

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

The supported semantics are based on the current [Shopify app configuration documentation](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration), including webhook and developer-preview Events subscription changes. See the [support matrix](docs/support-matrix.md) for supported, ignored, delegated, and non-planned areas. Unsupported fields are ignored by direct comparison; unsupported or malformed changed files fail closed in the Action.

## Non-goals

- No Shopify API calls, credentials, or network services.
- No deployment or deployment approval.
- No replacement for Shopify schema validation.
- No security certification or vulnerability scanning.
- No telemetry.

ChangeGuard is deliberately narrow and highlights changes for human review. It does not validate credentials or approve security.

## Demo and limitations

The checked-in [before](examples/before.toml) and [after](examples/after.toml) fixtures are synthetic. Generate output from the executable with `npm ci --ignore-scripts && npm test && npm run check -- --before examples/before.toml --after examples/after.toml`.

ChangeGuard does not send configuration to a service, access Shopify, or replace application/OAuth/security review. It is not a complete security scanner, schema validator, or deployment verifier. Do not pass real secrets or private configuration to logs.

This is an early 0.x project. The public repository currently has no claimed external adopters, endorsements, or usage statistics. See [CHANGELOG.md](CHANGELOG.md), [ROADMAP.md](ROADMAP.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
