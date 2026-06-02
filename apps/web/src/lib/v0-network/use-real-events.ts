"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { EventItem } from "@/lib/types"
import { getRecentEvents } from "@/lib/ids-core"

const POLL_INTERVAL = 5000
const MAX_EVENTS = 500

export interface RealEventsState {
  events: EventItem[]
  isLoading: boolean
  error: string | null
  source: "real" | "mock"
  lastUpdated: number | null
  apiAvailable: boolean
}

export function useRealEvents() {
  const [state, setState] = useState<RealEventsState>({
    events: [],
    isLoading: true,
    error: null,
    source: "mock",
    lastUpdated: null,
    apiAvailable: false,
  })

  const seenIdsRef = useRef<Set<string>>(new Set())
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  const fetchEvents = useCallback(async () => {
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const items = await getRecentEvents(50)

      if (!mountedRef.current || controller.signal.aborted) return

      const deduped: EventItem[] = []
      for (const item of items) {
        if (!seenIdsRef.current.has(item.id)) {
          seenIdsRef.current.add(item.id)
          deduped.push(item)
        }
      }

      setState((prev) => {
        const merged = [...deduped, ...prev.events].slice(0, MAX_EVENTS)
        return {
          events: merged,
          isLoading: false,
          error: null,
          source: "real",
          lastUpdated: Date.now(),
          apiAvailable: true,
        }
      })
    } catch (err) {
      if (!mountedRef.current || controller.signal.aborted) return
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Error desconocido",
        source: "mock",
        apiAvailable: false,
      }))
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchEvents()
    const interval = setInterval(fetchEvents, POLL_INTERVAL)
    return () => {
      mountedRef.current = false
      if (abortRef.current) abortRef.current.abort()
      clearInterval(interval)
    }
  }, [fetchEvents])

  const retry = useCallback(() => {
    fetchEvents()
  }, [fetchEvents])

  return { ...state, retry }
}
