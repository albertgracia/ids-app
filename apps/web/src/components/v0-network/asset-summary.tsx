"use client"

import { useMemo } from "react"
import type { AssetInfo } from "@/lib/v0-network/real-data-adapter"
import { buildV0AssetSummary, formatAssetTypeLabel, assetTypeColor, ASSET_TYPES } from "@/lib/v0-network/real-data-adapter"
import { Shield } from "lucide-react"

interface AssetSummaryProps {
  classifications: AssetInfo[]
  apiAvailable: boolean
}

export function AssetSummaryBlock({ classifications, apiAvailable }: AssetSummaryProps) {
  const summary = useMemo(() => buildV0AssetSummary(classifications), [classifications])
  const total = classifications.length
  const avgConfidence = useMemo(() => {
    if (classifications.length === 0) return 0
    const sum = classifications.reduce((s, c) => s + c.confidence, 0)
    return Math.round(sum / classifications.length)
  }, [classifications])

  if (!apiAvailable || total === 0) return null

  const displayTypes = ASSET_TYPES.filter((at) => summary[at] > 0)

  return (
    <div className="v0-asset-summary-block">
      <Shield size={14} color="#06b6d4" style={{ flexShrink: 0 }} />
      <span style={{ fontWeight: 500, fontSize: "11px" }}>Activos clasificados:</span>
      <span style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.5)" }}>
        {total} total · confianza media {avgConfidence}%
      </span>
      {displayTypes.map((at) => (
        <div key={at} className="v0-asset-summary-item">
          <span className="v0-asset-summary-label" style={{ color: assetTypeColor(at) }}>
            {formatAssetTypeLabel(at)}
          </span>
          <span className="v0-asset-summary-count">{summary[at]}</span>
        </div>
      ))}
    </div>
  )
}
