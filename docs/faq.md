# FAQ

### Is ChangeGuard an official Shopify product?

No. It is an unofficial open-source tool and makes no Shopify endorsement or certification claim.

### Does a clean report approve deployment?

No. It means only that no supported semantic change was found in the compared input.

### Does ChangeGuard contact Shopify?

No. The CLI and Action are offline and read-only.

### How are Events configuration changes reported?

ChangeGuard reports changes to the documented `[events].api_version` and `[[events.subscription]]` structure. It redacts handles, destinations, topics, triggers, queries, and filters from findings. Shopify Events is generally available with API version `2026-10`. A finding requests review; it does not validate Shopify deployment acceptance.
