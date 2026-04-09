import { app, BrowserWindow, ipcMain, shell, Tray, Menu, screen } from 'electron'
import path from 'path'
import https from 'https'
import { loadCache, loadConfig, updateConfig } from './store'
import { startScheduler, runRefresh, getLastSnapshot, getStatus, setLastSnapshot } from './scheduler'
import { startDeviceFlow, pollForToken } from './auth/githubDeviceFlow'
import { readClaudeCredentials, readCodexAuth } from './auth/credentials'
import { AllProvidersSnapshot } from './providers/base'
import { createTrayNativeImage } from './trayIcon'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function positionWindow(win: BrowserWindow) {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const [ww, wh] = win.getSize()
  win.setPosition(sw - ww - 16, sh - wh - 16)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 720,
    minWidth: 360,
    minHeight: 400,
    backgroundColor: '#0f0f13',
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  positionWindow(mainWindow)

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist-renderer', 'index.html'))
  }

  // Hide to tray instead of closing
  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow?.hide()
    updateTrayMenu()
  })

  mainWindow.on('show', () => updateTrayMenu())
  mainWindow.on('hide', () => updateTrayMenu())

  // Auto-hide when clicking outside the widget (production only)
  if (!isDev) {
    mainWindow.on('blur', () => {
      mainWindow?.hide()
      updateTrayMenu()
    })
  }
}

function updateTrayMenu() {
  if (!tray) return
  const isVisible = mainWindow?.isVisible() ?? false
  const menu = Menu.buildFromTemplate([
    {
      label: isVisible ? 'Ocultar' : 'Mostrar',
      click: () => {
        if (mainWindow?.isVisible()) {
          mainWindow.hide()
        } else {
          mainWindow?.show()
          mainWindow?.focus()
          if (mainWindow) positionWindow(mainWindow)
        }
        updateTrayMenu()
      },
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        tray?.destroy()
        app.exit(0)
      },
    },
  ])
  tray.setContextMenu(menu)
}

function createTray() {
  const icon = createTrayNativeImage()
  tray = new Tray(icon)
  tray.setToolTip('AI Usage Dashboard')

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
      if (mainWindow) positionWindow(mainWindow)
    }
    updateTrayMenu()
  })

  updateTrayMenu()
}

// --- IPC Handlers ---

ipcMain.handle('get-data', (): AllProvidersSnapshot | null => {
  return getLastSnapshot()
})

ipcMain.handle('refresh', async (): Promise<AllProvidersSnapshot> => {
  return await runRefresh()
})

ipcMain.handle('get-status', () => {
  return getStatus()
})

ipcMain.handle('get-config', () => {
  return loadConfig()
})

ipcMain.handle('update-config', (_event, partial: object) => {
  return updateConfig(partial as Parameters<typeof updateConfig>[0])
})

ipcMain.handle('start-device-flow', async () => {
  const flow = await startDeviceFlow()
  // Abre URL no browser padrão
  shell.openExternal(flow.verificationUri)
  return flow
})

ipcMain.handle('poll-device-flow', async (_event, deviceCode: string) => {
  const token = await pollForToken(deviceCode)
  return { token }
})

ipcMain.handle('open-external', (_event, url: string) => {
  shell.openExternal(url)
})

ipcMain.handle('raw-fetch', async () => {
  const creds = readClaudeCredentials()
  if (!creds?.access_token) return { error: 'No Claude credentials' }
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/api/oauth/usage',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${creds.access_token}`,
        'anthropic-beta': 'oauth-2025-04-20',
        'User-Agent': 'visualizador-ia/1.0',
      },
      timeout: 12000,
    }
    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) })
        } catch {
          resolve({ status: res.statusCode, raw: body })
        }
      })
    })
    req.on('error', (e) => resolve({ error: e.message }))
    req.on('timeout', () => { req.destroy(); resolve({ error: 'Timeout após 12s' }) })
    req.end()
  })
})

ipcMain.handle('raw-fetch-copilot', async () => {
  const config = loadConfig()
  const token = config.copilotToken
  if (!token) return { error: 'No Copilot token saved' }
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/copilot_internal/user',
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/json',
        'Editor-Version': 'vscode/1.96.2',
        'Editor-Plugin-Version': 'copilot-chat/0.26.7',
        'User-Agent': 'GitHubCopilotChat/0.26.7',
        'X-Github-Api-Version': '2025-04-01',
      },
      timeout: 12000,
    }
    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) })
        } catch {
          resolve({ status: res.statusCode, raw: body.substring(0, 2000) })
        }
      })
    })
    req.on('error', (e: Error) => resolve({ error: e.message }))
    req.on('timeout', () => { req.destroy(); resolve({ error: 'Timeout após 12s' }) })
    req.end()
  })
})

ipcMain.handle('raw-fetch-codex', async () => {
  const codex = readCodexAuth()
  if (!codex?.access_token) return { error: 'No Codex credentials' }
  const token = codex.access_token

  function doRequest(url: string, redirectsLeft: number): Promise<unknown> {
    return new Promise((resolve) => {
      const parsed = new URL(url)
      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 12000,
      }
      const req = https.request(options, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && redirectsLeft > 0) {
          resolve(doRequest(res.headers.location, redirectsLeft - 1))
          return
        }
        let body = ''
        res.on('data', (chunk: Buffer) => { body += chunk })
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) })
          } catch {
            resolve({ status: res.statusCode, raw: body.substring(0, 2000) })
          }
        })
      })
      req.on('error', (e: Error) => resolve({ error: e.message }))
      req.on('timeout', () => { req.destroy(); resolve({ error: 'Timeout após 12s' }) })
      req.end()
    })
  }

  return doRequest('https://chatgpt.com/backend-api/wham/usage', 5)
})

ipcMain.handle('diagnose', () => {
  const claude = readClaudeCredentials()
  const codex = readCodexAuth()
  const config = loadConfig()
  return {
    claude: {
      hasCredentials: !!claude,
      tokenPrefix: claude?.access_token?.substring(0, 20) ?? null,
    },
    codex: {
      hasCredentials: !!codex,
      tokenPrefix: codex?.access_token?.substring(0, 20) ?? null,
    },
    copilot: {
      hasSavedToken: !!config.copilotToken,
    },
  }
})

// --- Window control IPC ---

ipcMain.handle('hide-window', () => {
  mainWindow?.hide()
  updateTrayMenu()
})

ipcMain.handle('toggle-always-on-top', () => {
  if (!mainWindow) return false
  const next = !mainWindow.isAlwaysOnTop()
  mainWindow.setAlwaysOnTop(next)
  return next
})

ipcMain.handle('check-update', (): Promise<{ hasUpdate: boolean; latestVersion: string; url: string }> => {
  const currentVersion = app.getVersion()
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/luisfboff1/visualizador-ia/releases/latest',
      method: 'GET',
      headers: { 'User-Agent': 'visualizador-ia', 'Accept': 'application/vnd.github+json' },
      timeout: 8000,
    }
    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(body) as { tag_name?: string; html_url?: string }
          const latestVersion = (json.tag_name ?? '').replace(/^v/, '')
          const hasUpdate = !!latestVersion && latestVersion !== currentVersion
          resolve({ hasUpdate, latestVersion, url: json.html_url ?? 'https://github.com/luisfboff1/visualizador-ia/releases' })
        } catch {
          resolve({ hasUpdate: false, latestVersion: currentVersion, url: '' })
        }
      })
    })
    req.on('error', () => resolve({ hasUpdate: false, latestVersion: currentVersion, url: '' }))
    req.on('timeout', () => { req.destroy(); resolve({ hasUpdate: false, latestVersion: currentVersion, url: '' }) })
    req.end()
  })
})

// --- App lifecycle ---

app.whenReady().then(() => {
  createWindow()
  createTray()

  // Carrega cache salvo imediatamente para exibir dados enquanto fetch ocorre
  const cached = loadCache()
  if (cached) setLastSnapshot(cached)

  const config = loadConfig()

  // Inicia o scheduler de refresh
  startScheduler(config.refreshIntervalMs, (snapshot) => {
    mainWindow?.webContents.send('data-updated', snapshot)
  })

  app.on('activate', () => {
    if (!mainWindow?.isVisible()) {
      mainWindow?.show()
    }
  })
})

// Manter app vivo no tray mesmo sem janelas
app.on('window-all-closed', () => {
  // não faz nada — app vive no tray
})
