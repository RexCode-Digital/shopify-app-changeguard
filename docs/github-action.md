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
          - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
            with:
              fetch-depth: 0
              persist-credentials: false

          - uses: RexCode-Digital/shopify-app-changeguard@1ad900a2dc4d8b83305642611a89ea8eb30e165a # v0.7.0
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
`highest_risk`, `risk_threshold_exceeded`, and `report`. Set `fail_on` to
`never`, `review`, or `unreviewed`; the default fails only when review is
incomplete. The optional `fail_on_risk` input accepts `none`, `low`, `medium`,
or `high` and defaults to `none`. It adds an independent failure condition, so
either policy can fail the job. `fail_on: never` retains its existing meaning;
an incomplete result is exposed as `outcome: incomplete` even when the job is
allowed to continue.

Set `baseline_path` to a repository-relative versioned baseline JSON file to
classify findings as `NEW`, `EXISTING`, or `RESOLVED`. Set `fail_on_new: true`
to fail only on new findings. The existing `fail_on` and `fail_on_risk` policies
remain independent and still apply to existing findings. The Action exposes
`new_finding_count`, `existing_finding_count`, and `resolved_finding_count`
when `baseline_path` or `fail_on_new` enables classification; these outputs
are empty otherwise. With `fail_on_new: true` and no baseline file, all
findings in the selected comparison are new. Missing or invalid baseline
input fails the action. The Action reads the
baseline and does not write or update it.

The pinned v0.7.0 release supports `fail_on_risk` and `risk_threshold_exceeded`.

Review outcomes:

- No supported-field changes detected: the check succeeds.
- Manual review recommended: `fail_on: review` fails; `never` and `unreviewed` permit findings.
- Review incomplete: unreviewable configurations fail with `review` or `unreviewed`; `never` permits the incomplete result.

The job summary does not print configuration values, file paths or finding
descriptions. The `report` output contains structured finding details and
should be treated as repository-sensitive automation data.

Findings are also emitted as GitHub warning annotations tied to the changed
configuration file when that path is known. Annotations do not include an
invented source line or require write permissions.

For fork pull requests, use the normal `pull_request` event and keep
`contents: read`. Do not switch to `pull_request_target` merely to make
fork changes run. A reviewed immutable commit SHA is safer than a floating
branch because the Action code cannot change underneath a consumer run.

This experimental tool does not certify security or approve deployment.
