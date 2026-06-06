"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { EventStats } from "@/lib/types"
import { getStats } from "@/lib/ids-core"

const POLL_INTERVAL = 10000

export interface EventStatsState {
  stats: EventStats | null
  isLoading: boolean
  error: string | null
  apiAvailable: boolean
}

export function useEventStats(windowSeconds = 300) {
  const [state, setState] = useState<EventStatsState>({
    stats: null,
    isLoading: true,
    error: null,
    apiAvailable: false,
  })

  const mountedRef = useRef(true)
  const abortRef = useRef<AbortController | null>(null)

  const fetchStats = useCallback(async () => {
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const data = await getStats(windowSeconds)
      if (!mountedRef.current || controller.signal.aborted) return
      setState({ stats: data, isLoading: false, error: null, apiAvailable: true })
    } catch (err) {
      if (!mountedRef.current || controller.signal.aborted) return
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Error",
      }))
    }
  }, [windowSeconds])

  useEffect(() => {
    mountedRef.current = true
    fetchStats()
    const interval = setInterval(fetchStats, POLL_INTERVAL)
    return () => {
      mountedRef.current = false
      if (abortRef.current) abortRef.current.abort()
      clearInterval(interval)
    }
  }, [fetchStats])

  return state
}
