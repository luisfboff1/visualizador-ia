# Plano: AI Usage Dashboard Unificado

## Objetivo

Criar um executável (`.exe` no Windows / `.app` no Mac) que abre um dashboard local no browser mostrando em tempo real o consumo de IA do usuário em duas plataformas:

- **ChatGPT Codex** (OpenAI) — limites de uso por hora e semana
- **GitHub Copilot** — requests premium consumidos no mês, por modelo

---

## Fontes de Dados

### 1. ChatGPT Codex — Usage

**URL:** `https://chatgpt.com/codex/settings/usage`

**Requer login:** Sim (conta OpenAI)

**Dados a extrair:**

| Campo | Localização no DOM | Dado de exemplo |
|---|---|---|
| Limite de 5h — % restante | `generic "100%"` próximo a `"5 hour usage limit"` | `100%` |
| Limite semanal — % restante | `generic "47%"` próximo a `"Weekly usage limit"` | `47%` |
| Data de reset semanal | `generic "Resets Apr 9, 2026 1:56 PM"` | `Apr 9, 2026 1:56 PM` |
| Breakdown por origem (30d) | Labels `Desktop App`, `Extension`, `Other` com valores no gráfico | Barras no período |

**Seletores CSS / texto sugeridos para scraping:**
```
# Limite 5h
page.locator('text=5 hour usage limit').locator('..').locator('[class*="percent"], [class*="remaining"]')

# Limite semanal
page.locator('text=Weekly usage limit').locator('..').locator('[class*="percent"]')

# Reset date
page.locator('text=/Resets .*/').inner_text()
```

---

### 2. GitHub Copilot — Premium Requests Usage

**URL:** `https://github.com/settings/billing/premium_requests_usage?period=3&group=7&customer=41103925&chart_selection=2`

**Requer login:** Sim (conta GitHub)

**Dados a extrair:**

| Campo | Localização no DOM | Dado de exemplo |
|---|---|---|
| Total de requests incluídos usados | `generic "343"` acima de `"of 1.500 included"` | `343` |
| Total de requests incluídos no plano | `generic "of 1.500 included"` | `1.500` |
| Valor cobrado (billed) | `generic "$0.00"` próximo a `"Billed premium requests"` | `$0.00` |
| Data de reset mensal | `text=/Monthly limit resets in .*/` | `resets in 24 days on 1 de maio de 2026` |
| Breakdown por modelo (tabela) | Linhas da tabela com: Model / Included requests / Gross amount / Billed amount | Ver abaixo |

**Tabela de modelos (dados atuais encontrados):**

| Modelo | Requests incluídos | Gross amount |
|---|---|---|
| Claude Opus 4.6 | 243 | $9.72 |
| Claude Sonnet 4.6 | 86 | $3.44 |
| Claude Sonnet 4.5 | 10 | $0.40 |
| Coding Agent model | — | $0.16 |
| Claude Haiku 4.5 | — | $0.00 |
| Gemini 3 Flash | — | $0.00 |

**Seletores CSS / texto sugeridos para scraping:**
```
# Requests usados / total
page.locator('text=Included premium requests consumed').locator('..').locator('strong, [class*="count"]')

# Tabela de modelos
rows = page.locator('table tbody tr')  # ou estrutura equivalente de divs

# Reset date
page.locator('text=/Monthly limit resets/').inner_text()
```

---

## Arquitetura do App

```
ai-usage-dashboard/
├── main.py               ← ponto de entrada, inicia Flask + abre browser
├── scraper.py            ← Playwright: loga e extrai dados das duas fontes
├── server.py             ← Flask: serve o dashboard em localhost:3131
├── templates/
│   └── index.html        ← UI do dashboard (HTML + CSS + JS inline)
├── static/
│   └── style.css         ← opcional
├── cache.json            ← último resultado salvo (para exibir offline)
└── requirements.txt
```

### Dependências Python
```
playwright==1.44.*
flask==3.0.*
pyinstaller==6.*
```

---

## Fluxo de Funcionamento

```
1. Usuário abre o .exe
        ↓
2. Flask sobe em localhost:3131 (thread separada)
        ↓
3. Playwright abre Chromium usando o perfil real do browser do usuário
   → Com isso herda os cookies de sessão (não precisa fazer login)
        ↓
4. Scraper navega para as 2 URLs e extrai os dados
        ↓
5. Dados são salvos em cache.json
        ↓
6. Flask responde /api/data com o JSON mais recente
        ↓
7. Browser abre automaticamente em http://localhost:3131
        ↓
8. Dashboard exibe tudo em tempo real
        ↓
9. A cada 10 minutos (configurável), o scraper roda de novo em background
   → Dashboard atualiza via polling /api/data a cada 30 segundos
```

---

## API Interna (Flask)

| Endpoint | Método | Descrição |
|---|---|---|
| `/` | GET | Serve o HTML do dashboard |
| `/api/data` | GET | Retorna JSON com todos os dados scraped |
| `/api/refresh` | POST | Força um novo scraping imediato |
| `/api/status` | GET | Retorna status do scraper (idle / running / error) |

**Formato do JSON `/api/data`:**
```json
{
  "last_updated": "2026-04-07T14:30:00",
  "codex": {
    "limit_5h_remaining_pct": 100,
    "weekly_remaining_pct": 47,
    "weekly_reset_date": "Apr 9, 2026 1:56 PM"
  },
  "github": {
    "requests_used": 343,
    "requests_total": 1500,
    "billed_usd": 0.00,
    "reset_date": "2026-05-01",
    "models": [
      { "name": "Claude Opus 4.6", "requests": 243, "gross_usd": 9.72, "billed_usd": 0.00 },
      { "name": "Claude Sonnet 4.6", "requests": 86, "gross_usd": 3.44, "billed_usd": 0.00 },
      { "name": "Claude Sonnet 4.5", "requests": 10, "gross_usd": 0.40, "billed_usd": 0.00 }
    ]
  }
}
```

---

## Dashboard UI — O Que Mostrar

### Bloco 1 — ChatGPT Codex
- Barra de progresso: limite de 5h (verde/amarelo/vermelho conforme %)
- Barra de progresso: limite semanal + data de reset
- Texto: "Atualizado em X"

### Bloco 2 — GitHub Copilot
- Barra de progresso: 343 / 1.500 requests
- Texto: "Reseta em X dias"
- Tabela: modelo | requests | gross | billed
- Badge: "Nenhuma cobrança extra" se billed = $0.00

### Rodapé
- Botão "Atualizar agora"
- Status: "Última atualização: X minutos atrás"
- Indicador: "Próxima atualização em: X"

---

## Como Usar o Perfil Real do Browser (sem fazer login)

### Chrome / Edge (Windows)
```python
from playwright.sync_api import sync_playwright
import os

CHROME_PROFILE = os.path.expandvars(
    r"%LOCALAPPDATA%\Google\Chrome\User Data"
)

with sync_playwright() as p:
    browser = p.chromium.launch_persistent_context(
        user_data_dir=CHROME_PROFILE,
        channel="chrome",   # ou "msedge"
        headless=True       # invisível ao usuário
    )
    page = browser.new_page()
    page.goto("https://chatgpt.com/codex/settings/usage")
    # ... extrai dados
```

### Mac (Chrome)
```python
CHROME_PROFILE = os.path.expanduser(
    "~/Library/Application Support/Google/Chrome"
)
```

> ⚠️ **Importante:** fechar o Chrome antes de rodar o app na primeira vez,
> pois o Chromium não consegue abrir um perfil que já está em uso.
> Nas próximas execuções o app pode gerenciar isso automaticamente.

---

## Empacotamento com PyInstaller

```bash
pip install pyinstaller playwright
playwright install chromium

pyinstaller --onefile --windowed \
  --add-data "templates;templates" \
  --add-data "static;static" \
  --name "AI Usage Dashboard" \
  main.py
```

O `.exe` final ficará em `dist/AI Usage Dashboard.exe`

---

## Próximos Passos (ordem de implementação)

1. [ ] `scraper.py` — Playwright extraindo dados das 2 URLs com seletores testados
2. [ ] `server.py` — Flask com os 4 endpoints
3. [ ] `index.html` — Dashboard HTML/CSS com barras de progresso e tabela
4. [ ] `main.py` — Orquestrador: sobe Flask em thread, dispara scraper, abre browser
5. [ ] Testar scraping com perfil real do Chrome
6. [ ] Empacotar com PyInstaller
7. [ ] Testar o `.exe` standalone
