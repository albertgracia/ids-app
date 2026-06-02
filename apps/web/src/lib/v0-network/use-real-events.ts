"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import type { EventItem } from "@/lib/types"
import { getRecentEvents } from "@/lib/ids-core"
import { useLiveEvents } from "./use-live-events"
import type { LiveStatus } from "./use-live-events"

const POLL_INTERVAL = 5000
const MAX_EVENTS = 500

export type DataSource = "live" | "reconnecting" | "polling" | "mock"

export interface RealEventsState {
  events: EventItem[]
  isLoading: boolean
  error: string | null
  source: DataSource
  lastUpdated: number | null
  apiAvailable: boolean
}

export function useRealEvents() {
  const live = useLiveEvents()

  const [pollEvents, setPollEvents] = useState<EventItem[]>([])
  const [pollError, setPollError] = useState<string | null>(null)
  const [pollLoading, setPollLoading] = useState(true)
  const [pollOk, setPollOk] = useState(false)

  const seenIdsRef = useRef<Set<string>>(new Set())
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const lastUpdatedRef = useRef<number | null>(null)
  const pollingActiveRef = useRef(false)

  const fetchEvents = useCallback(async () => {
    if (pollingActiveRef.current) return
    pollingActiveRef.current = true

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

      setPollEvents((prev) => {
        const merged = [...deduped, ...prev].slice(0, MAX_EVENTS)
        return merged
      })
      setPollError(null)
      setPollOk(true)
      lastUpdatedRef.current = Date.now()
    } catch (err) {
      if (!mountedRef.current || controller.signal.aborted) return
      setPollError(err instanceof Error ? err.message : "Error desconocido")
      setPollOk(false)
    } finally {
      pollingActiveRef.current = false
      if (!controller.signal.aborted) {
        setPollLoading(false)
      }
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

  const mergedSource = useMemo((): DataSource => {
    if (live.isLive) return "live"
    if (live.status === "reconnecting") return "reconnecting"
    if (pollOk) return "polling"
    return "mock"
  }, [live.isLive, live.status, pollOk])

  const mergedEvents = useMemo((): EventItem[] => {
    if (live.isLive) return live.liveEvents
    if (pollOk) return pollEvents
    return []
  }, [live.isLive, live.liveEvents, pollOk, pollEvents])

  const mergedLastUpdated = live.isLive ? live.lastEventAt : lastUpdatedRef.current
  const mergedError = live.isLive ? null : (live.error || pollError)

  const retry = useCallback(() => {
    fetchEvents()
  }, [fetchEvents])

  return {
    events: mergedEvents,
    isLoading: pollLoading && !live.isLive,
    error: mergedError,
    source: mergedSource,
    lastUpdated: mergedLastUpdated,
    apiAvailable: mergedSource !== "mock",
  }
}
