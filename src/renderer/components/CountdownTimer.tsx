import { useEffect, useState } from 'react'

interface Props {
  resetDate?: string
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const s = Math.floor(ms / 1000)
  const totalHours = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (totalHours >= 24) {
    const d = Math.floor(totalHours / 24)
    const h = totalHours % 24
    return `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  return [totalHours, m, sec].map((v) => String(v).padStart(2, '0')).join(':')
}

export function CountdownTimer({ resetDate }: Props) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!resetDate) return
    const target = new Date(resetDate).getTime()
    const tick = () => setRemaining(Math.max(0, target - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [resetDate])

  if (!resetDate) return null

  return (
    <div className="countdown-timer">
      <span className="countdown-label">Reset em</span>
      <span className="countdown-value">{formatCountdown(remaining)}</span>
    </div>
  )
}
