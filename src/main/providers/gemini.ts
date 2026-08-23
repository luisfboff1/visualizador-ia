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

export class GeminiProvider extends ProviderBase {
  readonly name = 'Gemini'

  async isAvailable(): Promise<boolean> {
    const config = loadConfig()
    return !!config.geminiApiKey
  }

  async fetch(): Promise<ProviderSnapshot> {
    const config = loadConfig()
    const apiKey = config.geminiApiKey
    if (!apiKey) {
      return this.errorSnapshot('API key não configurada. Clique em "Conectar Gemini" para adicionar.')
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
    const userDataDir = CONFIG.paths.chrome.userData

    const browser = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chrome',
      headless: true,
      args: ['--no-first-run', '--no-default-browser-check'],
    })

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