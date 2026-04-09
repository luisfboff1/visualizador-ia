import { useState } from 'react'
import { useProviderData } from './hooks/useProviderData'
import { ProviderCard } from './components/ProviderCard'

export function App() {
  const [diagInfo, setDiagInfo] = useState<string | null>(null)
  const [pinned, setPinned] = useState(true)
  const [updateInfo, setUpdateInfo] = useState<{ hasUpdate: boolean; latestVersion: string; url: string } | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const { snapshot, isRefreshing, lastRefreshLabel, refresh, refreshCooldown } = useProviderData()

  const isLoading = isRefreshing && snapshot === null

  const handlePin = async () => {
    const next = await window.api.toggleAlwaysOnTop()
    setPinned(next as boolean)
  }

  const handleClose = () => {
    window.api.hideWindow()
  }

  const runDiag = async () => {
    const d = await window.api.diagnose()
    const lines = [
      `Claude: ${d.claude.hasCredentials ? `✓ token ${d.claude.tokenPrefix}...` : '✗ sem credenciais'}`,
      `Codex: ${d.codex.hasCredentials ? `✓ token ${d.codex.tokenPrefix}...` : '✗ sem credenciais'}`,
      `Copilot: ${d.copilot.hasSavedToken ? '✓ token salvo' : '✗ não autenticado'}`,
    ]
    setDiagInfo(lines.join('\n'))
    setTimeout(() => setDiagInfo(null), 12000)
  }

  const runRawFetch = async () => {
    setDiagInfo('Buscando raw Claude...')
    const r = await window.api.rawFetch()
    setDiagInfo(JSON.stringify(r, null, 2))
    setTimeout(() => setDiagInfo(null), 30000)
  }

  const runRawFetchCodex = async () => {
    setDiagInfo('Buscando raw Codex...')
    const r = await window.api.rawFetchCodex()
    setDiagInfo(JSON.stringify(r, null, 2))
    setTimeout(() => setDiagInfo(null), 30000)
  }

  const runRawFetchCopilot = async () => {
    setDiagInfo('Buscando raw Copilot...')
    const r = await window.api.rawFetchCopilot()
    setDiagInfo(JSON.stringify(r, null, 2))
    setTimeout(() => setDiagInfo(null), 30000)
  }

  const checkUpdate = async () => {
    setCheckingUpdate(true)
    setUpdateInfo(null)
    const result = await window.api.checkUpdate()
    setCheckingUpdate(false)
    setUpdateInfo(result)
    if (!result.hasUpdate) {
      setTimeout(() => setUpdateInfo(null), 4000)
    }
  }

  return (
    <div className="app">
      <div className="title-bar">
        <span className="title-bar-name">AI Usage Dashboard</span>
        <div className="title-bar-controls">
          <button
            className={`titlebar-btn pin-btn ${pinned ? 'active' : ''}`}
            onClick={handlePin}
            title={pinned ? 'Desafixar janela' : 'Manter sempre visível'}
          >📌</button>
          <button
            className="titlebar-btn close-btn"
            onClick={handleClose}
            title="Minimizar para bandeja"
          >✕</button>
        </div>
      </div>

      <div className="content">
        <ProviderCard
          snapshot={snapshot?.claude ?? null}
          providerKey="claude"
          onRefreshNeeded={refresh}
          isLoading={isLoading}
        />
        <ProviderCard
          snapshot={snapshot?.codex ?? null}
          providerKey="codex"
          onRefreshNeeded={refresh}
          isLoading={isLoading}
        />
        <ProviderCard
          snapshot={snapshot?.copilot ?? null}
          providerKey="copilot"
          onRefreshNeeded={refresh}
          isLoading={isLoading}
        />
      </div>

      {diagInfo && (
        <pre className="diag-overlay">{diagInfo}</pre>
      )}

      {updateInfo && (
        <div className={`update-banner ${updateInfo.hasUpdate ? 'has-update' : 'up-to-date'}`}>
          {updateInfo.hasUpdate ? (
            <>
              <span>Nova versão disponível: <strong>v{updateInfo.latestVersion}</strong></span>
              <button className="update-download-btn" onClick={() => window.api.openExternal(updateInfo.url)}>Baixar</button>
            </>
          ) : (
            <span>✓ Você está na versão mais recente</span>
          )}
        </div>
      )}

      <div className="footer">
        <span className="footer-last">Atualizado: {lastRefreshLabel}</span>
        <div className="footer-actions">
          <button className="diag-btn" onClick={runDiag} title="Diagnóstico de credenciais">⚙</button>
          <button className="diag-btn" onClick={runRawFetch} title="Raw API Claude">🔍C</button>
          <button className="diag-btn" onClick={runRawFetchCodex} title="Raw API Codex">🔍X</button>
          <button className="diag-btn" onClick={runRawFetchCopilot} title="Raw API Copilot">🔍G</button>
          <button
            className="diag-btn"
            onClick={checkUpdate}
            disabled={checkingUpdate}
            title="Verificar atualização"
          >{checkingUpdate ? '…' : '⬆'}</button>
          <button
            className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={refresh}
            disabled={isRefreshing || refreshCooldown > 0}
            title={refreshCooldown > 0 ? `Aguarde ${refreshCooldown}s` : 'Atualizar agora'}
          >
            {refreshCooldown > 0 ? `${refreshCooldown}s` : '↻'}
          </button>
        </div>
      </div>
    </div>
  )
}
