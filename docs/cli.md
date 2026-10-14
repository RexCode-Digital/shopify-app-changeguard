# CLI reference

Direct comparison:

```sh
changeguard --before BEFORE.toml --after AFTER.toml [--format human|json|markdown] [--fail-on never|review|unreviewed] [--fail-on-risk none|low|medium|high]
```

Committed Git comparison:

```sh
changeguard --base-ref main --head-ref HEAD --file shopify.app.toml [--format human|json|markdown]
```

Repository-wide Git comparison:

```sh
changeguard --base-ref main --head-ref HEAD --all-configs [--format human|json|markdown] [--fail-on never|review|unreviewed] [--fail-on-risk none|low|medium|high]
```

The repository-wide mode discovers `shopify.app.toml` and named
`shopify.app.<config-name>.toml` files, reviews additions, deletions, renames,
and modifications, and caps a single review at 50 changed configuration files.

`--json` remains an alias for `--format json`. Markdown reports include the review summary, risk counts and rationales, per-file findings, suggested review actions, incomplete review warnings, and official evidence links.

`--fail-on never` and `--fail-on-risk none` are the compatibility defaults. `review` exits 1 when findings exist; a non-`none` risk threshold independently exits 1 when a finding reaches that level. Under `review` or `unreviewed`, an incomplete Git review exits 2. Under `never`, incomplete files remain listed in the report and do not fail unless the independent risk threshold is met.

Repository-wide output groups findings by configuration path. It does not infer deployment environments from filenames. Invalid input, malformed TOML, missing files, and unsafe Git changes exit 2. Output is deterministic and findings do not include protected configuration values.

JSON findings include `riskLevel` (`low`, `medium`, or `high`) and `riskRationale`. Human-readable Git-range output prefixes each finding with its risk level. Risk is deterministic review guidance; it does not change exit codes or mean that a configuration is valid or approved.
