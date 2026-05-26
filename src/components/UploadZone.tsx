"use client";

import { useCallback, useState } from "react";

interface UploadZoneProps {
  onFile: (file: File) => void;
}

export function UploadZone({ onFile }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) {
        onFile(file);
      }
    },
    [onFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      className={`
        relative flex flex-col items-center justify-center gap-4
        w-full max-w-2xl mx-auto h-64 rounded-2xl border-2 border-dashed
        transition-all duration-200 cursor-pointer
        ${dragging
          ? "border-indigo-400 bg-indigo-500/10"
          : "border-gray-600 bg-gray-900 hover:border-indigo-500 hover:bg-gray-800/60"
        }
      `}
      onClick={() => document.getElementById("file-input")?.click()}
    >
      <div className="text-5xl">🎬</div>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-200">
          動画をドラッグ＆ドロップ
        </p>
        <p className="text-sm text-gray-400 mt-1">
          またはクリックしてファイルを選択
        </p>
        <p className="text-xs text-gray-500 mt-2">
          MP4, MOV, AVI, MKV などに対応
        </p>
      </div>
      <input
        id="file-input"
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
