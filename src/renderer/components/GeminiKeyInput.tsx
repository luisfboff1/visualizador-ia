import { useState } from 'react'

interface Props {
  onSaved: () => void
}

export function GeminiKeyInput({ onSaved }: Props) {
  const [key, setKey] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSave = async () => {
    const trimmed = key.trim()
    if (!trimmed) return
    setStatus('saving')
    setErrorMsg('')
    try {
      const result = await window.api.saveGeminiKey(trimmed)
      if (result.ok) {
        setStatus('ok')
        setTimeout(() => {
          onSaved()
        }, 800)
      } else {
        setStatus('error')
        setErrorMsg('Erro ao salvar a chave.')
      }
    } catch (e) {
      setStatus('error')
      setErrorMsg((e as Error).message || 'Erro desconhecido')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
  }

  return (
    <div className="gemini-key-container">
      <p className="connect-hint">
        O Gemini usa uma <strong>API Key</strong> do Google AI Studio. É grátis!
      </p>
      <button
        className="connect-btn"
        onClick={() => window.api.openExternal('https://aistudio.google.com/apikey')}
      >
        Abrir AI Studio e obter key
      </button>
      <div className="gemini-key-input-row">
        <input
          className="gemini-key-input"
          type="password"
          placeholder="Cole sua API key aqui..."
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={status === 'saving' || status === 'ok'}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          className={`gemini-key-save-btn ${status === 'ok' ? 'saved' : ''}`}
          onClick={handleSave}
          disabled={!key.trim() || status === 'saving' || status === 'ok'}
        >
          {status === 'saving' ? '...' : status === 'ok' ? '✓' : 'Salvar'}
        </button>
      </div>
      {status === 'error' && (
        <p className="gemini-key-error">{errorMsg}</p>
      )}
    </div>
  )
}