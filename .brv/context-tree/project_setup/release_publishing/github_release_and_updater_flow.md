---
title: GitHub Release and Updater Flow
tags: []
related: [project_setup/pnpm_build_setup/context.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-09T14:11:49.638Z'
updatedAt: '2026-04-09T14:11:49.638Z'
---
## Raw Concept
**Task:**
Document the release publishing process and the application updater behavior for Visualizador IA

**Changes:**
- Documented the required release workflow using package.json version bumps and GitHub releases
- Captured the distinction between publishing a release marker and generating a new executable
- Documented updater endpoint, comparison logic, UI outcomes, and test procedure

**Files:**
- RELEASE.md
- package.json

**Flow:**
edit code -> bump package.json version -> git add/commit/push -> gh release create -> app checks latest release API -> compare tag_name with embedded exe version -> notify user or show up-to-date banner

**Timestamp:** 2026-04-09

## Narrative
### Structure
The release process is lightweight because GitHub Releases are used as version markers for the updater. RELEASE.md in the project root defines the operational workflow: change source files, bump the package.json version, push changes to GitHub, and create a tagged release using gh CLI. Packaging a new executable is a separate optional step used only when distributing a fresh installer artifact.

### Dependencies
The process depends on GitHub as the release source of truth, the gh CLI for creating releases, package.json as the embedded version source during packaging, and pnpm run package when a new installer must be produced. Update detection depends on the GitHub API endpoint at https://api.github.com/repos/luisfboff1/visualizador-ia/releases/latest.

### Highlights
The updater does not patch the executable in place. It compares the latest release tag_name against the version embedded in the current .exe, shows a yellow banner with a download action when a newer release exists, and shows a green banner for 4 seconds when the executable is already current. This means release publication and installer generation are intentionally decoupled.

### Rules
1. Fazer as alterações no código em `src/` normalmente.
2. Bumpar a versão no `package.json`.
3. Commitar e enviar ao GitHub com `git add .`, `git commit -m "feat: descrição do que mudou"`, e `git push`.
4. Criar a Release no GitHub com `gh release create vX.Y.Z --title "vX.Y.Z - Descrição" --notes "- O que mudou"`.
5. Não precisa gerar novo .exe para publicar a release. O GitHub Release é só um marcador de versão — quem já usa o app vai detectar automaticamente via botão `⬆`.
6. Gerar novo .exe com `pnpm run package` somente se quiser distribuir um instalador novo para quem ainda não tem o app.
7. Para testar o atualizador, mantenha um `.exe` antigo, crie uma release nova no GitHub e abra o `.exe` antigo para acionar a verificação.
8. Se você gerou um `.exe` novo com a mesma versão da release, o app vai dizer que já está atualizado; para testar, use o `.exe` antigo.

### Examples
Exemplo de version bump no package.json: `"version": "1.0.2"`. Exemplo de criação de release: `gh release create v1.0.2 --title "v1.0.2 - Descrição" --notes "- O que mudou"`. Exemplo de teste do atualizador: manter um `.exe` v1.0.0, criar a release v1.0.1 e abrir o `.exe` antigo para verificar o banner amarelo.

## Facts
- **release_publish_flow**: Publishing a new Visualizador IA version requires bumping package.json version, committing and pushing changes, then creating a GitHub release with gh release create. [convention]
- **release_marker_behavior**: A new .exe is not required for the updater to detect a new version because the GitHub release acts only as a version marker. [project]
- **exe_distribution_rule**: A new .exe only needs to be generated when distributing a new installer manually. [convention]
- **updater_latest_release_api**: The in-app updater checks https://api.github.com/repos/luisfboff1/visualizador-ia/releases/latest. [project]
- **updater_version_comparison**: The app compares the latest GitHub release tag_name with the version embedded in the executable. [project]
- **updater_new_version_ui**: When a newer release exists, the app shows a yellow banner with a Baixar button that opens the browser on the release page. [project]
- **updater_current_version_ui**: When the current version matches the latest release, the app shows a green banner for 4 seconds. [project]
- **embedded_exe_version_source**: The version reported by the app comes from package.json at the time pnpm run package is executed. [project]
- **updater_manual_download_only**: The executable does not self-update; the updater only notifies the user and redirects to manual download. [project]
- **updater_test_method**: To test the updater, use an older executable and create a newer GitHub release via gh CLI. [convention]
- **release_doc_location**: The release instructions are documented in RELEASE.md at the project root. [project]
