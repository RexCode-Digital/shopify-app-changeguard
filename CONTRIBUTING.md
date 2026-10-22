# Contributing to ChangeGuard

Contributions are welcome around semantic Shopify app configuration review, risk explanations, path/ref safety, privacy-preserving redaction, and deterministic fixtures.

This project is MIT licensed. You retain copyright in your contributions and confirm you have the right to submit them. Identify third-party code and assets with their applicable licences.

Use Node.js 22 or newer. Install the locked dependencies and run the relevant checks before opening a pull request:

```sh
npm ci
npm test
npm run coverage
npm run lint
npm audit
npm run package:check
npm run package:smoke
npm run action:check
npm run format:check
```

Add a regression test for each behaviour change. Keep fixtures synthetic and sanitised. Link current official Shopify evidence for Shopify-specific rules or mappings, and include a negative case where static detection could otherwise produce a false positive. Keep output deterministic and preserve the product's uncertainty and privacy boundaries.

The project follows a solo-maintainer review model. Use a focused pull request and record the checks actually run. Human approval is not a branch-protection requirement; automated checks remain required. AI-assisted contributions are welcome. Contributors are responsible for reviewing and understanding every submitted change.

Read the shared [RexCode Open Source standards](https://github.com/RexCode-Digital/.github/blob/main/docs/oss/standards.md). For security reports, use [SECURITY.md](SECURITY.md); for safe usage questions, use [SUPPORT.md](SUPPORT.md).