---
children_hash: dc698b7ae2198328833b8cc91bf60b5273c26ef85f4982f757f210f43b40cb90
compression_ratio: 0.7234299516908212
condensation_order: 2
covers: [context.md, pnpm_build_setup/_index.md]
covers_token_total: 828
summary_level: d2
token_count: 599
type: summary
---
# Domain Summary: project_setup (level d2)

## Purpose & Scope (context.md)
- Platform Engineering domain capturing pnpm/Electron build and install fixes for clean `visualizador-ia` checkouts.
- Focus areas: dependency declarations, pnpm v10 build-script allowances, Electron Windows packaging tweaks, and Playwright callback typings when targeting Node.
- Intended audience: engineers troubleshooting fresh environment setups or adjusting pnpm/Electron packaging.

## Key Architecture & Constraints (context.md, pnpm_install_and_build_fixes.md)
- **Dependency placement**: Move `playwright-core` and `sqlite3` into `package.json`’s `dependencies` so the tsconfig targeting Node can resolve their native symbols during `pnpm install`.
- **Build-script permissions**: Declare `electron`, `@playwright/browser-chromium`, and `sqlite3` in `pnpm.onlyBuiltDependencies` and ensure they are not listed under `ignoredBuiltDependencies` in `pnpm-workspace.yaml`, enabling their lifecycle scripts under pnpm v10 policies.
- **Electron Windows packaging**: Set `electron-builder.win.signAndEditExecutable = false` in `electron-builder.yml` to prevent winCodeSign-related symlink failures during `pnpm package`.
- **Playwright TypeScript workaround**: Cast `page.evaluate` callbacks to `any` so the Node-focused tsconfig does not reject browser-only `Element/HTMLElement` types while still running Playwright in tests.

## Process Flow (pnpm_install_and_build_fixes.md)
- Fresh clone → `pnpm install` now pulls runtime dependencies (Playwright, SQLite) and allows their build hooks.
- `pnpm package` uses electron-builder with `signAndEditExecutable` disabled to avoid Windows signing issues.
- Playwright usage remains build-compatible through explicit typing casts.

## Rules & Relationships
- Essential runtime packages must live in `dependencies` not devDependencies.
- pnpm v10’s build-script gating requires explicit inclusion in `pnpm.onlyBuiltDependencies`; removal from `ignoredBuiltDependencies` is mandatory for Electron/Playwright/SQLite hooks.
- Windows packaging depends on disabling `signAndEditExecutable`; see `electron-builder.yml`.
- Playwright callbacks tie into the TypeScript configuration, so the `page.evaluate` workaround shields ts-node builds from browser-only DOM typings.

Refer to `context.md` and `pnpm_install_and_build_fixes.md` for detailed fixes and configuration snippets.