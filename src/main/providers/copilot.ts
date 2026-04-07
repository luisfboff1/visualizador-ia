import axios from 'axios'
import { ProviderBase, ProviderSnapshot, ModelUsage } from './base'
import { getSavedCopilotToken } from '../auth/githubDeviceFlow'
import { loadConfig } from '../store'
import { CONFIG } from '../config'

interface QuotaSnapshot {
  percent_remaining?: number | null
  remaining?: number | null
  entitlement?: number | null
  unlimited?: boolean | null
  has_quota?: boolean | null
  overage_permitted?: boolean | null
  timestamp_utc?: string | null
}

interface CopilotUserResponse {
  copilot_plan?: string
  quota_reset_date_utc?: string
  quota_snapshots?: {
    premium_interactions?: QuotaSnapshot | null
    chat?: QuotaSnapshot | null
    completions?: QuotaSnapshot | null
  } | null
}

export class CopilotProvider extends ProviderBase {
  readonly name = 'Copilot'

  async isAvailable(): Promise<boolean> {
    return !!getSavedCopilotToken()
  }

  async fetch(): Promise<ProviderSnapshot> {
    const token = getSavedCopilotToken()
    if (!token) {
      return this.errorSnapshot('Token GitHub não encontrado. Use "Conectar Copilot" para autorizar.')
    }

    // API principal
    try {
      const snap = await this.fetchViaAPI(token)
      if (snap) return snap
    } catch (e) {
      console.warn('[Copilot] API failed:', (e as Error).message)
    }

    return this.errorSnapshot('Falha ao obter dados do Copilot. O token pode ter expirado.')
  }

  private async fetchViaAPI(token: string): Promise<ProviderSnapshot | null> {
    const resp = await axios.get<CopilotUserResponse>(CONFIG.api.copilot.user, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/json',
        'Editor-Version': 'vscode/1.96.2',
        'Editor-Plugin-Version': 'copilot-chat/0.26.7',
        'User-Agent': 'GitHubCopilotChat/0.26.7',
        'X-Github-Api-Version': '2025-04-01',
      },
      timeout: 10000,
    })

    const data = resp.data
    const premium = data.quota_snapshots?.premium_interactions

    // percent_remaining vem como 75.4 → used = 100 - 75.4 = 24.6
    const remainingPct = premium?.percent_remaining ?? 100
    const usedPct = Math.round(100 - remainingPct)
    const requestsRemaining = premium?.remaining ?? undefined
    const requestsTotal = premium?.entitlement ?? undefined
    const requestsUsed = (requestsTotal !== undefined && requestsRemaining !== undefined)
      ? requestsTotal - requestsRemaining
      : undefined

    // Tenta pegar tabela de modelos via Playwright se tiver customerId salvo
    let models: ModelUsage[] | undefined
    const config = loadConfig()
    if (config.githubCustomerId) {
      try {
        models = await this.fetchModelTable(token, config.githubCustomerId)
      } catch (e) {
        console.warn('[Copilot] Model table fetch failed:', (e as Error).message)
      }
    }

    return this.makeSnapshot({
      source: 'device-flow',
      windows: [
        {
          label: 'Premium Requests',
          usedPct,
          remainingPct: Math.round(remainingPct),
          resetDate: data.quota_reset_date_utc ?? undefined,
        },
      ],
      requestsUsed,
      requestsTotal,
      plan: data.copilot_plan,
      models,
    })
  }

  private async fetchModelTable(token: string, customerId: string): Promise<ModelUsage[]> {
    const { chromium } = await import('playwright-core')
    const url = `${CONFIG.api.copilot.billingPage}?period=3&group=7&customer=${customerId}&chart_selection=2`

    const browser = await chromium.launchPersistentContext(CONFIG.paths.chrome.userData, {
      channel: 'chrome',
      headless: true,
      args: ['--no-first-run'],
    })

    try {
      const page = await browser.newPage()
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForTimeout(3000)

      // Extrai linhas da tabela de modelos
      const rows = await page.$$eval('table tbody tr', (trs) =>
        trs.map((tr) => {
          const cells = Array.from(tr.querySelectorAll('td')).map((td) => (td as any).innerText.trim())
          return cells
        })
      )

      const models: ModelUsage[] = []
      for (const row of rows) {
        if (row.length < 3) continue
        const name = row[0]
        const requests = parseInt(row[1].replace(/[^\d]/g, '')) || 0
        const grossUsd = parseFloat(row[2].replace(/[^\d.]/g, '')) || 0
        const billedUsd = parseFloat((row[3] || '0').replace(/[^\d.]/g, '')) || 0
        if (name) models.push({ name, requests, grossUsd, billedUsd })
      }

      return models
    } finally {
      await browser.close()
    }
  }
}
