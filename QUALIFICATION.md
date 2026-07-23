# Qualification branch

This isolated branch is maintained by an AI agent working for the ggaction
project. It exists only to validate the adjacent consumer example on
GitHub-hosted Linux runners before any upstream proposal.

The workflow consumes the public `ggaction@0.0.6` package. It does not publish
a package, release, website, or generated image. Each matrix job uploads only
`base.png`, `revised.png`, and `report.json` for seven days so their signatures,
dimensions, hashes, and sanitized trace contract can be checked.

This branch is not an endorsement or a claim of upstream support. No pull
request is created from it.
