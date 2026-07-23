# ggaction Node PNG report workflow

This local candidate shows a normal Node.js consumer producing two static PNG
charts and one sanitized action report from exact public `ggaction@0.0.6`. It
is a workflow example, not a bundled GitHub Action, package, or release.

## Run locally

Use Node.js 20 or later:

```bash
npm ci
npm test
npm run report -- --output artifacts/ggaction-report
```

The report command refuses to overwrite any target and writes exactly:

```text
artifacts/ggaction-report/
  base.png
  revised.png
  report.json
```

`base.png` comes from an immutable four-action program. `revised.png` comes
from an independent fifth-action revision that changes point opacity. The
runner renders the base twice in the same process and requires the two byte
streams to match; it also requires the revision to differ.

## Use in GitHub Actions

Copy `workflow.yml` to `.github/workflows/ggaction-report.yml` in a repository
containing these source files and lockfile. The inert template checks Node 20
and 22 on fixed Ubuntu 22.04 and 24.04 images, then uploads only the three
expected files with `actions/upload-artifact@v4`.

Each matrix cell proves determinism only within its own clean install and
runner. Native Canvas output can vary across Node versions, operating systems,
architectures, native-library releases, and font environments. Do not compare
hashes between matrix cells or advertise cross-platform byte identity.

## Artifact contract

`report.json` has `schemaVersion: 1`, exact renderer identity, the immutable
base/revision relationship, and deterministic chart metadata. Each chart
contains logical and physical dimensions, bytes, SHA-256, action counts, and
an operation-only trace:

```json
{
  "op": "createScatterPlot",
  "children": []
}
```

The report intentionally excludes trace arguments, descriptions, source rows,
absolute paths, timestamps, environment variables, hostnames, runner IDs, and
Git metadata.

## Privacy boundary

Raw `program.trace` arguments may contain complete datasets, labels, field
names, annotations, or other sensitive inputs. Do not replace the sanitized
operation tree with raw trace JSON without reviewing and redacting it. Treat
uploaded workflow artifacts as exported project data and upload only the three
expected files, not an entire working directory.

This example uses small synthetic inline rows. It reads no user files, tokens,
or environment variables.

## Why this is not a bundled Action

The workflow runs ordinary checked-in JavaScript after `npm ci`, so npm selects
the correct native Canvas asset for each runner. It has no `action.yml`,
prebuilt `dist`, caller-specified module loader, Marketplace listing, tag, or
custom artifact transport. This avoids the native-bundle and multi-architecture
distribution problems of the rejected local bundled-Action prototype.
