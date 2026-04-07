export type DataSource = 'oauth' | 'cookies' | 'playwright' | 'device-flow' | 'error' | 'loading'

export interface UsageWindow {
  usedPct: number        // 0-100
  remainingPct: number   // 0-100
  resetDate?: string     // ISO string ou texto legível
  label: string          // ex: "Session (5h)", "Weekly"
}

export interface ModelUsage {
  name: string
  requests: number
  grossUsd: number
  billedUsd: number
}

export interface ProviderSnapshot {
  provider: string
  available: boolean
  source: DataSource
  error?: string
  lastUpdated: string    // ISO date

  windows: UsageWindow[]

  // Claude específico
  extraUsageSpendUsd?: number
  extraUsageLimitUsd?: number

  // Codex específico
  creditsRemaining?: number

  // Copilot específico
  requestsUsed?: number
  requestsTotal?: number
  models?: ModelUsage[]
  billedUsd?: number
  resetDate?: string
  plan?: string
}

export interface AllProvidersSnapshot {
  lastUpdated: string
  claude: ProviderSnapshot | null
  codex: ProviderSnapshot | null
  copilot: ProviderSnapshot | null
}

export abstract class ProviderBase {
  abstract readonly name: string

  abstract isAvailable(): Promise<boolean>
  abstract fetch(): Promise<ProviderSnapshot>

  protected makeSnapshot(partial: Partial<ProviderSnapshot> & { source: DataSource }): ProviderSnapshot {
    return {
      provider: this.name,
      available: true,
      lastUpdated: new Date().toISOString(),
      windows: [],
      ...partial,
    }
  }

  protected errorSnapshot(error: string): ProviderSnapshot {
    return {
      provider: this.name,
      available: false,
      source: 'error',
      error,
      lastUpdated: new Date().toISOString(),
      windows: [],
    }
  }
}
