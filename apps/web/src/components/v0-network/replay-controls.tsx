"use client"

import { Play, Pause, RotateCcw, SkipBack, SkipForward, Rewind, FastForward } from "lucide-react"

interface ReplayControlsProps {
  isPlaying: boolean
  currentIndex: number
  totalPackets: number
  playbackSpeed: number
  onPlay: () => void
  onPause: () => void
  onReset: () => void
  onStepBackward: () => void
  onStepForward: () => void
  onSpeedChange: (speed: number) => void
  onSeek: (index: number) => void
}

export function ReplayControls({
  isPlaying, currentIndex, totalPackets, playbackSpeed,
  onPlay, onPause, onReset, onStepBackward, onStepForward,
  onSpeedChange, onSeek,
}: ReplayControlsProps) {
  const speedOptions = [0.25, 0.5, 1, 2, 4, 8]

  return (
    <div className="v0-card v0-replay">
      <div className="v0-replay-row">
        <div className="v0-replay-btns">
          <button className="v0-btn-icon" onClick={onReset}><RotateCcw size={14} /></button>
          <button className="v0-btn-icon" onClick={onStepBackward}><SkipBack size={14} /></button>
          <button className="v0-btn-icon" onClick={isPlaying ? onPause : onPlay}>
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button className="v0-btn-icon" onClick={onStepForward}><SkipForward size={14} /></button>
        </div>
        <span className="v0-mono-sm">
          {currentIndex} / {totalPackets}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            className="v0-btn-icon"
            disabled={playbackSpeed === speedOptions[0]}
            onClick={() => {
              const idx = speedOptions.indexOf(playbackSpeed)
              onSpeedChange(speedOptions[Math.max(0, idx - 1)])
            }}
          >
            <Rewind size={14} />
          </button>
          <span style={{ fontFamily: "monospace", fontSize: "13px", minWidth: "40px", textAlign: "center" }}>{playbackSpeed}x</span>
          <button
            className="v0-btn-icon"
            disabled={playbackSpeed === speedOptions[speedOptions.length - 1]}
            onClick={() => {
              const idx = speedOptions.indexOf(playbackSpeed)
              onSpeedChange(speedOptions[Math.min(speedOptions.length - 1, idx + 1)])
            }}
          >
            <FastForward size={14} />
          </button>
        </div>
      </div>
      <div className="v0-replay-slider-wrap">
        <input
          type="range"
          min={0}
          max={totalPackets}
          step={1}
          value={currentIndex}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="v0-slider"
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
          <span>0</span><span>{totalPackets}</span>
        </div>
      </div>
    </div>
  )
}
