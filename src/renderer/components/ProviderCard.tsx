import { useState } from 'react'
import { ProviderSnapshot, DataSource } from '../types'
import { UsageBar } from './UsageBar'
import { ModelTable } from './ModelTable'
import { CountdownTimer } from './CountdownTimer'
import { DeviceFlowModal } from './DeviceFlowModal'

interface Props {
  snapshot: ProviderSnapshot | null
  providerKey: 'claude' | 'codex' | 'copilot'
  onRefreshNeeded: () => void
  isLoading?: boolean
}

const SOURCE_LABELS: Record<DataSource, string> = {
  oauth: 'OAuth',
  cookies: 'Cookies',
  playwright: 'Playwright',
  'device-flow': 'Device Flow',
  error: 'Erro',
  loading: 'Carregando',
}

export function ProviderCard({ snapshot, providerKey, onRefreshNeeded, isLoading }: Props) {
  const [showDeviceFlow, setShowDeviceFlow] = useState(false)

  const providerName = snapshot?.provider ?? providerKey
  const isConnected = snapshot?.available ?? false

  const handleAuthorized = () => {
    setShowDeviceFlow(false)
    onRefreshNeeded()
  }

  // Selecionamos a janela principal para o countdown (a que tem resetDate)
  const mainWindow = snapshot?.windows?.find((w) => w.resetDate)

  return (
    <>
      <div className={`provider-card ${isConnected ? 'connected' : 'disconnected'}`}>
        <div className="provider-card-header">
          <div className="provider-name-row">
            <span className={`provider-dot ${providerKey}`} />
            <span className="provider-name">{providerName}</span>
          </div>
          <div className="provider-meta">
            {isConnected && snapshot?.source && (
              <span className={`source-badge ${snapshot.source}`}>
                {SOURCE_LABELS[snapshot.source]}
              </span>
            )}
            {snapshot?.lastUpdated && (
              <span className="provider-time">
                {new Date(snapshot.lastUpdated).toLocaleTimeString('pt-BR', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>

        {isConnected ? (
          <div className="provider-body">
            {snapshot!.windows.map((w) => (
              <UsageBar key={w.label} window={w} />
            ))}

            {(snapshot!.creditsRemaining !== undefined ||
              snapshot!.requestsUsed !== undefined ||
              snapshot!.extraUsageSpendUsd !== undefined) && (
              <div className="provider-extra">
                {snapshot!.creditsRemaining !== undefined && (
                  <div className="extra-row">
                    <span className="extra-label">Créditos restantes</span>
                    <span className="extra-value">{snapshot!.creditsRemaining}</span>
                  </div>
                )}
                {snapshot!.requestsUsed !== undefined && (
                  <div className="extra-row">
                    <span className="extra-label">Requests usados</span>
                    <span className="extra-value">
                      {snapshot!.requestsUsed}{snapshot!.requestsTotal !== undefined ? ` / ${snapshot!.requestsTotal}` : ''}
                    </span>
                  </div>
                )}
                {snapshot!.extraUsageSpendUsd !== undefined && (
                  <div className="extra-row">
                    <span className="extra-label">Uso extra</span>
                    <span className="extra-value">
                      R${snapshot!.extraUsageSpendUsd?.toFixed(2)}{snapshot!.extraUsageLimitUsd !== undefined ? ` / R$${snapshot!.extraUsageLimitUsd?.toFixed(2)}` : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            {snapshot!.models && snapshot!.models.length > 0 && (
              <ModelTable models={snapshot!.models} />
            )}

            <CountdownTimer resetDate={mainWindow?.resetDate} />
          </div>
        ) : isLoading || snapshot === null ? (
          <div className="error-state">
            <p className="error-message loading-text">Buscando dados...</p>
          </div>
        ) : (
          <div className="error-state">
            {snapshot.error ? (
              <p className="error-message">{snapshot.error}</p>
            ) : (
              <p className="error-message">Não conectado</p>
            )}

            {providerKey === 'claude' && (
              <div className="connect-options">
                <p className="connect-hint">
                  O Claude lê credenciais do <strong>Claude Desktop</strong> ou cookies do Chrome.
                </p>
                <button
                  className="connect-btn"
                  onClick={() => window.api.openExternal('https://claude.ai/login')}
                >
                  Abrir claude.ai e fazer login
                </button>
                <button
                  className="connect-btn secondary"
                  onClick={() => window.api.openExternal('https://docs.anthropic.com/en/docs/claude-cli')}
                >
                  Instalar Claude CLI
                </button>
              </div>
            )}

            {providerKey === 'codex' && (
              <div className="connect-options">
                <p className="connect-hint">
                  O Codex lê credenciais do <strong>Codex CLI</strong> (~/.codex/auth.json).
                </p>
                <button
                  className="connect-btn"
                  onClick={() => window.api.openExternal('https://chatgpt.com/login')}
                >
                  Abrir ChatGPT e fazer login
                </button>
                <button
                  className="connect-btn secondary"
                  onClick={() => window.api.openExternal('https://github.com/openai/codex')}
                >
                  Instalar Codex CLI
                </button>
              </div>
            )}

            {providerKey === 'copilot' && (
              <button
                className="connect-btn"
                onClick={() => setShowDeviceFlow(true)}
              >
                Conectar com GitHub
              </button>
            )}
          </div>
        )}
      </div>

      {showDeviceFlow && (
        <DeviceFlowModal
          onClose={() => setShowDeviceFlow(false)}
          onAuthorized={handleAuthorized}
        />
      )}
    </>
  )
}
