# Contributing to ChangeGuard

Thank you for your interest in contributing.

Before starting:
- Check existing issues and pull requests for duplicate work.
- Keep pull requests focused and explain any Shopify documentation relied on.
- Never commit real credentials or private Shopify configurations.

Development:

    npm ci --ignore-scripts
    npm test
    npm run lint
    npm audit
    npm run package:check
    npm run action:check

Include regression tests for bug fixes and comparison rules. Rule changes
should cover a positive change, an unchanged case, ordering where relevant,
and redaction of sensitive values.

The supported development runtime is Node.js 20 or newer. The CI workflow
tests Node 20, 22, and 24. Use `npm run build` to regenerate the committed
Action bundle, then ensure `git diff --exit-code -- dist/action` is clean
after a second build.

Unsupported or malformed configuration must not be reported as clean. Do
not add telemetry, Shopify network calls, credentials, or shell-interpolated
Git commands.

In pull requests, explain the problem, your solution and test results.

ChangeGuard is experimental and does not certify Shopify compliance,
security or deployment safety.
