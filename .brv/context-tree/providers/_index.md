---
children_hash: 16539d56c8f47dcf0f67b4b6c04792a07e427a2705bc22ae0bbfad6197cc23a0
compression_ratio: 0.6842105263157895
condensation_order: 2
covers: [context.md, copilot_provider/_index.md]
covers_token_total: 703
summary_level: d2
token_count: 481
type: summary
---
## Domain: providers (Copilot Provider)
- **Purpose & Scope:** Documents how `CopilotProvider` handles GitHub Copilot usage retrieval, quota calculations, and optional Playwright scraping for premium customers; excludes general OAuth flows or other providers.
- **Ownership & Usage:** Maintained by the Insights Team; serves as authoritative reference for diagnosing fetch failures or extending quota reporting.

### Copilot Provider Structure & Flow (covers `copilot_provider/context.md` + `copilot_provider_data_fetch_flow.md`)
- **Architecture:** `CopilotProvider` extends `ProviderBase` with `isAvailable`, `fetch`, `fetchViaAPI`, and `fetchModelTable`, ensuring a saved GitHub token before delegating quota parsing and optional model table enrichment. Reference `copilot_provider/context.md` for implementation details.
- **API Integration:** Uses `CONFIG.api.copilot.user` via axios GET, applies required Copilot headers (`Editor-Version`, `Editor-Plugin-Version`, `User-Agent`, `X-Github-Api-Version`), and converts missing tokens into error snapshots without throwing. Detailed flow in `copilot_provider_data_fetch_flow.md`.
- **Quota Math:** Parses `premium_interactions` data into `remainingPct`, `usedPct`, `requestsUsed`, `requestsTotal`, and reset windows, then constructs the `ProviderSnapshot`. Calculations: `usedPct = Math.round(100 - percent_remaining)` and `remaining = entitlement - remaining_amount`.
- **Playwright Scraping:** If `CONFIG.githubCustomerId` is set, headless Chromium (`playwright-core`, `--no-first-run`) scrapes the billing model table, mapping rows to `ModelUsage` entries (`name`, `requests`, `grossUsd`, `billedUsd`). This optional enrichment is described in `copilot_provider_data_fetch_flow.md`.
- **Resilience & Logging:** API or scraping failures trigger warning logs and fallback metadata snapshots per prescribed rules; see `copilot_provider_data_fetch_flow.md` for behavior.