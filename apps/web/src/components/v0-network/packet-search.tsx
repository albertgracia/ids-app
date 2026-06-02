"use client"

import { Search, X } from "lucide-react"

interface PacketSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function PacketSearch({ value, onChange, placeholder = "Buscar por IP, puerto o protocolo..." }: PacketSearchProps) {
  return (
    <div className="v0-search-wrap">
      <Search size={14} className="v0-search-icon" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="v0-search-input"
      />
      {value && (
        <button className="v0-search-clear" onClick={() => onChange("")}>
          <X size={14} />
        </button>
      )}
    </div>
  )
}
