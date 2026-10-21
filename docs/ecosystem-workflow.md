# Run the four Shopify review tools together

This pull-request workflow runs the currently published ChangeGuard, Upgrade Guard, Scope Guard, and App Review Guard Actions as separate read-only checks. Each Action is pinned to the full commit SHA documented for its current patch release. `actions/checkout` fetches history for Upgrade Guard's base/head comparison and does not persist its token.

## Local integration smoke test

The synthetic consumer app in `ecosystem-fixtures/` exercises the local CLI checkouts without Shopify credentials, network services, or workflow permissions. With the four repository directories side by side, run `node scripts/ecosystem-smoke.mjs` from ChangeGuard under Node.js 22 or 24. Set `REXCODE_OSS_REPOS_DIR` to the parent directory if the checkouts are elsewhere. The script creates and removes a temporary Git repository, checks ChangeGuard's existing/new finding lifecycle, Upgrade Guard's 2027-01 `owner_type` finding, Scope Guard's missing product-read-scope evidence, and App Review Guard's Next.js webhook route review.

This validates the local CLI implementations on the selected runtime. It does not exercise GitHub Actions or hosted CI. The workflow below continues to pin released Action commits; do not point it at an unreleased feature branch before review and release.

```yaml
name: Shopify review tools

on:
  pull_request:

permissions:
  contents: read

jobs:
  config-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: RexCode-Digital/shopify-app-changeguard@1ad900a2dc4d8b83305642611a89ea8eb30e165a # v0.7.0
        with:
          base_sha: ${{ github.event.pull_request.base.sha }}
          head_sha: ${{ github.event.pull_request.head.sha }}
          fail_on: unreviewed

  upgrade-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: RexCode-Digital/shopify-upgrade-guard@71f9cdca7d0b34b07c1dfb60c2dc649e2e595139 # v0.4.0
        with:
          target: 2026-10
          fail-on: warning
          fail-on-new: 'true'

  scope-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: RexCode-Digital/shopify-scope-guard@da4d786f22049e2e96728918ebaaa1f362898d84 # v0.4.0
        with:
          fail-on: high

  app-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: RexCode-Digital/shopify-app-review-guard@886a729183227ab742effcf7dfea32bbe9756e09 # v0.2.0
        with:
          format: human
          fail-on: high
```

ChangeGuard reviews semantic changes to Shopify app configuration. Upgrade Guard checks documented API migration risks against the selected target version and, with `fail-on-new`, only applies the threshold to findings introduced by the pull request. Scope Guard compares Admin GraphQL evidence with declared OAuth scopes. App Review Guard reports repository checks and manual submission items that static analysis cannot verify.

The four checks are independent. Set each threshold to match the repository's review policy; review output before raising a gate. None of these tools validates a live store, replaces Shopify CLI schema checks, or approves a deployment. Do not change this workflow to `pull_request_target` to run checks on fork changes.
