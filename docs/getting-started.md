# Getting started

## CLI

The `0.2.0` npm package is published with GitHub Actions provenance. Install it
as a development dependency:

```sh
npm install --save-dev shopify-app-changeguard
npx changeguard --before path/to/before.toml --after path/to/after.toml
```

Use `--json` for automation. Use `--fail-on review` when findings should make a local or CI command exit 1. Input errors and unreviewable Git changes exit 2.

## GitHub Action

Use a pull-request workflow with `contents: read`, checkout full history with persisted credentials disabled, and pin ChangeGuard to a reviewed full commit SHA. The Action is self-contained and does not need Shopify credentials, npm installation, or network access.

See [the complete Action guide](github-action.md) and [the rules reference](rules.md).
