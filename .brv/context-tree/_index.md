---
children_hash: d0b0071f3195c8419a228ef32f18659099d5e12e882fadfbc81b3b8b0253fa65
compression_ratio: 0.5185185185185185
condensation_order: 3
covers: [project_setup/_index.md, providers/_index.md]
covers_token_total: 1215
summary_level: d3
token_count: 630
type: summary
---
# Structural Knowledge Summary (level d3)

## project_setup Domain
- **Purpose & Scope:** Supports clean `visualizador-ia` checkouts by documenting pnpm v10 dependency/build quirks, Electron Windows packaging, and Playwright typing workarounds (`context.md` + `pnpm_install_and_build_fixes.md`).
- **Key Facts & Flow:**
  - Runtime packages (`playwright-core`, `sqlite3`, `electron`) must live in `package.json` `dependencies`, and their lifecycle scripts must be allowed via `pnpm.onlyBuiltDependencies` while being removed from `ignoredBuiltDependencies` to satisfy pnpm v10 gating.
  - Electron Windows packages disable `signAndEditExecutable` in `electron-builder.yml` to avoid winCodeSign symlink failures during `pnpm package`.
  - Playwright `page.evaluate` callbacks are cast to `any` to satisfy Node-focused tsconfig while still executing browser DOM logic.
- **Process Overview:** Fresh clone → `pnpm install` now resolves Playwright/SQLite build hooks → `pnpm package` runs electron-builder with signing disabled → Playwright tests rely on typing casts. For detailed configuration snippets, see `context.md` and `pnpm_install_and_build_fixes.md`.

## providers Domain
- **Purpose & Scope:** Captures Copilot quota retrieval, optional scraping, and quota math; excludes general OAuth or other provider logic (`providers/context.md`, `copilot_provider/context.md`).
- **CopilotProvider Structure & Flow:**
  - Extends `ProviderBase` with `isAvailable`, `fetch`, `fetchViaAPI`, and `fetchModelTable`; requires a saved GitHub token before quota parsing (`copilot_provider/context.md`).
  - Hits `CONFIG.api.copilot.user` with axios plus Copilot-specific headers; failures emit warning logs and record snapshots rather than throwing (`copilot_provider_data_fetch_flow.md`).
  - Quota calculations translate `premium_interactions` into `remainingPct`, `usedPct`, `requestsUsed`, `requestsTotal`, and reset windows; `usedPct = Math.round(100 - percent_remaining)` and `remaining = entitlement - remaining_amount`.
  - Conditional Playwright scraping (when `CONFIG.githubCustomerId` exists) launches headless Chromium (`playwright-core`, `--no-first-run`) to harvest billing model tables into `ModelUsage` entries (`name`, `requests`, `grossUsd`, `billedUsd`) for enrichment; see `copilot_provider_data_fetch_flow.md` for control flow.
- **Resilience:** Both API and scraping errors are logged as warnings, with fallback metadata snapshots to keep quota reporting consistent (`copilot_provider_data_fetch_flow.md`).