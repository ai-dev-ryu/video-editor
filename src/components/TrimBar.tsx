"use client";

import { useCallback, useRef } from "react";

interface TrimBarProps {
  duration: number;
  startTime: number;
  endTime: number;
  currentTime: number;
  onStartChange: (t: number) => void;
  onEndChange: (t: number) => void;
  onSeek: (t: number) => void;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${String(sec).padStart(2, "0")}.${ms}`;
}

export function TrimBar({
  duration,
  startTime,
  endTime,
  currentTime,
  onStartChange,
  onEndChange,
  onSeek,
}: TrimBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  const getPercent = (t: number) => (t / duration) * 100;

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = barRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      onSeek(Math.max(0, Math.min(duration, ratio * duration)));
    },
    [duration, onSeek]
  );

  const startPct = getPercent(startTime);
  const endPct = getPercent(endTime);
  const currentPct = getPercent(currentTime);

  return (
    <div className="w-full space-y-3">
      {/* Time labels */}
      <div className="flex justify-between text-xs text-gray-400 font-mono">
        <span>開始: {formatTime(startTime)}</span>
        <span>現在: {formatTime(currentTime)}</span>
        <span>終了: {formatTime(endTime)}</span>
      </div>

      {/* Visual timeline */}
      <div
        ref={barRef}
        className="relative h-10 rounded-lg bg-gray-800 cursor-pointer overflow-hidden"
        onClick={handleBarClick}
      >
        {/* Dimmed out-of-range left */}
        <div
          className="absolute inset-y-0 left-0 bg-gray-700/70"
          style={{ width: `${startPct}%` }}
        />
        {/* Selected range */}
        <div
          className="absolute inset-y-0 bg-indigo-500/30 border-y-2 border-indigo-400"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />
        {/* Dimmed out-of-range right */}
        <div
          className="absolute inset-y-0 right-0 bg-gray-700/70"
          style={{ width: `${100 - endPct}%` }}
        />
        {/* Playhead */}
        <div
          className="absolute inset-y-0 w-0.5 bg-white/80 pointer-events-none"
          style={{ left: `${currentPct}%` }}
        />
        {/* Start handle */}
        <div
          className="absolute inset-y-0 w-3 bg-indigo-400 cursor-ew-resize rounded-l"
          style={{ left: `${startPct}%`, transform: "translateX(-50%)" }}
        />
        {/* End handle */}
        <div
          className="absolute inset-y-0 w-3 bg-indigo-400 cursor-ew-resize rounded-r"
          style={{ left: `${endPct}%`, transform: "translateX(-50%)" }}
        />
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-gray-400">開始時間</label>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={startTime}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onStartChange(Math.min(v, endTime - 0.1));
            }}
            className="w-full"
            style={{ background: `linear-gradient(to right, #6366f1 ${startPct}%, #374151 ${startPct}%)` }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">終了時間</label>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={endTime}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onEndChange(Math.max(v, startTime + 0.1));
            }}
            className="w-full"
            style={{ background: `linear-gradient(to right, #6366f1 ${endPct}%, #374151 ${endPct}%)` }}
          />
        </div>
      </div>

      <div className="text-center text-xs text-gray-500">
        選択範囲: {formatTime(endTime - startTime)}
      </div>
    </div>
  );
}
