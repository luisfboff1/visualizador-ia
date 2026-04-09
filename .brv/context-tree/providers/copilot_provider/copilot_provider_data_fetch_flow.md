---
title: Copilot Provider Data Fetch Flow
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-09T00:35:42.416Z'
updatedAt: '2026-04-09T00:35:42.416Z'
---
## Raw Concept
**Task:**
Capture how CopilotProvider retrieves quota and model usage data from GitHub Copilot APIs and Playwright scraping.

**Changes:**
- Fetches user info via axios GET to CONFIG.api.copilot.user with token authorization, handles missing token via error snapshot.
- Parses premium_interactions quota snapshot to compute remainingPct, usedPct, requestsUsed, requestsTotal, and includes resetDate in windows list.
- Attempts to fetch a billing model table via playwright-core chromium when githubCustomerId is configured, mapping table rows into ModelUsage snapshots.
- Falls back to friendly error snapshots when API or Playwright fetches fail while logging warnings.

**Files:**
- src/main/providers/copilot.ts

**Flow:**
isAvailable checks saved GitHub token -> fetch validates token -> fetchViaAPI calls Copilot user API -> compute quotas -> optionally fetchModelTable via Playwright if customerId present -> return ProviderSnapshot with windows, plan, models; errors log warning then return error snapshot.

**Timestamp:** 2026-04-08

**Author:** Insights Team

## Narrative
### Structure
CopilotProvider extends ProviderBase and defines isAvailable/fetch/fetchViaAPI/fetchModelTable. Quota parsing happens inside fetchViaAPI while fetchModelTable isolates Playwright scraping.

### Dependencies
axios for GitHub API calls, loadConfig for customerId and chrome userData path, playwright-core for optional billing table scraping, CONFIG.api endpoints, ProviderBase helpers.

### Highlights
Returns windows data showing premium requests with remainingPct rounded, requestsUsed/requestsTotal when available, and supports additional model usage info when Playwright scraping succeeds.

### Rules
Rule: When Playwright scraping fails, log a warning and continue; do not throw so the provider still returns vendor metadata if possible.

### Examples
ModelUsage rows extract name, requests, grossUsd, and billedUsd from table cells converted via parseInt/parseFloat.

## Facts
- **copilot_api_headers**: CopilotProvider fetch requests send headers Editor-Version=vscode/1.96.2, Editor-Plugin-Version=copilot-chat/0.26.7, User-Agent=GitHubCopilotChat/0.26.7, and X-Github-Api-Version=2025-04-01. [project]
- **quota_calculation**: Quota snapshots compute usedPct as Math.round(100 - percent_remaining) and remaining totals via entitlement minus remaining when both numbers exist. [project]
- **playwright_model_scrape**: When CONFIG.githubCustomerId exists, the provider launches playwright-core chromium in headless mode with --no-first-run to scrape the billing page for model usage. [project]
