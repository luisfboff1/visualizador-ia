# Domain: project_setup

## Purpose
Capture fixes required to make pnpm install/build a clean checkout of visualizador-ia, including dependency availability and Electron packaging quirks.

## Scope
Included in this domain:
- pnpm dependency declarations required to satisfy TypeScript/Electron runtime
- pnpm workspace settings that interact with pnpm v10 build script protections
- Electron builder configuration adjustments needed for Windows packaging
- Type hints required for Playwright callbacks in Node tsconfig

Excluded from this domain:
- runtime feature work unrelated to build or install scripts

## Ownership
Platform Engineering

## Usage
Refer to this domain when diagnosing fresh environment setup issues or updating pnpm/Electron packaging settings.
