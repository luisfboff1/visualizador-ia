---
title: pnpm Install and Build Fixes
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-09T00:35:42.407Z'
updatedAt: '2026-04-09T00:35:42.407Z'
---
## Raw Concept
**Task:**
Document the four corrections needed so pnpm install && pnpm build succeed on a fresh checkout of visualizador-ia.

**Changes:**
- Declared playwright-core and sqlite3 in dependencies so the TypeScript compiler finds their symbols during pnpm install.
- Configured pnpm.onlyBuiltDependencies to allow pnpm v10 to run Electron/playwright/sqlite build scripts and removed those packages from pnpm-workspace ignoredBuiltDependencies so they install properly.
- Set electron-builder.win.signAndEditExecutable to false to bypass Windows symlink problems caused by winCodeSign when pnpm package runs.
- Typed the Playwright page.2>&1eval callback as any to keep Node-targeted tsconfig from failing on Element/HTMLElement types.

**Files:**
- package.json
- pnpm-workspace.yaml
- electron-builder.yml

**Flow:**
Fresh clone -> install dependencies (now includes playwright-core/sqlite3) -> pnpm install triggers pnpm.onlyBuiltDependencies -> pnpm package uses electron-builder without signAndEditExecutable -> Playwright callback typing aligns with Node tsconfig expectations.

**Timestamp:** 2026-04-08

**Author:** Luis

## Narrative
### Structure
package.json now lists playwright-core and sqlite3 under dependencies while pnpm.onlyBuiltDependencies explicitly names electron, @playwright/browser-chromium, and sqlite3. pnpm-workspace.yaml retains other ignored built dependencies (electron-winstaller, keytar, tldjs, win-dpapi). electron-builder.yml disables signAndEditExecutable under the win target and continues packing dist-main/dist-renderer plus package.json.

### Dependencies
pnpm v10, electron-builder on Windows, playwright-core, sqlite3, winCodeSign script from electron-builder.yml.

### Highlights
These edits let pnpm install and pnpm build complete from zero without TS2307 errors or blocked build scripts, and package:portable no longer trips on winCodeSign symlink enforcement.

### Rules
Rule: Keep explicit dependencies needed by both pnpm install and ts-node builds (playwright-core, sqlite3) instead of hiding them in devDependencies.

## Facts
- **pnpm_dependencies**: playwright-core and sqlite3 must be real dependencies so TypeScript can resolve their declarations when pnpm install runs. [project]
- **pnpm_v10_build_scripts**: pnpm v10 blocks build scripts unless the package opts into pnpm.onlyBuiltDependencies. [project]
- **pnpm_ignored_built_dependencies**: Removing electron, sqlite3, and @playwright/browser-chromium from pnpm-workspace ignoredBuiltDependencies allows pnpm install to install their build steps on version 10. [project]
- **electron_builder_windows_signing**: Disabling signAndEditExecutable in electron-builder.yml avoids Windows symlink issues that caused pnpm package to fail. [project]
