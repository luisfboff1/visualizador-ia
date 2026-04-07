import { UsageWindow } from '../types'

interface Props {
  window: UsageWindow
}

function getColor(pct: number): 'green' | 'yellow' | 'red' {
  if (pct > 50) return 'green'
  if (pct > 25) return 'yellow'
  return 'red'
}

export function UsageBar({ window: w }: Props) {
  const color = getColor(w.remainingPct)
  const fillWidth = Math.max(0, Math.min(100, w.usedPct))

  return (
    <div className="usage-bar-wrapper">
      <div className="usage-bar-label-row">
        <span className="usage-bar-label">{w.label}</span>
        <span className={`usage-bar-pct ${color}`}>
          {`${Math.round(w.usedPct)}%`}
        </span>
      </div>
      <div className="usage-bar-track">
        <div
          className={`usage-bar-fill ${color}`}
          style={{ width: `${fillWidth}%` }}
        />
      </div>
      {w.resetDate && (
        <div className="usage-bar-reset">
          Renova: {new Date(w.resetDate).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
          })}
        </div>
      )}
    </div>
  )
}
