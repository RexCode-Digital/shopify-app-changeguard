# Changelog

All notable changes to ChangeGuard are documented here. The project follows Semantic Versioning while it remains in the 0.x phase.

## [0.5.0] - 2026-09-30

### Added

- Deterministic `low`, `medium`, and `high` risk levels with rationale for every supported finding.
- Risk counts in the GitHub Action summary and a `highest_risk` Action output for automation.
- Risk labels in CLI review output while preserving existing rule IDs, exit codes, and `severity: "review"` compatibility.

### Security and privacy

- Risk classification is category-based review guidance, not Shopify validation or a security approval.
- Existing redaction behaviour remains unchanged; sensitive configuration values are still excluded from findings and summaries.

## [0.4.2] - 2026-09-27

### Correctness

- Completed explicit metadata for every production rule, including official documentation links and redaction expectations.
- Added catalogue completeness tests so emitted rule IDs and catalogue entries cannot drift silently.
- Refreshed current Action references and corrected the roadmap/support matrix after the v0.4.1 audit.

## [0.4.1] - 2026-09-27

### Documentation and packaging

- Refreshed public installation guidance and immutable Action references after the v0.4.0 release.
- Published the corrected package metadata and README with GitHub Actions provenance.

## [0.4.0] - 2026-09-27

### Added

- Semantic review for app identity, Admin Direct API access, Customer Account authentication, app proxies, POS, app preferences, project discovery directories, and development URL policy.
- First-class added, removed, and renamed named `shopify.app*.toml` lifecycle findings.
- Repository-wide Git review through the CLI's `--all-configs` mode.
- Typed rule metadata, support matrix, documentation links, and additional Action outputs.
- Build-time CLI version synchronization from `package.json`.

### Security and privacy

- Action workflow-command-looking TOML-derived text is no longer printed to raw stdout.
- New URL and routing rules report counts and semantic descriptions without exposing destinations or origins.

### Compatibility

- Existing comparison flags, report schema version, exit codes, and rule IDs remain compatible.
- Node.js `>=20` remains supported.

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
