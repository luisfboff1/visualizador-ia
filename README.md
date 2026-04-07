# AI Usage Dashboard

Widget flutuante para Windows que mostra em tempo real o consumo de créditos/requisições das suas contas:

- **Claude** (Anthropic) — janelas de uso da API
- **Codex** (OpenAI) — limites de sessão e semanal
- **GitHub Copilot** — premium requests e plano

<p align="center">
  <img src="docs/screenshot.png" alt="AI Usage Dashboard" width="420">
</p>

---

## Funcionalidades

- Painel flutuante sempre visível no canto inferior-direito da tela
- Ícone na bandeja do sistema (system tray) — clique para mostrar/ocultar
- Botão 📌 para fixar/desafixar janela sobre outras
- Botão ✕ para minimizar para a bandeja sem fechar
- Atualização automática a cada 5 minutos
- Barras de progresso coloridas por nível de uso
- Countdown até o reset de cada janela de uso

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 20+ |
| pnpm | 9+ |
| Git | qualquer |

> Instalar pnpm: `npm install -g pnpm`

---

## Como clonar e rodar

```bash
# 1. Clone o repositório
git clone https://github.com/luisfboff1/visualizador-ia.git
cd visualizador-ia

# 2. Instale dependências
pnpm install

# 3. Rode em modo desenvolvimento
pnpm run dev
```

O app abre automaticamente em modo dev com hot-reload.

---

## Gerar o executável (.exe)

```bash
# Gera ícone + compila TypeScript + empacota com electron-builder
pnpm run package
```

O executável fica em:

```
release/win-unpacked/AI Usage Dashboard.exe
```

> **Nota:** se aparecer erro de `winCodeSign` relacionado a symlinks, ative o **Modo Desenvolvedor do Windows**:  
> Configurações → Sistema → Para desenvolvedores → Modo Desenvolvedor → **Ativado**  
> Depois rode `pnpm run package` novamente.

---

## Configuração das APIs

Na primeira execução, o app tenta autenticar automaticamente usando:

| Provider | Método |
|---|---|
| Claude | Chave de API (`ANTHROPIC_API_KEY`) lida do ambiente |
| Codex | OAuth (tokens salvos pelo VS Code/Codex CLI) |
| Copilot | Device Flow do GitHub — clique em "Conectar Copilot" no app |

### Variáveis de ambiente opcionais

Crie um arquivo `.env` na raiz do projeto:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Estrutura do projeto

```
src/
  main/           # Processo principal Electron (Node.js)
    providers/    # Claude, Codex, Copilot — busca de dados
    auth/         # OAuth, Device Flow
    scheduler.ts  # Polling automático a cada 5 min
    trayIcon.ts   # Ícone da bandeja gerado dinamicamente
  renderer/       # Interface React + TypeScript
    components/   # ProviderCard, UsageBar, CountdownTimer
    styles/       # theme.css
scripts/
  generate-icon.cjs     # Gera build/icon.ico
  electron-package.cjs  # Empacota sem code signing
electron-builder.yml    # Config de empacotamento
```

---

## Tecnologias

- [Electron 41](https://www.electronjs.org/)
- [React 19](https://react.dev/)
- [TypeScript 6](https://www.typescriptlang.org/)
- [Vite 8](https://vitejs.dev/)
- [electron-builder](https://www.electron.build/)

---

## Licença

MIT
