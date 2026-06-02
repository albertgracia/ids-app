"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { EventItem } from "@/lib/types"

const SSE_URL = "/api/core/api/v1/events/stream"
const MAX_EVENTS = 500

export type LiveStatus = "connecting" | "live" | "reconnecting" | "error"

export interface LiveEventsState {
  liveEvents: EventItem[]
  status: LiveStatus
  lastEventAt: number | null
  error: string | null
  reconnectCount: number
  isLive: boolean
}

export function useLiveEvents() {
  const [state, setState] = useState<LiveEventsState>({
    liveEvents: [],
    status: "connecting",
    lastEventAt: null,
    error: null,
    reconnectCount: 0,
    isLive: false,
  })

  const seenIdsRef = useRef<Set<string>>(new Set())
  const esRef = useRef<EventSource | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    setState((prev) => ({ ...prev, status: "connecting", error: null }))

    const es = new EventSource(SSE_URL)
    esRef.current = es

    es.addEventListener("connected", () => {
      if (!mountedRef.current) return
      setState((prev) => ({ ...prev, status: "live", isLive: true, error: null }))
    })

    es.addEventListener("ids_event", (event: MessageEvent) => {
      if (!mountedRef.current) return
      try {
        const item: EventItem = JSON.parse(event.data)
        if (!item || !item.id) return
        if (seenIdsRef.current.has(item.id)) return
        seenIdsRef.current.add(item.id)

        setState((prev) => {
          const events = [item, ...prev.liveEvents].slice(0, MAX_EVENTS)
          return {
            ...prev,
            liveEvents: events,
            lastEventAt: Date.now(),
            status: "live",
            isLive: true,
            error: null,
          }
        })
      } catch {
        // skip malformed events
      }
    })

    es.addEventListener("heartbeat", () => {
      if (!mountedRef.current) return
      setState((prev) => ({ ...prev, status: "live", isLive: true }))
    })

    es.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return
      try {
        const item: EventItem = JSON.parse(event.data)
        if (!item || !item.id) return
        if (seenIdsRef.current.has(item.id)) return
        seenIdsRef.current.add(item.id)

        setState((prev) => {
          const events = [item, ...prev.liveEvents].slice(0, MAX_EVENTS)
          return {
            ...prev,
            liveEvents: events,
            lastEventAt: Date.now(),
            status: "live",
            isLive: true,
            error: null,
          }
        })
      } catch {
        // skip malformed
      }
    }

    es.onerror = () => {
      if (!mountedRef.current) return
      es.close()
      esRef.current = null
      setState((prev) => {
        const isFirstError = prev.reconnectCount === 0
        return {
          ...prev,
          status: isFirstError ? "reconnecting" : "error",
          isLive: false,
          error: "SSE desconectado. Usando polling fallback.",
          reconnectCount: prev.reconnectCount + 1,
        }
      })
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [connect])

  return state
}
