# Maintainer runbook

1. Check issues and open pull requests for duplicate work before starting a substantial change.
2. Run `npm ci --ignore-scripts`, `npm test`, `npm run lint`, `npm audit`, `npm run package:check`, and `npm run action:check`.
3. Review every changed line, generated Action distribution, redaction path, and workflow permission.
4. Update `CHANGELOG.md` and version metadata together. Use an explicit tag and release; do not publish on every merge.
5. For npm, configure trusted publishing/OIDC on npm and publish with provenance only after the package smoke test passes.
6. For the Action, regenerate `dist/action`, verify the source/distribution check, and update a major tag only after a real stable 1.x release.
7. Roll back by moving consumers to a previously reviewed full commit SHA and, if needed, deprecating the affected npm version. Never delete evidence or rewrite released tags.
