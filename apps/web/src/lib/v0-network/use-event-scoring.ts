"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { scoreEvents } from "@/lib/analytics-api"
import type { EventItem } from "@/lib/types"
import { severityToWeight, normalizeSeverity, deriveEventRiskScore, type SeverityLevel } from "./real-data-adapter"

export type ScoringSource = "analytics" | "derived" | "unavailable"

const MAX_BATCH = 50
const POLL_INTERVAL = 15000

export interface ScoredEvent {
  eventId: string
  score: number
  riskLevel: SeverityLevel
  source: ScoringSource
}

export interface EventScoringState {
  scoresById: Record<string, ScoredEvent>
  isLoading: boolean
  error: string | null
  source: ScoringSource
  lastUpdated: number | null
}

export function useEventScoring(events: EventItem[]): EventScoringState {
  const [scores, setScores] = useState<Record<string, ScoredEvent>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<ScoringSource>("unavailable")
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const mountedRef = useRef(true)
  const abortRef = useRef<AbortController | null>(null)
  const fetchingRef = useRef(false)

  const deriveBatch = useCallback((items: EventItem[]): Record<string, ScoredEvent> => {
    const m: Record<string, ScoredEvent> = {}
    for (const e of items) {
      const sev = normalizeSeverity(e.severity)
      m[e.id] = {
        eventId: e.id,
        score: deriveEventRiskScore(sev),
        riskLevel: sev,
        source: "derived",
      }
    }
    return m
  }, [])

  const fetchScores = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true

    const batch = events.slice(0, MAX_BATCH)
    if (batch.length === 0) {
      setIsLoading(false)
      fetchingRef.current = false
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await scoreEvents(batch)
      if (!mountedRef.current || controller.signal.aborted) return

      const m: Record<string, ScoredEvent> = {}
      for (const item of res.items) {
        m[item.event_id] = {
          eventId: item.event_id,
          score: item.score,
          riskLevel: normalizeSeverity(item.risk_level),
          source: "analytics",
        }
      }
      setScores(m)
      setSource("analytics")
      setError(null)
      setLastUpdated(Date.now())
      setIsLoading(false)
    } catch {
      if (!mountedRef.current || controller.signal.aborted) return
      const derived = deriveBatch(batch)
      setScores((prev) => ({ ...prev, ...derived }))
      setSource("derived")
      setError(null)
      setLastUpdated(Date.now())
      setIsLoading(false)
    } finally {
      fetchingRef.current = false
    }
  }, [events, deriveBatch])

  useEffect(() => {
    mountedRef.current = true
    setIsLoading(true)
    fetchScores()
    const interval = setInterval(fetchScores, POLL_INTERVAL)
    return () => {
      mountedRef.current = false
      if (abortRef.current) abortRef.current.abort()
      clearInterval(interval)
    }
  }, [fetchScores])

  const scoresById = useMemo(() => scores, [scores])

  return { scoresById, isLoading, error, source, lastUpdated }
}
