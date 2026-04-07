import axios from 'axios'
import { ProviderBase, ProviderSnapshot, UsageWindow } from './base'
import { readClaudeCredentials } from '../auth/credentials'
import { getClaudeSessionKey } from '../auth/chromeCookies'
import { CONFIG } from '../config'

interface OAuthUsageWindow {
  utilization?: number | null
  resets_at?: string | null
}

interface OAuthUsageResponse {
  five_hour?: OAuthUsageWindow | null
  seven_day?: OAuthUsageWindow | null
  seven_day_sonnet?: OAuthUsageWindow | null
  seven_day_opus?: OAuthUsageWindow | null
  seven_day_cowork?: OAuthUsageWindow | null
  extra_usage?: {
    is_enabled?: boolean
    monthly_limit?: number | null
    used_credits?: number | null
    utilization?: number | null
  } | null
}

interface OrgUsageResponse {
  session?: OAuthUsageWindow | null
  weekly?: OAuthUsageWindow | null
  sonnet?: OAuthUsageWindow | null
  opus?: OAuthUsageWindow | null
}

interface OverageResponse {
  spend_usd?: number
  limit_usd?: number
}

function parseWindow(data: OAuthUsageWindow | null | undefined, label: string): UsageWindow | null {
  if (!data) return null
  const usedPct = data.utilization ?? 0
  const remainingPct = 100 - usedPct
  return { label, usedPct, remainingPct, resetDate: data.resets_at ?? undefined }
}

export class ClaudeProvider extends ProviderBase {
  readonly name = 'Claude'

  async isAvailable(): Promise<boolean> {
    const creds = readClaudeCredentials()
    if (creds?.access_token) return true
    const cookie = await getClaudeSessionKey()
    return !!cookie
  }

  async fetch(): Promise<ProviderSnapshot> {
    let oauthError = ''
    let cookieError = ''

    // Tenta OAuth primeiro
    try {
      const snap = await this.fetchViaOAuth()
      if (snap) return snap
      oauthError = 'Credenciais não encontradas'
    } catch (e) {
      oauthError = (e as any)?.response?.data?.error?.message || (e as Error).message || String(e)
      console.warn('[Claude] OAuth failed:', oauthError)
    }

    // Fallback: cookies
    try {
      const snap = await this.fetchViaCookies()
      if (snap) return snap
      cookieError = 'Cookie sessionKey não encontrado'
    } catch (e) {
      cookieError = (e as any)?.response?.data?.error?.message || (e as Error).message || String(e)
      console.warn('[Claude] Cookies failed:', cookieError)
    }

    const detail = [oauthError && `OAuth: ${oauthError}`, cookieError && `Cookie: ${cookieError}`].filter(Boolean).join(' | ')
    return this.errorSnapshot(detail || 'Não foi possível obter dados do Claude.')
  }

  private async fetchViaOAuth(): Promise<ProviderSnapshot | null> {
    const creds = readClaudeCredentials()
    if (!creds?.access_token) return null

    const resp = await axios.get<OAuthUsageResponse>(CONFIG.api.claude.usage, {
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        'anthropic-beta': CONFIG.api.claude.beta,
      },
      timeout: 10000,
    })

    const data = resp.data
    const windows: UsageWindow[] = []

    const session = parseWindow(data.five_hour, 'Session (5h)')
    if (session) windows.push(session)

    const weekly = parseWindow(data.seven_day, 'Weekly')
    if (weekly) windows.push(weekly)

    const sonnet = parseWindow(data.seven_day_sonnet, 'Sonnet (weekly)')
    if (sonnet) windows.push(sonnet)

    const opus = parseWindow(data.seven_day_opus, 'Opus (weekly)')
    if (opus) windows.push(opus)

    const extraUsage = data.extra_usage
    // API returns values in "credits" (1000 credits = $1.00)
    const toUsd = (credits: number | null | undefined) =>
      credits != null ? credits / 1000 : undefined
    return this.makeSnapshot({
      source: 'oauth',
      windows,
      extraUsageSpendUsd: toUsd(extraUsage?.used_credits),
      extraUsageLimitUsd: toUsd(extraUsage?.monthly_limit),
    })
  }

  private async fetchViaCookies(): Promise<ProviderSnapshot | null> {
    const sessionKey = await getClaudeSessionKey()
    if (!sessionKey) return null

    const headers = { Cookie: `sessionKey=${sessionKey}` }

    // 1. Pega orgId
    const orgsResp = await axios.get<Array<{ id: string }>>(CONFIG.api.claude.organizations, {
      headers, timeout: 10000,
    })
    const orgId = orgsResp.data?.[0]?.id
    if (!orgId) throw new Error('No org found in Claude')

    // 2. Usage
    const usageResp = await axios.get<OrgUsageResponse>(
      `${CONFIG.api.claude.organizations}/${orgId}/usage`,
      { headers, timeout: 10000 }
    )

    // 3. Overage (pode falhar sem quebrar o resto)
    let overage: OverageResponse | undefined
    try {
      const overageResp = await axios.get<OverageResponse>(
        `${CONFIG.api.claude.organizations}/${orgId}/overage_spend_limit`,
        { headers, timeout: 10000 }
      )
      overage = overageResp.data
    } catch {}

    const data = usageResp.data
    const windows: UsageWindow[] = []

    const session = parseWindow(data.session, 'Session (5h)')
    if (session) windows.push(session)

    const weekly = parseWindow(data.weekly, 'Weekly')
    if (weekly) windows.push(weekly)

    const sonnet = parseWindow(data.sonnet, 'Sonnet (weekly)')
    if (sonnet) windows.push(sonnet)

    const opus = parseWindow(data.opus, 'Opus (weekly)')
    if (opus) windows.push(opus)

    return this.makeSnapshot({
      source: 'cookies',
      windows,
      extraUsageSpendUsd: overage?.spend_usd,
      extraUsageLimitUsd: overage?.limit_usd,
    })
  }
}
