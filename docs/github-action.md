# Install ChangeGuard in another repository

Create `.github/workflows/changeguard.yml` in your Shopify app repository
with the following contents:

    name: Shopify configuration review

    on:
      pull_request:

    permissions:
      contents: read

    jobs:
      review:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09
            with:
              fetch-depth: 0
              persist-credentials: false

          - uses: efegokdemir/shopify-app-changeguard@1fee675575e3dfbbe2c8d702323aa7c4240efcb1 # v0.5.0
            with:
              base_sha: ${{ github.event.pull_request.base.sha }}
              head_sha: ${{ github.event.pull_request.head.sha }}
              fail_on: review

The full commit SHA pins the reviewed Action version. The Action is a committed Node.js 24 bundle; the consuming repository does not install npm dependencies or compile ChangeGuard.

No Shopify credentials or npm installation are required in the
consuming repository.

The Action reviews changed Shopify app TOML files and writes a job summary
containing counts, rule IDs, documentation links, and an explicit review
status. It keeps TOML-derived text out of raw workflow-command output and
exposes the structured report through outputs: `outcome`, `finding_count`,
`reviewed_file_count`, `unreviewed_count`, `rule_ids`, `highest_severity`, and
`highest_risk`,
and `report`. Set `fail_on`
to `never`, `review`, or `unreviewed`; the default fails only when review
is incomplete.

Review outcomes:

- No supported-field changes detected: the check succeeds.
- Manual review recommended: findings are informational and the check succeeds.
- Review incomplete: unreviewable configurations cause the check to fail.

The job summary does not print configuration values, file paths or finding
descriptions. The `report` output contains structured finding details and
should be treated as repository-sensitive automation data.

## External integration validation

On 17 September 2026, this pinned Action commit was exercised in a
separate private test repository using synthetic Shopify configurations.

The validation covered:

- A changed configuration with five findings. The Action succeeded and
  displayed the Manual review recommended status.
- A deliberately malformed TOML configuration. The Action exited with
  code 2 and displayed Review incomplete with one unreviewable file.

These tests validate the two scenarios described above. They are not a
security audit, deployment approval or guarantee for other repositories.

For fork pull requests, use the normal `pull_request` event and keep
`contents: read`. Do not switch to `pull_request_target` merely to make
fork changes run. A reviewed immutable commit SHA is safer than a floating
branch because the Action code cannot change underneath a consumer run.

This experimental tool does not certify security or approve deployment.
