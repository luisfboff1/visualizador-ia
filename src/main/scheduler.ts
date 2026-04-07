import { ClaudeProvider } from './providers/claude'
import { CodexProvider } from './providers/codex'
import { CopilotProvider } from './providers/copilot'
import { AllProvidersSnapshot, ProviderSnapshot } from './providers/base'
import { saveCache } from './store'

type RefreshCallback = (snapshot: AllProvidersSnapshot) => void

const claude = new ClaudeProvider()
const codex = new CodexProvider()
const copilot = new CopilotProvider()

let intervalId: NodeJS.Timeout | null = null
let isRunning = false
let lastSnapshot: AllProvidersSnapshot | null = null
let onUpdate: RefreshCallback | null = null
let lastRefreshAt = 0
const MIN_REFRESH_INTERVAL_MS = 30_000 // 30s cooldown between refreshes

export type SchedulerStatus = 'idle' | 'running' | 'error'
let status: SchedulerStatus = 'idle'

async function safeProviderFetch(
  provider: { fetch: () => Promise<ProviderSnapshot>; name: string },
  previous: ProviderSnapshot | null | undefined
): Promise<ProviderSnapshot | null> {
  try {
    const snap = await provider.fetch()
    // Se for rate-limit, preserva o snapshot anterior mas com uma nota
    if (snap.error?.toLowerCase().includes('rate limit') || snap.error?.toLowerCase().includes('rate_limit')) {
      if (previous && previous.source !== 'error') {
        console.warn(`[scheduler] ${provider.name} rate limited — keeping previous snapshot`)
        return { ...previous, error: 'Rate limited (exibindo dados anteriores)' }
      }
    }
    return snap
  } catch (e) {
    console.error(`[scheduler] ${provider.name} threw unexpectedly:`, e)
    return {
      provider: provider.name,
      available: false,
      source: 'error',
      error: (e as Error).message,
      lastUpdated: new Date().toISOString(),
      windows: [],
    }
  }
}

export async function runRefresh(): Promise<AllProvidersSnapshot> {
  if (isRunning) {
    return lastSnapshot ?? buildEmpty()
  }
  const now = Date.now()
  if (now - lastRefreshAt < MIN_REFRESH_INTERVAL_MS) {
    console.log('[scheduler] Skipping refresh — too soon')
    return lastSnapshot ?? buildEmpty()
  }

  isRunning = true
  lastRefreshAt = now
  status = 'running'

  try {
    const prev = lastSnapshot
    const [claudeSnap, codexSnap, copilotSnap] = await Promise.all([
      safeProviderFetch(claude, prev?.claude),
      safeProviderFetch(codex, prev?.codex),
      safeProviderFetch(copilot, prev?.copilot),
    ])

    const snapshot: AllProvidersSnapshot = {
      lastUpdated: new Date().toISOString(),
      claude: claudeSnap,
      codex: codexSnap,
      copilot: copilotSnap,
    }

    lastSnapshot = snapshot
    saveCache(snapshot)
    onUpdate?.(snapshot)
    status = 'idle'
    return snapshot
  } catch (e) {
    status = 'error'
    console.error('[scheduler] Refresh error:', e)
    return lastSnapshot ?? buildEmpty()
  } finally {
    isRunning = false
  }
}

export function startScheduler(intervalMs: number, callback: RefreshCallback): void {
  onUpdate = callback
  stopScheduler()

  // Roda imediatamente
  runRefresh()

  intervalId = setInterval(() => {
    runRefresh()
  }, intervalMs)
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

export function getLastSnapshot(): AllProvidersSnapshot | null {
  return lastSnapshot
}

export function getStatus(): SchedulerStatus {
  return status
}

export function setLastSnapshot(snapshot: AllProvidersSnapshot): void {
  lastSnapshot = snapshot
}

function buildEmpty(): AllProvidersSnapshot {
  return {
    lastUpdated: new Date().toISOString(),
    claude: null,
    codex: null,
    copilot: null,
  }
}
