---
children_hash: 7a07fbb06c2b7957281c21fdfce7abc3b6452ab25fc97e02630c32c5c19dba14
compression_ratio: 0.7228766274023558
condensation_order: 3
covers: [project_setup/_index.md, providers/_index.md]
covers_token_total: 1613
summary_level: d3
token_count: 1166
type: summary
---
# Structural Summary

## project_setup
Covers install/build/package/release mechanics for `visualizador-ia`, not runtime product features. This domain is organized around two linked topics: `pnpm_build_setup` for fresh-checkout build stability and `release_publishing` for version publication and updater behavior.

### Topic relationships
- `pnpm_build_setup` establishes dependency, pnpm, Electron Builder, and TypeScript conditions required for a successful install/build/package flow.
- `release_publishing` builds on that packaged output, using the app version embedded from `package.json` to determine GitHub release visibility and updater status.

### Key architectural decisions
- Runtime-required packages such as `playwright-core` and `sqlite3` must be in `package.json` `dependencies`, not just `devDependencies`. See `pnpm_build_setup/pnpm_install_and_build_fixes.md`.
- Under pnpm v10, build scripts must be explicitly allowed through `pnpm.onlyBuiltDependencies`, and conflicting entries removed from `pnpm-workspace.yaml` `ignoredBuiltDependencies`.
- Windows packaging disables `electron-builder.win.signAndEditExecutable` in `electron-builder.yml` to avoid `winCodeSign` symlink failures.
- Release publication is separate from installer generation: publishing a GitHub release announces a version; `pnpm run package` is only needed when distributing a new `.exe`.
- The updater is notification-only: it checks for newer releases and opens the download page, but does not self-install.

### End-to-end flow
1. Stabilize local build/package behavior via `pnpm_build_setup`.
2. Package the app so the executable carries the `package.json` version.
3. Publish a release by bumping `package.json`, committing/pushing, then running:
   `gh release create vX.Y.Z --title "vX.Y.Z - Descrição" --notes "- O que mudou"`
4. Runtime updater checks:
   `https://api.github.com/repos/luisfboff1/visualizador-ia/releases/latest`
5. App compares GitHub `tag_name` with packaged version and shows either:
   - update banner with `Baixar` linking to the release page
   - temporary “already current” confirmation

### Preserved operational facts
- `RELEASE.md` documents the release process.
- Version bump in `package.json` is required before publishing.
- A freshly packaged `.exe` with the same version as the latest GitHub release will appear current.
- Best updater test path: keep an older `.exe`, publish a newer release, then launch the older binary.

### Drill-down
- Build/package specifics: `pnpm_build_setup/_index.md`, `pnpm_build_setup/pnpm_install_and_build_fixes.md`
- Release/updater specifics: `release_publishing/_index.md`, `release_publishing/github_release_and_updater_flow.md`

---

## providers
Documents provider-specific usage retrieval, currently centered on the Copilot integration. Scope is quota retrieval, usage normalization, and optional billing-table enrichment, not generic auth or unrelated providers.

### Copilot provider architecture
From `copilot_provider/context.md` and `copilot_provider_data_fetch_flow.md`:
- `CopilotProvider` extends `ProviderBase`.
- Main interface methods: `isAvailable`, `fetch`, `fetchViaAPI`, `fetchModelTable`.
- Flow starts by requiring a saved GitHub token, then fetching usage data, computing quota metrics, and optionally enriching results with model-level billing data.

### API integration and parsing
- Calls `CONFIG.api.copilot.user` via axios `GET`.
- Sends required Copilot headers:
  - `Editor-Version`
  - `Editor-Plugin-Version`
  - `User-Agent`
  - `X-Github-Api-Version`
- Missing tokens are converted into error snapshots rather than thrown exceptions.
- Quota parsing produces normalized snapshot fields including:
  - `remainingPct`
  - `usedPct`
  - `requestsUsed`
  - `requestsTotal`
  - reset-window metadata

### Quota math
- `usedPct = Math.round(100 - percent_remaining)`
- `remaining = entitlement - remaining_amount`
- `premium_interactions` data is the basis for deriving consumption and remaining capacity in the final `ProviderSnapshot`.

### Optional Playwright enrichment
- If `CONFIG.githubCustomerId` exists, the provider launches headless Chromium using `playwright-core` with `--no-first-run`.
- It scrapes the GitHub billing model table and maps rows into `ModelUsage` records:
  - `name`
  - `requests`
  - `grossUsd`
  - `billedUsd`

### Resilience pattern
- API failures or scraping failures produce warning logs and fallback metadata snapshots rather than breaking the overall provider flow.

### Drill-down
- Core implementation overview: `copilot_provider/context.md`
- Detailed fetch, parsing, and scraping behavior: `copilot_provider_data_fetch_flow.md`