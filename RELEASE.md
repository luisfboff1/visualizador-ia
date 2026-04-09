# Como publicar uma nova versão

## Fluxo completo

### 1. Fazer as alterações no código
Edite os arquivos em `src/` normalmente.

### 2. Bumpar a versão no `package.json`
```json
"version": "1.0.2"
```

### 3. Commitar e enviar ao GitHub
```powershell
git add .
git commit -m "feat: descrição do que mudou"
git push
```

### 4. Criar a Release no GitHub e anexar o zip
```powershell
# Feche o app antes de zipar!
$7z = Get-ChildItem "node_modules\.pnpm\7zip-bin*" -Recurse -Filter "7za.exe" | Where-Object { $_.FullName -like "*win\x64*" } | Select-Object -First 1 -ExpandProperty FullName
& $7z a -tzip "release\AI-Usage-Dashboard-vX.Y.Z-win-x64.zip" ".\release\win-unpacked\*"

gh release create vX.Y.Z --title "vX.Y.Z - Descrição" --notes "- O que mudou"
gh release upload vX.Y.Z "release\AI-Usage-Dashboard-vX.Y.Z-win-x64.zip"
```

> **Importante:** Sempre anexe o `.zip` à release — é o que o usuário vai baixar ao clicar "Baixar" no app.

### 5. (Opcional) Gerar novo .exe para distribuição
Só faça isso se quiser distribuir um instalador novo para quem ainda não tem o app:
```powershell
# Feche o app antes!
pnpm run package
```
O `.exe` fica em `release/win-unpacked/AI Usage Dashboard.exe`.

---

## Como o atualizador funciona

- O app consulta `https://api.github.com/repos/luisfboff1/visualizador-ia/releases/latest`
- Compara a `tag_name` da release mais recente com a versão embutida no `.exe`
- Se for maior → banner amarelo com botão "Baixar" que abre o browser na página da release
- Se estiver igual → banner verde por 4 segundos

## Versão atual embutida no .exe

A versão que o app reporta vem do campo `version` do `package.json` no momento do `pnpm run package`.  
**O .exe não atualiza sozinho** — o atualizador só avisa e redireciona para download manual.

---

## Dica: testar o atualizador

1. Mantenha o `.exe` antigo (versão menor, ex: v1.0.0)
2. Crie uma release nova no GitHub (ex: v1.0.1) com `gh release create`
3. Abra o `.exe` antigo e clique em `⬆` no footer
4. O banner amarelo deve aparecer indicando a nova versão

> ⚠️ Se você gerou um `.exe` novo (v1.0.1) e criou a release v1.0.1, o app vai dizer "já está atualizado" — use o `.exe` antigo para testar.
