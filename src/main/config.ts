import path from 'path'
import os from 'os'

const HOME = os.homedir()
const LOCALAPPDATA = process.env.LOCALAPPDATA || path.join(HOME, 'AppData', 'Local')
const APPDATA = process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming')

export const CONFIG = {
  // Paths dos providers
  paths: {
    claude: {
      credentials: path.join(HOME, '.claude', '.credentials.json'),
      credentialsFallback: path.join(APPDATA, 'claude', '.credentials.json'),
    },
    codex: {
      auth: path.join(HOME, '.codex', 'auth.json'),
      authFallback: path.join(APPDATA, 'codex', 'auth.json'),
    },
    chrome: {
      userData: path.join(LOCALAPPDATA, 'Google', 'Chrome', 'User Data'),
      cookies: path.join(LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Default', 'Cookies'),
      localState: path.join(LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Local State'),
    },
    edge: {
      userData: path.join(LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data'),
      cookies: path.join(LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cookies'),
      localState: path.join(LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data', 'Local State'),
    },
  },

  // Endpoints das APIs
  api: {
    claude: {
      usage: 'https://api.anthropic.com/api/oauth/usage',
      organizations: 'https://claude.ai/api/organizations',
      beta: 'oauth-2025-04-20',
    },
    codex: {
      usage: 'https://chatgpt.com/backend-api/wham/usage',
      usagePage: 'https://chatgpt.com/codex/settings/usage',
    },
    copilot: {
      user: 'https://api.github.com/copilot_internal/user',
      deviceCode: 'https://github.com/login/device/code',
      accessToken: 'https://github.com/login/oauth/access_token',
      billingPage: 'https://github.com/settings/billing/premium_requests_usage',
      // Client ID público do VSCode (mesmo usado pelo CodexBar)
      clientId: 'Iv1.b507a08c87ecfe98',
      scope: 'read:user',
    },
  },

  // Refresh
  refresh: {
    defaultIntervalMs: 5 * 60 * 1000, // 5 minutos
    staleAfterMs: 10 * 60 * 1000,     // 10 minutos → dados "velhos"
  },
} as const
