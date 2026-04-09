---
children_hash: c138bf16131b537c372807fe57eef7cb091afdbccae8885afc4958b8f7b99f09
compression_ratio: 0.6071428571428571
condensation_order: 1
covers: [context.md, copilot_provider_data_fetch_flow.md]
covers_token_total: 784
summary_level: d1
token_count: 476
type: summary
---
### copilot_provider (context.md + copilot_provider_data_fetch_flow.md)
- **Overall Purpose:** Documents how `CopilotProvider` orchestrates GitHub Copilot quota and billing metadata retrieval, covering token validation, API integration, quota math, and optional Playwright-based model scraping.  
- **Provider Structure:** `CopilotProvider` extends `ProviderBase` with `isAvailable`, `fetch`, `fetchViaAPI`, and `fetchModelTable`. `fetch` ensures a saved GitHub token, delegates quota parsing to `fetchViaAPI`, and optionally enriches snapshots with `fetchModelTable` data when `CONFIG.githubCustomerId` exists.  
- **Data Flow (copilot_provider_data_fetch_flow.md):**  
  - Authorization via axios GET against `CONFIG.api.copilot.user`, converting missing tokens into error snapshots.  
  - Quota math parses `premium_interactions` snapshots into `remainingPct`, `usedPct`, `requestsUsed`, `requestsTotal`, and reset windows before constructing the `ProviderSnapshot`.  
  - When `githubCustomerId` is configured, `fetchModelTable` launches `playwright-core` Chromium (`--no-first-run`) to scrape the billing model table, mapping each row into `ModelUsage` entries with `name`, `requests`, `grossUsd`, and `billedUsd`.  
  - Failures in API calls or Playwright scraping log warnings (per rule) and fall back to vendor metadata snapshots without throwing.  
- **Dependencies & Facts:**  
  - Relies on axios, `loadConfig`, `CONFIG.api` endpoints, and `playwright-core` for optional scraping.  
  - Requests include specific Copilot headers (`Editor-Version`, `Editor-Plugin-Version`, `User-Agent`, `X-Github-Api-Version`).  
  - Quota calculations compute `usedPct` as `Math.round(100 - percent_remaining)` and derive `remaining` via entitlement minus remaining.  
  - Playwright scraping is gated by `CONFIG.githubCustomerId` and runs headless chromium to populate zero or more `ModelUsage` snapshots.