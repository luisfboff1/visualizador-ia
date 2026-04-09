# Topic: pnpm_build_setup

## Overview
Describes the four key fixes applied so pnpm install/build work from a clean clone, covering dependency declarations, pnpm build flags, Windows signing, and Playwright typing tweaks.

## Key Concepts
- Dependencies vs devDependencies when pnpm v10 runs tsc
- pnpm.onlyBuiltDependencies vs ignoredBuiltDependencies interplay
- electron-builder Windows signing options
- Playwright direct eval callback typing
