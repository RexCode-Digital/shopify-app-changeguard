# Threat model

ChangeGuard reviews committed Shopify app TOML in local or GitHub Actions environments. It does not connect to Shopify and does not modify the repository.

## Assets and boundaries

- Repository history, configuration structure, and review output are the primary assets.
- A consuming workflow grants the Action `contents: read`; the Action does not need write access.
- Pull request configuration is untrusted input. Git refs and file paths are passed to Git argument APIs, not a shell.
- Dependencies and the committed bundled Action are supply-chain assets.

## Attacker goals and mitigations

An attacker may try to execute through a malicious ref or path, cause denial of service with oversized input, exfiltrate configuration through findings or errors, or make a change appear reviewed when it was not. Commit SHA validation, repository-relative paths, file-size limits, `--` separators, redacted findings, fail-closed parsing, a bundled Action, least-privilege permissions, and regression tests address these risks.

## Known limitations

ChangeGuard does not prove that Shopify will accept a configuration, that a URL is deployed securely, that scopes are justified by application code, or that webhook handlers verify signatures. A clean report means only that no supported semantic change was found in the compared input.
