# CLI reference

Direct comparison:

```sh
changeguard --before BEFORE.toml --after AFTER.toml [--json] [--fail-on never|review|unreviewed]
```

Committed Git comparison:

```sh
changeguard --base-ref main --head-ref HEAD --file shopify.app.toml [--json]
```

`--fail-on never` is the compatibility default. `review` exits 1 when findings exist. `unreviewed` is equivalent for direct comparisons and is reserved for Action policy. Invalid input, malformed TOML, missing files, and unreviewable Git changes exit 2. Output is deterministic and findings do not include protected configuration values.
