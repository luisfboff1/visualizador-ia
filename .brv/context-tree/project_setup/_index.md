---
children_hash: d5820a13ad2fc778a8ff9469ce8fbbd969f19ca6efac1003a6ed545e0485b088
compression_ratio: 0.6080246913580247
condensation_order: 2
covers: [context.md, pnpm_build_setup/_index.md, release_publishing/_index.md]
covers_token_total: 1620
summary_level: d2
token_count: 985
type: summary
---
# project_setup

## Domain purpose and scope
`project_setup/context.md` defines this domain as setup and packaging knowledge for getting a clean checkout of `visualizador-ia` to install, build, and publish correctly. It covers:
- pnpm dependency declarations needed for TypeScript/Electron runtime
- pnpm workspace/build-script settings under pnpm v10
- Electron Builder adjustments for Windows packaging
- TypeScript typing fixes affecting Playwright build success
- release publishing and updater behavior tied to packaged app versions

Excluded: runtime feature work unrelated to install/build/release mechanics.

## Topic map
- `pnpm_build_setup`
  - Source entries: `pnpm_build_setup/context.md`, `pnpm_build_setup/pnpm_install_and_build_fixes.md`
  - Focus: fresh checkout install/build/package fixes
- `release_publishing`
  - Source entries: `release_publishing/context.md`, `release_publishing/github_release_and_updater_flow.md`
  - Focus: GitHub release workflow and in-app update detection

## Core relationships
- Build/package correctness in `pnpm_build_setup` underpins optional installer generation referenced by `release_publishing`.
- `release_publishing` depends on packaged version metadata established during the build/package flow.
- Packaging details should be drilled into via `pnpm_build_setup`; release procedure and updater semantics via `release_publishing/github_release_and_updater_flow.md`.

## Architectural decisions across the domain
- Runtime-critical packages such as `playwright-core` and `sqlite3` must live in `package.json` `dependencies`, not only `devDependencies`, so install/build resolution succeeds (`pnpm_build_setup/pnpm_install_and_build_fixes.md`).
- pnpm v10 build scripts are explicitly allowed through `pnpm.onlyBuiltDependencies`; relevant packages must also be removed from `pnpm-workspace.yaml` `ignoredBuiltDependencies`.
- Windows packaging disables `electron-builder.win.signAndEditExecutable` in `electron-builder.yml` to avoid winCodeSign symlink failures.
- Release publication is decoupled from installer generation: GitHub Releases indicate version availability, while `pnpm run package` is only required when distributing a new `.exe`.
- The app updater is manual-download notification only; it does not self-apply updates.

## End-to-end flow
1. Fresh clone/install/build stability is established by dependency placement, pnpm build-script allowances, Electron Builder config, and Playwright typing workaround (`pnpm_build_setup`).
2. Packaging embeds the app version from `package.json` into the executable.
3. Release publishing bumps `package.json`, commits/pushes changes, then creates a GitHub Release with `gh release create vX.Y.Z --title "vX.Y.Z - Descrição" --notes "- O que mudou"` (`release_publishing/github_release_and_updater_flow.md`).
4. At runtime, the updater checks GitHub latest release metadata from:
   `https://api.github.com/repos/luisfboff1/visualizador-ia/releases/latest`
5. The app compares GitHub `tag_name` against the packaged executable version and shows either:
   - yellow update banner with `Baixar` opening the release page
   - green “already current” banner for 4 seconds

## Key preserved facts
- `RELEASE.md` documents the release procedure.
- `package.json` version bump is required before publishing.
- `pnpm run package` is optional unless a fresh installer must be manually distributed.
- A newly packaged `.exe` with the same version as the latest release will appear up to date.
- Best updater test pattern: keep an older `.exe`, publish a newer GitHub release, then open the older executable.

## Drill-down guide
- For install/build/package fixes and exact config changes, read `pnpm_build_setup/_index.md` and `pnpm_build_setup/pnpm_install_and_build_fixes.md`.
- For release workflow, updater behavior, and testing constraints, read `release_publishing/_index.md` and `release_publishing/github_release_and_updater_flow.md`.