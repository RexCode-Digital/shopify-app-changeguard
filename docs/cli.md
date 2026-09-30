# CLI reference

Direct comparison:

```sh
changeguard --before BEFORE.toml --after AFTER.toml [--json] [--fail-on never|review|unreviewed]
```

Committed Git comparison:

```sh
changeguard --base-ref main --head-ref HEAD --file shopify.app.toml [--json]

Repository-wide Git comparison:

```sh
changeguard --base-ref main --head-ref HEAD --all-configs [--json] [--fail-on never|review|unreviewed]
```

The repository-wide mode discovers `shopify.app.toml` and named
`shopify.app.<config-name>.toml` files, reviews additions, deletions, renames,
and modifications, and caps a single review at 50 changed configuration files.
```

`--fail-on never` is the compatibility default. `review` exits 1 when findings exist. `unreviewed` exits 2 when a Git configuration cannot be reviewed. Invalid input, malformed TOML, missing files, and unsafe Git changes exit 2. Output is deterministic and findings do not include protected configuration values.

JSON findings include `riskLevel` (`low`, `medium`, or `high`) and `riskRationale`. Human-readable Git-range output prefixes each finding with its risk level. Risk is deterministic review guidance; it does not change exit codes or mean that a configuration is valid or approved.
