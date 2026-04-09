# Domain: providers

## Purpose
Describe how the Copilot provider retrieves usage data, including API calls, quota calculations, and optional Playwright scraping when customer data is available.

## Scope
Included in this domain:
- GitHub Copilot API usage fetches
- quota snapshot interpretation
- Playwright-driven model table scraping for premium customers

Excluded from this domain:
- general GitHub OAuth flows
- other provider implementations

## Ownership
Insights Team

## Usage
Use as the authoritative reference for the Copilot provider implementation when diagnosing data fetch failures or extending quotas reporting.
