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

Create and check a baseline from the same kind of comparison:

```sh
changeguard baseline create --baseline changeguard-baseline.json --base-ref main --head-ref HEAD --all-configs
changeguard baseline check --baseline changeguard-baseline.json --base-ref main --head-ref HEAD --all-configs --fail-on-new
```

The repository includes a valid example baseline at [`docs/examples/changeguard-baseline.json`](examples/changeguard-baseline.json), generated from the synthetic before/after configuration pair in `examples/`.

`baseline create` accepts a configuration pair, one Git-selected file, or `--all-configs`. It writes a versioned JSON file and will not overwrite an existing destination. Creation stops if any selected configuration could not be analysed. `baseline check` uses the same comparison options and adds `NEW`, `EXISTING`, and `RESOLVED` lifecycle metadata. The shorthand `--baseline FILE` on an existing comparison command also checks that baseline.

Baselines contain only a schema version, comparison kind, grouped finding fingerprints, rule IDs, safe repository-relative configuration paths, fields, risk levels, and duplicate counts. They omit commit IDs, timestamps, absolute paths, finding summaries, and raw configuration values. A renamed file is a new identity: findings at the old path resolve and findings at the new path are new. For an explicit before/after comparison outside the repository, pass `--config-path` with a repository-relative identity.

The repository-wide mode discovers `shopify.app.toml` and named
`shopify.app.<config-name>.toml` files, reviews additions, deletions, renames,
and modifications, and caps a single review at 50 changed configuration files.

`--json` remains an alias for `--format json`. Markdown reports include the review summary, risk counts and rationales, per-file findings, suggested review actions, incomplete review warnings, and official evidence links.

`--fail-on never` and `--fail-on-risk none` are the compatibility defaults. `review` exits 1 when findings exist; a non-`none` risk threshold independently exits 1 when a finding reaches that level. Under `review` or `unreviewed`, an incomplete Git review exits 2. Under `never`, incomplete files remain listed in the report and do not fail unless the independent risk threshold is met.

Repository-wide output groups findings by configuration path. It does not infer deployment environments from filenames. Invalid input, malformed TOML, missing files, and unsafe Git changes exit 2. Output is deterministic and findings do not include protected configuration values.

JSON findings include `riskLevel` (`low`, `medium`, or `high`) and `riskRationale`. Human-readable Git-range output prefixes each finding with its risk level. Risk is deterministic review guidance; it does not change exit codes or mean that a configuration is valid or approved.

`--fail-on-new` fails only when the current report contains a new finding. `--fail-on` and `--fail-on-risk` still apply to all current findings, including existing high-risk findings. Incomplete Git reviews fail with exit code 2 under `--fail-on-new`. Missing, malformed, unsupported-version, symlinked, or out-of-repository baselines fail closed with exit code 2.

When `--fail-on-new` is used without `--baseline`, the selected comparison is checked against an empty baseline, so every current finding is new. This does not create or write a baseline file.
