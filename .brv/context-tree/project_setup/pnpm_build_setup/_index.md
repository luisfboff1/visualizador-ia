---
children_hash: 51e798a00eb3c08fbe224cfca9534028b42729f0a60ca54af3c81c8a0aa68122
compression_ratio: 0.6678445229681979
condensation_order: 1
covers: [context.md, pnpm_install_and_build_fixes.md]
covers_token_total: 849
summary_level: d1
token_count: 567
type: summary
---
### pnpm_build_setup (domain-level structural summary)

- **Overview**: Documents four targeted fixes ensuring a fresh `pnpm install && pnpm build` succeeds in `visualizador-ia` by aligning dependency declarations, pnpm v10 build-script policies, Windows signing behavior, and Playwright typings.

- **Key Architectural Decisions**:
  - **Dependency categorization** (`context.md`, `pnpm_install_and_build_fixes.md`): Move `playwright-core` and `sqlite3` from devDependencies into `dependencies` so the TypeScript compiler (tsconfig targeting Node) resolves their symbols during `pnpm install`.
  - **pnpm build-script allowances** (`pnpm_install_and_build_fixes.md`): Declare `electron`, `@playwright/browser-chromium`, and `sqlite3` inside `pnpm.onlyBuiltDependencies` and remove them from `pnpm-workspace.yaml`’s `ignoredBuiltDependencies`, enabling their native build hooks under pnpm v10.
  - **Windows packaging** (`pnpm_install_and_build_fixes.md`): Set `electron-builder.win.signAndEditExecutable` to `false` within `electron-builder.yml` so `pnpm package` avoids winCodeSign-induced symlink failures on Windows.
  - **Playwright typing workaround** (`pnpm_install_and_build_fixes.md`): Cast the Playwright `page.evaluate` callback to `any` to prevent Node-targeted tsconfig from choking on browser-only `Element/HTMLElement` types during builds.

- **Process Flow** (`pnpm_install_and_build_fixes.md`):
  1. Fresh clone → install now pulls in `playwright-core`/`sqlite3`.
  2. `pnpm install` honors `pnpm.onlyBuiltDependencies`, running Electron/Playwright/SQLite scripts.
  3. `pnpm package` leverages electron-builder without `signAndEditExecutable`.
  4. Playwright callback typing keeps ts-node compliance.

- **Rules & Facts**:
  - Keep explicit essential runtime dependencies in `package.json`’s `dependencies` (not devDependencies).
  - pnpm v10 blocks build scripts unless packages appear in `pnpm.onlyBuiltDependencies`.
  - Removing Electron/Playwright/SQLite from `ignoredBuiltDependencies` is required for their installation scripts.
  - Disabling `signAndEditExecutable` prevents Windows code-signing symlink issues during packaging.

Reference child entries `context.md` and `pnpm_install_and_build_fixes.md` for detailed drill-down on each fix.