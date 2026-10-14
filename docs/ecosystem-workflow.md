# Run the four Shopify review tools together

This pull-request workflow runs the currently published ChangeGuard, Upgrade Guard, Scope Guard, and App Review Guard Actions as separate read-only checks. Each Action is pinned to the full commit SHA documented for its current patch release. `actions/checkout` fetches history for Upgrade Guard's base/head comparison and does not persist its token.

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
      - uses: RexCode-Digital/shopify-app-changeguard@67ef54c622788e11b33caab7d9da51ce07294512 # v0.5.2
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
      - uses: RexCode-Digital/shopify-upgrade-guard@b0a6816f95d783f703bf031c9920004fbb865bc1 # v0.2.6
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
      - uses: RexCode-Digital/shopify-scope-guard@30d08c644114399c0ee0257954205b97fb9fcbd3 # v0.2.4
        with:
          fail-on: high

  app-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: RexCode-Digital/shopify-app-review-guard@14aa6c92d68c3f52ea06e8bb608328ce19f998d7 # v0.1.5
        with:
          format: human
          fail-on: high
```

ChangeGuard reviews semantic changes to Shopify app configuration. Upgrade Guard checks documented API migration risks against the selected target version and, with `fail-on-new`, only applies the threshold to findings introduced by the pull request. Scope Guard compares Admin GraphQL evidence with declared OAuth scopes. App Review Guard reports repository checks and manual submission items that static analysis cannot verify.

The four checks are independent. Set each threshold to match the repository's review policy; review output before raising a gate. None of these tools validates a live store, replaces Shopify CLI schema checks, or approves a deployment. Do not change this workflow to `pull_request_target` to run checks on fork changes.
