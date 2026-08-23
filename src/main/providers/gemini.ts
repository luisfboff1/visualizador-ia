import fs from 'fs'
import path from 'path'
import os from 'os'
import axios from 'axios'
import { ProviderBase, ProviderSnapshot, UsageWindow } from './base'
import { CONFIG } from '../config'
import { loadConfig } from '../store'

interface GeminiModel {
  name: string
  displayName?: string
  description?: string
  inputTokenLimit?: number
  outputTokenLimit?: number
  supportedGenerationMethods?: string[]
}

interface GeminiModelsResponse {
  models?: GeminiModel[]
}

interface AntigravityBucket {
  bucketId?: string
  displayName?: string
  description?: string
  window?: string
  remainingFraction?: number
  resetTime?: string
}

interface AntigravityGroup {
  displayName?: string
  description?: string
  buckets?: AntigravityBucket[]
}

interface AntigravityQuotaResponse {
  response?: {
    groups?: AntigravityGroup[]
    description?: string
  }
}

export class GeminiProvider extends ProviderBase {
  readonly name = 'Gemini'
  readonly name = 'Google Antigravity'

  async isAvailable(): Promise<boolean> {
    const config = loadConfig()
    return !!config.geminiApiKey
    if (config.geminiApiKey) return true
    const server = await this.discoverAntigravityServer()
    return !!server
  }

  async fetch(): Promise<ProviderSnapshot> {
    // 1. Tenta buscar direto do Google Antigravity local (sem precisar de nada)
    try {
      const antigravitySnap = await this.fetchViaAntigravity()
      if (antigravitySnap && antigravitySnap.windows.length > 0) {
        return antigravitySnap
      }
    } catch (e) {
      console.warn('[Gemini] Antigravity fetch failed:', (e as Error).message)
    }

    // 2. Fallback: API Key configurada
    const config = loadConfig()
    const apiKey = config.geminiApiKey
    if (!apiKey) {
      return this.errorSnapshot('API key não configurada. Clique em "Conectar Gemini" para adicionar.')
      return this.errorSnapshot('Antigravity não detectado e API key não configurada. Inicie o Antigravity ou adicione sua API Key.')
    }

    let apiError = ''
    let playwrightError = ''

    // Estratégia 1: Valida key via API e busca modelos disponíveis
    let apiSnap: ProviderSnapshot | null = null
    try {
      apiSnap = await this.fetchViaApi(apiKey)
    } catch (e) {
      apiError = (e as any)?.response?.data?.error?.message || (e as Error).message || String(e)
      console.warn('[Gemini] API failed:', apiError)
    }

    // Tenta enriquecer com dados de uso via Playwright
    try {
      const usageSnap = await this.fetchUsageViaPlaywright()
      if (usageSnap && usageSnap.windows.length > 0) {
        const base = apiSnap ?? this.makeSnapshot({ source: 'playwright', windows: [] })
        return { ...base, windows: usageSnap.windows, source: 'playwright' }
      }
    } catch (e) {
      playwrightError = (e as Error).message || String(e)
      console.warn('[Gemini] Playwright usage failed:', playwrightError)
    }

    // Se a API funcionou mas o Playwright não conseguiu dados de uso, retorna só com API
    if (apiSnap) return apiSnap

    const detail = [
      apiError && `API: ${apiError}`,
      playwrightError && `Browser: ${playwrightError}`,
    ].filter(Boolean).join(' | ')
    return this.errorSnapshot(detail || 'Não foi possível obter dados do Gemini.')
  }

  private async discoverAntigravityServer(): Promise<{ port: number; csrfToken: string } | null> {
    const logDir = path.join(os.homedir(), '.gemini', 'antigravity', 'log')
    if (!fs.existsSync(logDir)) return null

    try {
      const files = fs.readdirSync(logDir)
        .filter(f => f.startsWith('cli-') && f.endsWith('.log'))
        .map(f => ({ name: f, time: fs.statSync(path.join(logDir, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time)

      for (const file of files.slice(0, 5)) {
        const content = fs.readFileSync(path.join(logDir, file.name), 'utf8')
        const matches = [...content.matchAll(/Language server listening on random port at (\d+) for HTTP\b/g)]
        for (const match of matches.reverse()) {
          const port = parseInt(match[1])
          try {
            const html = await axios.get(`http://127.0.0.1:${port}/`, { timeout: 1200 })
            const csrfMatch = html.data.match(/"csrfToken":"([^"]+)"/)
            if (csrfMatch) {
              return { port, csrfToken: csrfMatch[1] }
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn('[Gemini] Discovery error:', e)
    }
    return null
  }

  private async fetchViaAntigravity(): Promise<ProviderSnapshot | null> {
    const server = await this.discoverAntigravityServer()
    if (!server) return null

    const url = `http://127.0.0.1:${server.port}/exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary`
    const res = await axios.post<AntigravityQuotaResponse>(url, { force_refresh: false }, {
      headers: {
        'Content-Type': 'application/json',
        'Connect-Protocol-Version': '1',
        'x-codeium-csrf-token': server.csrfToken,
      },
      timeout: 4000,
    })

    const groups = res.data?.response?.groups || []
    if (groups.length === 0) return null

    const windows: UsageWindow[] = []

    for (const group of groups) {
      const groupName = group.displayName || ''
      const isGeminiGroup = groupName.toLowerCase().includes('gemini')
      const prefix = isGeminiGroup ? 'Gemini' : 'Claude/GPT'

      for (const bucket of group.buckets || []) {
        const remainingFraction = bucket.remainingFraction ?? 1
        const remainingPct = Math.max(0, Math.min(100, Math.round(remainingFraction * 100)))
        const usedPct = 100 - remainingPct
        const windowLabel = bucket.window === '5h' ? '5h' : 'Semanal'
        const label = `${prefix} (${windowLabel})`

        windows.push({
          label,
          usedPct,
          remainingPct,
          resetDate: bucket.resetTime,
        })
      }
    }

    return this.makeSnapshot({
      source: 'oauth',
      windows,
      plan: 'Antigravity Ativo',
    })
  }

  private async fetchViaApi(apiKey: string): Promise<ProviderSnapshot | null> {
    const resp = await axios.get<GeminiModelsResponse>(CONFIG.api.gemini.models, {
      params: { key: apiKey },
      timeout: 10000,
    })

    const models = resp.data.models ?? []
    // Filtra modelos de geração de conteúdo do Gemini
    const relevantModels = models.filter(m =>
      m.supportedGenerationMethods?.includes('generateContent') &&
      m.name.includes('gemini')
    )

    return this.makeSnapshot({
      source: 'oauth',
      windows: [],
      plan: relevantModels.length > 0
        ? relevantModels
            .map(m => m.displayName ?? m.name.split('/').pop() ?? m.name)
            .slice(0, 5)
            .join(', ')
        : 'Key válida',
    })
  }

  private async fetchUsageViaPlaywright(): Promise<ProviderSnapshot | null> {
    const { chromium } = await import('playwright-core')
    
    // Tenta Chrome primeiro, depois Edge
    const attempts = [
      { channel: 'chrome', userDataDir: CONFIG.paths.chrome.userData },
      { channel: 'msedge', userDataDir: CONFIG.paths.edge.userData },
    ]

    let browser: any = null
    for (const attempt of attempts) {
      try {
        browser = await chromium.launchPersistentContext(attempt.userDataDir, {
          channel: attempt.channel,
          headless: true,
          args: ['--no-first-run', '--no-default-browser-check'],
        })
        break
      } catch {
        // Tenta o próximo navegador
      }
    }

    if (!browser) return null

    try {
      const page = await browser.newPage()
      await page.goto(CONFIG.api.gemini.usagePage, { waitUntil: 'domcontentloaded', timeout: 25000 })
      await page.waitForTimeout(4000)

      const content = await page.content()
      const windows = this.parseUsagePage(content)

      if (windows.length === 0) return null

      return this.makeSnapshot({ source: 'playwright', windows })
    } finally {
      await browser.close()
    }
  }

  private parseUsagePage(html: string): UsageWindow[] {
    const windows: UsageWindow[] = []

    // Extrai RPD (Requests Per Day)
    const rpdMatch = html.match(/requests?\s+per\s+day[\s\S]{0,300}?(\d[\d,]+)\s*\/\s*(\d[\d,]+)/i)
      ?? html.match(/(\d[\d,]+)\s*\/\s*(\d[\d,]+)\s*(?:requests?|RPD)/i)
    if (rpdMatch) {
      const used = parseInt(rpdMatch[1].replace(/,/g, ''))
      const limit = parseInt(rpdMatch[2].replace(/,/g, ''))
      if (!isNaN(used) && !isNaN(limit) && limit > 0) {
        const usedPct = Math.min(100, Math.round((used / limit) * 100))
        windows.push({ label: 'RPD (diário)', usedPct, remainingPct: 100 - usedPct })
      }
    }

    // Extrai RPM (Requests Per Minute)
    const rpmMatch = html.match(/requests?\s+per\s+minute[\s\S]{0,300}?(\d[\d,]+)\s*\/\s*(\d[\d,]+)/i)
      ?? html.match(/(\d[\d,]+)\s*\/\s*(\d[\d,]+)\s*(?:RPM)/i)
    if (rpmMatch) {
      const used = parseInt(rpmMatch[1].replace(/,/g, ''))
      const limit = parseInt(rpmMatch[2].replace(/,/g, ''))
      if (!isNaN(used) && !isNaN(limit) && limit > 0) {
        const usedPct = Math.min(100, Math.round((used / limit) * 100))
        windows.push({ label: 'RPM (por minuto)', usedPct, remainingPct: 100 - usedPct })
      }
    }

    // Extrai TPM (Tokens Per Minute)
    const tpmMatch = html.match(/tokens?\s+per\s+minute[\s\S]{0,300}?(\d[\d,]+)\s*\/\s*(\d[\d,]+)/i)
      ?? html.match(/(\d[\d,]+)\s*\/\s*(\d[\d,]+)\s*(?:TPM)/i)
    if (tpmMatch) {
      const used = parseInt(tpmMatch[1].replace(/,/g, ''))
      const limit = parseInt(tpmMatch[2].replace(/,/g, ''))
      if (!isNaN(used) && !isNaN(limit) && limit > 0) {
        const usedPct = Math.min(100, Math.round((used / limit) * 100))
        windows.push({ label: 'TPM (tokens/min)', usedPct, remainingPct: 100 - usedPct })
      }
    }

    // Extrai percentuais genéricos se não encontrou os específicos
    if (windows.length === 0) {
      const pctMatches = [...html.matchAll(/(\d{1,3})%\s*(?:used|utiliz)/gi)]
      for (const m of pctMatches) {
        const usedPct = parseInt(m[1])
        windows.push({ label: 'Uso', usedPct, remainingPct: 100 - usedPct })
        if (windows.length >= 3) break
      }
    }

    return windows
  }
}