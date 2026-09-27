# Troubleshooting

## “Unable to read the requested Git revision or file”

Run the CLI inside the target Git repository. Use committed revision names or full commit SHAs, a repository-relative file path, and a checkout with the required history. The Git comparison intentionally ignores uncommitted changes.

## The Action reports an incomplete review

Check that the workflow uses `fetch-depth: 0`, passes the pull request base and head SHAs, and did not add, delete, rename, or leave malformed a supported `shopify.app*.toml` file. The Action fails closed rather than treating an unreadable configuration as safe.

## A finding does not contain the changed value

That is intentional. Client IDs, URLs, webhook destinations, topics, filters, and included field names are omitted to reduce accidental disclosure. Review the source change directly.
