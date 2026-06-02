"use client"

import type { AssetType } from "@/lib/v0-network/real-data-adapter"
import { formatAssetTypeLabel, assetTypeColor } from "@/lib/v0-network/real-data-adapter"

interface AssetBadgeProps {
  assetType: AssetType
  confidence?: number
}

export function AssetBadge({ assetType, confidence }: AssetBadgeProps) {
  const color = assetTypeColor(assetType)
  const label = formatAssetTypeLabel(assetType)
  const title = confidence !== undefined ? `${label} (${confidence}% confianza)` : label

  return (
    <span
      className="v0-asset-badge"
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0 5px",
        borderRadius: "3px",
        fontSize: "10px",
        fontFamily: "monospace",
        fontWeight: 600,
        lineHeight: "18px",
        border: `1px solid ${color}`,
        background: `${color}18`,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  )
}
