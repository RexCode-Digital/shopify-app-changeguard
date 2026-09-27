# Changelog

All notable changes to ChangeGuard are documented here. The project follows Semantic Versioning while it remains in the 0.x phase.

## [0.3.0] - 2026-09-27

### Added

- Evidence-backed review findings for Shopify Events API version and subscription changes.
- A deterministic synthetic Action fixture exercised across Ubuntu, macOS, and Windows in the supported Node matrix.

### Security and privacy

- Events handles, destinations, topics, triggers, queries, and filters remain redacted from findings.
- No telemetry, Shopify access, or new network behavior was added.

### Compatibility

- Existing CLI flags, exit codes, Action inputs/outputs, report schema, and rule IDs remain backward compatible.
- Node.js `>=20` remains supported.

## [0.2.1] - 2026-09-27

### Documentation

- Refreshed the npm package documentation to reflect the public release and tested installation path.

## [0.2.0] - 2026-09-27

### Added

- Bundled Node 24 GitHub Action distribution with outputs and configurable failure policy.
- CLI `--help`, `--version`, and `--fail-on` options.
- Review rules for app `embedded`, `handle`, and legacy install-flow changes.
- npm packaging metadata, provenance configuration, and package validation scripts.

### Changed

- Action consumers no longer install dependencies or compile ChangeGuard at workflow runtime.
- Summary rendering is shared by the local PR runner and bundled Action.

### Security

- Updated Action build dependencies and verified the full dependency audit is clean.

## [Unreleased]

Future changes will be recorded here before the next release.

## [0.1.2]

The 0.1.2 release notes are preserved in [docs/releases/v0.1.2.md](docs/releases/v0.1.2.md). It introduced the experimental Action review workflow, redacted findings, Git revision comparison, webhook checks, and the existing 70-test baseline.

## [0.1.1] / [0.1.0]

See the GitHub release history for the authoritative notes for these releases.
