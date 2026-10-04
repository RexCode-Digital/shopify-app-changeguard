# Maintainer runbook

1. Check issues and open pull requests for duplicate work before starting a substantial change.
2. Run `npm ci --ignore-scripts`, `npm test`, `npm run lint`, `npm audit`, `npm run package:check`, and `npm run action:check`.
3. Review every changed line, generated Action distribution, redaction path, and workflow permission.
4. Update `CHANGELOG.md` and version metadata together. Use an explicit tag and release; do not publish on every merge.
5. For the initial package publication, bootstrap npm Trusted Publishing in this order. First merge the reviewed change, verify merged `main` CI and the first Scorecard run, and create a clean temporary copy of merged `main`. In that disposable copy only, set the package version to `0.2.0-beta.0` without committing it, then publish the bootstrap package manually:

   ```sh
   npm version 0.2.0-beta.0 --no-git-tag-version
   npm test
   npm pkg delete publishConfig.provenance
   npm publish --access public --tag bootstrap
   ```

   This one-off publication may require interactive npm authentication and 2FA. It must use the `bootstrap` dist-tag, never `latest`, and the version in the repository must remain unchanged. Removing `publishConfig.provenance` is disposable-copy-only because local npm is not a GitHub Actions OIDC provider; the real release keeps that setting and uses GitHub OIDC provenance.

   Confirm that the package exists on npm and that `latest` was not changed. Then configure the package's Trusted Publisher with GitHub Actions: user/organization `RexCode-Digital`, repository `shopify-app-changeguard`, workflow filename `release.yml`, blank environment, and direct `npm publish` allowed. Verify that `package.json.repository.url` exactly matches the GitHub repository before creating the stable release tag. After the repository transfer, verify the npm Trusted Publisher is configured for the `RexCode-Digital` organization, this repository, and `release.yml`. Before the next justified release, verify npm Trusted Publisher configuration and canonical package metadata together. Metadata-only maintenance does not require a publication.
6. For the Action, regenerate `dist/action`, verify the source/distribution check, and update a major tag only after a real stable 1.x release.
7. Roll back by moving consumers to a previously reviewed full commit SHA and, if needed, deprecating the affected npm version. Never delete evidence or rewrite released tags.
