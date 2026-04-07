import axios from 'axios'
import { ProviderBase, ProviderSnapshot, UsageWindow } from './base'
import { readCodexAuth, getCodexToken } from '../auth/credentials'
import { CONFIG } from '../config'

interface WhamWindow {
  used_percent?: number | null
  limit_window_seconds?: number | null
  reset_after_seconds?: number | null
  reset_at?: number | null  // Unix timestamp
}

interface WhamUsageResponse {
  plan_type?: string
  rate_limit?: {
    allowed?: boolean
    limit_reached?: boolean
    primary_window?: WhamWindow | null    // 5h (18000s)
    secondary_window?: WhamWindow | null  // weekly (604800s)
  } | null
  credits?: {
    has_credits?: boolean
    unlimited?: boolean
    balance?: number | null
  } | null
  spend_control?: {
    reached?: boolean
  } | null
}

export class CodexProvider extends ProviderBase {
  readonly name = 'Codex'

  async isAvailable(): Promise<boolean> {
    const auth = readCodexAuth()
    return !!auth && !!auth.access_token
  }

  async fetch(): Promise<ProviderSnapshot> {
    let oauthError = ''
    let playwrightError = ''

    // Tenta OAuth primeiro
    try {
      const snap = await this.fetchViaOAuth()
      if (snap) return snap
      oauthError = 'Credenciais não encontradas'
    } catch (e) {
      oauthError = (e as any)?.response?.data?.detail || (e as Error).message || String(e)
      console.warn('[Codex] OAuth failed:', oauthError)
    }

    // Fallback: Playwright
    try {
      const snap = await this.fetchViaPlaywright()
      if (snap) return snap
      playwrightError = 'Não foi possível extrair dados via browser'
    } catch (e) {
      playwrightError = (e as Error).message || String(e)
      console.warn('[Codex] Playwright failed:', playwrightError)
    }

    const detail = [oauthError && `OAuth: ${oauthError}`, playwrightError && `Browser: ${playwrightError}`].filter(Boolean).join(' | ')
    return this.errorSnapshot(detail || 'Não foi possível obter dados do Codex.')
  }

  private async fetchViaOAuth(): Promise<ProviderSnapshot | null> {
    const auth = readCodexAuth()
    if (!auth) return null
    const token = getCodexToken(auth)
    if (!token) return null

    const resp = await axios.get<WhamUsageResponse>(CONFIG.api.codex.usage, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    })

    const rl = resp.data.rate_limit
    const windows: UsageWindow[] = []

    function whamWindow(w: WhamWindow | null | undefined, label: string): UsageWindow | null {
      if (!w) return null
      const usedPct = w.used_percent ?? 0
      const remainingPct = 100 - usedPct
      // reset_at is Unix timestamp in seconds
      const resetDate = w.reset_at ? new Date(w.reset_at * 1000).toISOString() : undefined
      return { label, usedPct, remainingPct, resetDate }
    }

    const primary = whamWindow(rl?.primary_window, 'Session (5h)')
    if (primary) windows.push(primary)

    const secondary = whamWindow(rl?.secondary_window, 'Weekly')
    if (secondary) windows.push(secondary)

    const credits = resp.data.credits
    return this.makeSnapshot({
      source: 'oauth',
      windows,
      creditsRemaining: credits?.balance ?? undefined,
    })
  }

  private async fetchViaPlaywright(): Promise<ProviderSnapshot | null> {
    const { chromium } = await import('playwright-core')
    const userDataDir = CONFIG.paths.chrome.userData

    const browser = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chrome',
      headless: true,
      args: ['--no-first-run', '--no-default-browser-check'],
    })

    try {
      const page = await browser.newPage()
      await page.goto(CONFIG.api.codex.usagePage, { waitUntil: 'domcontentloaded', timeout: 20000 })

      // Aguarda dados carregarem
      await page.waitForTimeout(3000)

      const content = await page.content()
      const windows = this.parseCodexPage(content)

      return this.makeSnapshot({ source: 'playwright', windows })
    } finally {
      await browser.close()
    }
  }

  private parseCodexPage(html: string): UsageWindow[] {
    const windows: UsageWindow[] = []

    // Extrai % do limite de 5h
    const fiveHourMatch = html.match(/5[\s-]*hour[\s\S]{0,500}?(\d{1,3})%/i)
    if (fiveHourMatch) {
      const pct = parseInt(fiveHourMatch[1])
      windows.push({ label: 'Session (5h)', usedPct: 100 - pct, remainingPct: pct })
    }

    // Extrai % do limite semanal e reset date
    const weeklyMatch = html.match(/[Ww]eekly[\s\S]{0,500}?(\d{1,3})%/)
    const resetMatch = html.match(/Resets\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4}[^<"]*)/i)
    if (weeklyMatch) {
      const pct = parseInt(weeklyMatch[1])
      windows.push({
        label: 'Weekly',
        usedPct: 100 - pct,
        remainingPct: pct,
        resetDate: resetMatch?.[1]?.trim(),
      })
    }

    return windows
  }
}
