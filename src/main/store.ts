import fs from 'fs'
import path from 'path'
import os from 'os'
import { AllProvidersSnapshot } from './providers/base'

const CACHE_PATH = path.join(os.homedir(), '.ai-usage-dashboard', 'cache.json')
const CONFIG_PATH = path.join(os.homedir(), '.ai-usage-dashboard', 'config.json')

export interface AppConfig {
  refreshIntervalMs: number
  providers: {
    claude: boolean
    codex: boolean
    copilot: boolean
  }
  copilotToken?: string
  githubCustomerId?: string
}

const DEFAULT_CONFIG: AppConfig = {
  refreshIntervalMs: 5 * 60 * 1000,
  providers: {
    claude: true,
    codex: true,
    copilot: true,
  },
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// --- Cache (snapshot de dados) ---

export function loadCache(): AllProvidersSnapshot | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8')
    return JSON.parse(raw) as AllProvidersSnapshot
  } catch {
    return null
  }
}

export function saveCache(snapshot: AllProvidersSnapshot): void {
  try {
    ensureDir(CACHE_PATH)
    fs.writeFileSync(CACHE_PATH, JSON.stringify(snapshot, null, 2), 'utf-8')
  } catch (e) {
    console.error('[store] Failed to save cache:', e)
  }
}

// --- Config (settings do usuário) ---

export function loadConfig(): AppConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return { ...DEFAULT_CONFIG }
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) } as AppConfig
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(config: AppConfig): void {
  try {
    ensureDir(CONFIG_PATH)
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
  } catch (e) {
    console.error('[store] Failed to save config:', e)
  }
}

export function updateConfig(partial: Partial<AppConfig>): AppConfig {
  const current = loadConfig()
  const updated = { ...current, ...partial }
  saveConfig(updated)
  return updated
}
