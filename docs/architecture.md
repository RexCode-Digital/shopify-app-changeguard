# Architecture

TypeScript comparison modules parse only supported parts of a TOML object. `core.ts` orchestrates deterministic rules for scopes, app settings, IDs, URLs, access, customer authentication, app proxy, POS, preferences, discovery directories, webhooks, and Events subscriptions. Rule metadata is kept in the small `rule-catalog.ts` catalogue. `git-refs.ts` reads committed blobs through argument-array Git calls. The PR review runner discovers changed `shopify.app*.toml` files, deliberately handles additions/deletions/renames, and fails closed for malformed supported files.

The CLI remains a normal npm package. `scripts/write-version.mjs` generates the CLI version from `package.json` before TypeScript compilation, so prerelease builds and stable packages cannot drift. `src/action.ts` is bundled with ncc into `dist/action/index.js`, the committed GitHub Action entry point. The Action and local PR runner share the same review implementation and summary model.
