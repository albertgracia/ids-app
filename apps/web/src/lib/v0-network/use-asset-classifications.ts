"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import type { AssetInfo } from "./real-data-adapter"
import { toAssetInfo } from "./real-data-adapter"

const POLL_INTERVAL = 15000
const BASE_URL = "/api/core/api/v1/assets/classifications"

interface ClassificationsResponse {
  items: Record<string, unknown>[]
  count: number
}

export interface AssetClassificationsState {
  classifications: AssetInfo[]
  byIp: Record<string, AssetInfo>
  isLoading: boolean
  error: string | null
  apiAvailable: boolean
  lastUpdated: number | null
}

export function useAssetClassifications(): AssetClassificationsState {
  const [items, setItems] = useState<AssetInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiAvailable, setApiAvailable] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const fetchingRef = useRef(false)
  const lastUpdatedRef = useRef<number | null>(null)

  const fetchClassifications = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${BASE_URL}?limit=200`, { signal: controller.signal })
      if (!mountedRef.current || controller.signal.aborted) return
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: ClassificationsResponse = await res.json()
      if (!mountedRef.current || controller.signal.aborted) return

      const parsed = (data.items || []).map(toAssetInfo).filter(Boolean) as AssetInfo[]
      setItems(parsed)
      setError(null)
      setApiAvailable(true)
      lastUpdatedRef.current = Date.now()
      setLastUpdated(Date.now())
      setIsLoading(false)
    } catch (err) {
      if (!mountedRef.current || controller.signal.aborted) return
      setError(err instanceof Error ? err.message : "Error al cargar clasificaciones")
      setApiAvailable(false)
      setIsLoading(false)
    } finally {
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchClassifications()
    const interval = setInterval(fetchClassifications, POLL_INTERVAL)
    return () => {
      mountedRef.current = false
      if (abortRef.current) abortRef.current.abort()
      clearInterval(interval)
    }
  }, [fetchClassifications])

  const byIp = useMemo(() => {
    const map: Record<string, AssetInfo> = {}
    for (const item of items) {
      map[item.ip] = item
    }
    return map
  }, [items])

  return {
    classifications: items,
    byIp,
    isLoading,
    error,
    apiAvailable,
    lastUpdated,
  }
}
