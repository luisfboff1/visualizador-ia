// Tipos espelhados do main process (sem importar o módulo Node)
export type DataSource = 'oauth' | 'cookies' | 'playwright' | 'device-flow' | 'error' | 'loading'

export interface UsageWindow {
  usedPct: number
  remainingPct: number
  resetDate?: string
  label: string
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
  lastUpdated: string
  windows: UsageWindow[]
  extraUsageSpendUsd?: number
  extraUsageLimitUsd?: number
  creditsRemaining?: number
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

export interface AppConfig {
  refreshIntervalMs: number
  providers: { claude: boolean; codex: boolean; copilot: boolean }
  copilotToken?: string
  githubCustomerId?: string
}

declare global {
  interface Window {
    api: {
      getData: () => Promise<AllProvidersSnapshot | null>
      refresh: () => Promise<AllProvidersSnapshot>
      getStatus: () => Promise<string>
      getConfig: () => Promise<AppConfig>
      updateConfig: (partial: Partial<AppConfig>) => Promise<AppConfig>
      startDeviceFlow: () => Promise<{ userCode: string; verificationUri: string; deviceCode: string; expiresIn: number }>
      pollDeviceFlow: (deviceCode: string) => Promise<{ token: string }>
      onDataUpdated: (cb: (data: AllProvidersSnapshot) => void) => () => void
      openExternal: (url: string) => Promise<void>
      diagnose: () => Promise<{
        claude: { hasCredentials: boolean; tokenPrefix: string | null }
        codex: { hasCredentials: boolean; tokenPrefix: string | null }
        copilot: { hasSavedToken: boolean }
      }>
      rawFetch: () => Promise<{ status?: number; data?: unknown; error?: string; raw?: string }>
      rawFetchCodex: () => Promise<{ status?: number; data?: unknown; error?: string; raw?: string }>
      rawFetchCopilot: () => Promise<{ status?: number; data?: unknown; error?: string; raw?: string }>
      hideWindow: () => Promise<void>
      toggleAlwaysOnTop: () => Promise<boolean>
      checkUpdate: () => Promise<{ hasUpdate: boolean; latestVersion: string; url: string }>
    }
  }
}
