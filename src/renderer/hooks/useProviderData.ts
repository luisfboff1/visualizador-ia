import { useState, useEffect, useCallback, useRef } from 'react'
import { AllProvidersSnapshot } from '../types'

const MANUAL_COOLDOWN_MS = 60_000

export function useProviderData() {
  const [snapshot, setSnapshot] = useState<AllProvidersSnapshot | null>(null)
  const [status, setStatus] = useState<string>('idle')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshLabel, setLastRefreshLabel] = useState<string>('—')
  const [refreshCooldown, setRefreshCooldown] = useState(0) // seconds remaining
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const unmounted = useRef(false)

  // Carrega dados no mount
  useEffect(() => {
    ;(async () => {
      const data = await window.api.getData()
      if (!unmounted.current && data) {
        setSnapshot(data)
        updateLabel(data.lastUpdated)
      } else if (!unmounted.current) {
        // Scheduler pode ter rodado antes do renderer estar pronto — força refresh
        setIsRefreshing(true)
        try {
          const fresh = await window.api.refresh()
          if (!unmounted.current) {
            setSnapshot(fresh)
            updateLabel(fresh.lastUpdated)
          }
        } finally {
          if (!unmounted.current) setIsRefreshing(false)
        }
      }
    })()

    // Escuta updates em tempo real do scheduler
    const unsub = window.api.onDataUpdated((data) => {
      if (!unmounted.current) {
        setSnapshot(data)
        updateLabel(data.lastUpdated)
        setIsRefreshing(false)
      }
    })

    return () => {
      unmounted.current = true
      unsub()
    }
  }, [])

  // Atualiza label "X min atrás" a cada 30s
  useEffect(() => {
    if (!snapshot) return
    const interval = setInterval(() => updateLabel(snapshot.lastUpdated), 30_000)
    return () => clearInterval(interval)
  }, [snapshot])

  const refresh = useCallback(async () => {
    if (isRefreshing || refreshCooldown > 0) return
    setIsRefreshing(true)
    try {
      const data = await window.api.refresh()
      setSnapshot(data)
      updateLabel(data.lastUpdated)
    } finally {
      setIsRefreshing(false)
      // Start cooldown
      let secs = MANUAL_COOLDOWN_MS / 1000
      setRefreshCooldown(secs)
      cooldownRef.current = setInterval(() => {
        secs -= 1
        if (secs <= 0) {
          clearInterval(cooldownRef.current!)
          setRefreshCooldown(0)
        } else {
          setRefreshCooldown(secs)
        }
      }, 1000)
    }
  }, [isRefreshing, refreshCooldown])

  function updateLabel(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) setLastRefreshLabel('agora mesmo')
    else if (diff < 3600) setLastRefreshLabel(`${Math.floor(diff / 60)}m atrás`)
    else setLastRefreshLabel(`${Math.floor(diff / 3600)}h atrás`)
  }

  return { snapshot, status, isRefreshing, lastRefreshLabel, refresh, refreshCooldown }
}
