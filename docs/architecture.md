# Architecture

TypeScript comparison modules parse only supported parts of a TOML object. `core.ts` orchestrates deterministic rules for scopes, app settings, IDs, URLs, webhooks, and Events subscriptions. `git-refs.ts` reads committed blobs through argument-array Git calls. The PR review runner discovers changed `shopify.app*.toml` files and fails closed for unsupported file states.

The CLI remains a normal npm package. `src/action.ts` is bundled with ncc into `dist/action/index.js`, the committed GitHub Action entry point. The Action and local PR runner share the same review implementation and summary model.
