---
children_hash: 5d89fb83177d27fae250470f3d7bea5d909c6d7c65d06f1f1f51a6f26b0a5348
compression_ratio: 0.5160116448326055
condensation_order: 1
covers: [context.md, github_release_and_updater_flow.md]
covers_token_total: 1374
summary_level: d1
token_count: 709
type: summary
---
# release_publishing

Structural overview of how Visualizador IA publishes versions and how the in-app updater detects them. For detailed procedure and exact rules, drill into `github_release_and_updater_flow.md`.

## Scope
- Release publishing is centered on:
  - `package.json` version bumps
  - GitHub Releases created with `gh release create`
  - Optional installer generation via `pnpm run package`
  - Updater checks against GitHub latest release metadata
- Primary source files:
  - `RELEASE.md`
  - `package.json`

## Core relationship
- `context.md` defines the topic scope.
- `github_release_and_updater_flow.md` contains the operational workflow, rules, updater behavior, and test method.
- Related topic:
  - `project_setup/pnpm_build_setup/context.md` for packaging/build details behind executable generation.

## Release model
- Architectural decision: GitHub Releases are used as the updater’s version marker, not as proof that a new `.exe` was built.
- Publishing flow:
  - edit code in `src/`
  - bump `package.json` version
  - `git add .` / commit / push
  - create release with `gh release create vX.Y.Z --title "vX.Y.Z - Descrição" --notes "- O que mudou"`
- Installer generation is intentionally decoupled:
  - `pnpm run package` is only needed when distributing a fresh installer manually.
  - A new release can be published without generating a new executable.

## Updater behavior
From `github_release_and_updater_flow.md`:

- Source of truth:
  - GitHub API endpoint:
    `https://api.github.com/repos/luisfboff1/visualizador-ia/releases/latest`
- Comparison logic:
  - compare GitHub `tag_name` vs version embedded in the current `.exe`
  - embedded executable version comes from `package.json` at packaging time
- UI outcomes:
  - newer version found → yellow banner with download action (`Baixar`) that opens the release page in the browser
  - already current → green banner shown for 4 seconds
- Important limitation:
  - the app does not self-update or patch in place
  - updater is notification + manual download only

## Testing pattern
- Recommended validation method in `github_release_and_updater_flow.md`:
  - keep an older `.exe`
  - create a newer GitHub release
  - open the old executable to trigger update detection
- Key constraint:
  - if a newly packaged `.exe` has the same version as the published release, the app reports it is already updated
  - therefore updater testing should use an older executable build

## Key facts preserved
- Version bump in `package.json` is required before publishing.
- `RELEASE.md` is the documented release procedure location.
- GitHub Release creation and `.exe` generation are separate concerns.
- Updater compares `tag_name` from latest release to the packaged app version.
- New installer creation is optional unless manual redistribution is needed.