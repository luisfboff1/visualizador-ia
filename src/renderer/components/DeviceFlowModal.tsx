import { useEffect, useState } from 'react'

interface Props {
  onClose: () => void
  onAuthorized: () => void
}

type FlowState = 'loading' | 'waiting' | 'polling' | 'error'

export function DeviceFlowModal({ onClose, onAuthorized }: Props) {
  const [state, setState] = useState<FlowState>('loading')
  const [userCode, setUserCode] = useState('')
  const [verificationUri, setVerificationUri] = useState('')
  const [deviceCode, setDeviceCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const result = await window.api.startDeviceFlow()
        setUserCode(result.userCode)
        setVerificationUri(result.verificationUri)
        setDeviceCode(result.deviceCode)
        setState('waiting')
      } catch (e: any) {
        setErrorMsg(e?.message || 'Falha ao iniciar Device Flow')
        setState('error')
      }
    })()
  }, [])

  const handleCopyCode = () => {
    if (userCode) navigator.clipboard.writeText(userCode)
  }

  const handleOpenBrowser = () => {
    if (verificationUri) window.open(verificationUri, '_blank')
  }

  const handleStartPolling = async () => {
    if (!deviceCode) return
    setState('polling')
    try {
      await window.api.pollDeviceFlow(deviceCode)
      onAuthorized()
    } catch (e: any) {
      setErrorMsg(e?.message || 'Autorização falhou ou expirou')
      setState('error')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Conectar GitHub Copilot</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {state === 'loading' && (
          <div className="modal-body">
            <p>Iniciando Device Flow...</p>
          </div>
        )}

        {state === 'waiting' && (
          <div className="modal-body">
            <p>Acesse o link abaixo e insira o código:</p>
            <div className="device-code" onClick={handleCopyCode} title="Clique para copiar">
              {userCode}
            </div>
            <p className="device-hint">Clique no código para copiar</p>
            <div className="modal-actions">
              <button className="modal-btn secondary" onClick={handleOpenBrowser}>
                Abrir {verificationUri || 'github.com/login/device'}
              </button>
              <button className="modal-btn primary" onClick={handleStartPolling}>
                Já autorizei →
              </button>
            </div>
          </div>
        )}

        {state === 'polling' && (
          <div className="modal-body">
            <p>Aguardando autorização no GitHub...</p>
            <div className="device-code polling">{userCode}</div>
          </div>
        )}

        {state === 'error' && (
          <div className="modal-body">
            <p className="error-text">{errorMsg}</p>
            <button className="modal-btn secondary" onClick={onClose}>Fechar</button>
          </div>
        )}
      </div>
    </div>
  )
}
