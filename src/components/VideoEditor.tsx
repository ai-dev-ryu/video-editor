"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { UploadZone } from "./UploadZone";
import { TrimBar } from "./TrimBar";
import { useFFmpeg } from "@/hooks/useFFmpeg";

const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function VideoEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [outputURL, setOutputURL] = useState<string>("");
  const [error, setError] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const { load, loaded, loading, progress, processVideo } = useFFmpeg();

  const handleFile = useCallback(
    async (f: File) => {
      setFile(f);
      setOutputURL("");
      setError("");
      const url = URL.createObjectURL(f);
      setVideoURL(url);
      setStartTime(0);
      setCurrentTime(0);
      setSpeed(1);
      setIsPlaying(false);
    },
    []
  );

  const handleVideoLoaded = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    setEndTime(v.duration);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.currentTime >= endTime) {
      v.currentTime = startTime;
      v.pause();
      setIsPlaying(false);
    }
  }, [endTime, startTime]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      if (v.currentTime >= endTime || v.currentTime < startTime) {
        v.currentTime = startTime;
      }
      v.play();
      setIsPlaying(true);
    }
  }, [isPlaying, startTime, endTime]);

  const handleSeek = useCallback((t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
    setCurrentTime(t);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
  }, [speed]);

  const handleProcess = useCallback(async () => {
    if (!file) return;
    setError("");
    try {
      if (!loaded) await load();
      setProcessing(true);
      const blob = await processVideo(file, { startTime, endTime, speed });
      const url = URL.createObjectURL(blob);
      setOutputURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "処理中にエラーが発生しました");
    } finally {
      setProcessing(false);
    }
  }, [file, loaded, load, processVideo, startTime, endTime, speed]);

  const handleDownload = useCallback(() => {
    if (!outputURL || !file) return;
    const a = document.createElement("a");
    a.href = outputURL;
    a.download = `edited_${file.name.replace(/\.[^.]+$/, "")}.mp4`;
    a.click();
  }, [outputURL, file]);

  const handleReset = useCallback(() => {
    if (videoURL) URL.revokeObjectURL(videoURL);
    if (outputURL) URL.revokeObjectURL(outputURL);
    setFile(null);
    setVideoURL("");
    setOutputURL("");
    setDuration(0);
    setCurrentTime(0);
    setStartTime(0);
    setEndTime(0);
    setSpeed(1);
    setIsPlaying(false);
    setError("");
  }, [videoURL, outputURL]);

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            動画エディター
          </h1>
          <p className="text-gray-400 mt-2">速度変更・トリミング・切り取りが無料でできます</p>
        </div>
        <UploadZone onFile={handleFile} />
        <div className="flex gap-6 text-sm text-gray-500">
          <span>✂️ トリミング</span>
          <span>⚡ 速度変更</span>
          <span>💾 MP4ダウンロード</span>
          <span>🔒 完全ブラウザ内処理</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          動画エディター
        </h1>
        <button
          onClick={handleReset}
          className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500"
        >
          ← 別の動画を開く
        </button>
      </div>

      {/* Video player */}
      <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
        <video
          ref={videoRef}
          src={videoURL}
          className="w-full h-full object-contain"
          onLoadedMetadata={handleVideoLoaded}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={togglePlay}
        />
        {/* Center play button overlay */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-3 bg-gray-900 rounded-xl px-4 py-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
        >
          {isPlaying ? (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <span className="text-sm font-mono text-gray-400 flex-shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={currentTime}
          onChange={(e) => handleSeek(parseFloat(e.target.value))}
          className="flex-1"
          style={{
            background: `linear-gradient(to right, #6366f1 ${(currentTime / (duration || 1)) * 100}%, #374151 ${(currentTime / (duration || 1)) * 100}%)`,
          }}
        />
      </div>

      {/* Trim section */}
      <div className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          ✂️ トリミング
        </h2>
        {duration > 0 && (
          <TrimBar
            duration={duration}
            startTime={startTime}
            endTime={endTime}
            currentTime={currentTime}
            onStartChange={setStartTime}
            onEndChange={setEndTime}
            onSeek={handleSeek}
          />
        )}
      </div>

      {/* Speed section */}
      <div className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          ⚡ 再生速度
        </h2>
        <div className="flex flex-wrap gap-2">
          {SPEED_PRESETS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                speed === s
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-8">遅い</span>
          <input
            type="range"
            min={0.1}
            max={4}
            step={0.05}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="flex-1"
            style={{
              background: `linear-gradient(to right, #6366f1 ${((speed - 0.1) / 3.9) * 100}%, #374151 ${((speed - 0.1) / 3.9) * 100}%)`,
            }}
          />
          <span className="text-xs text-gray-500 w-8 text-right">速い</span>
          <span className="text-sm font-mono text-indigo-400 w-12 text-right">{speed.toFixed(2)}x</span>
        </div>
      </div>

      {/* Export section */}
      <div className="bg-gray-900 rounded-2xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">💾 書き出し</h2>

        <div className="grid grid-cols-3 gap-3 text-sm text-gray-400 bg-gray-800 rounded-xl p-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">元ファイル</div>
            <div className="text-white truncate">{file.name}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">トリム範囲</div>
            <div className="text-white">{formatTime(startTime)} – {formatTime(endTime)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">速度</div>
            <div className="text-white">{speed}x</div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        {processing && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>処理中… {loading ? "FFmpegを読み込み中" : "動画を変換中"}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleProcess}
            disabled={processing}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl transition-colors"
          >
            {processing ? "変換中..." : "変換する"}
          </button>
          {outputURL && (
            <button
              onClick={handleDownload}
              className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors"
            >
              ダウンロード ↓
            </button>
          )}
        </div>

        {outputURL && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">プレビュー（変換後）</p>
            <video
              src={outputURL}
              controls
              className="w-full rounded-xl bg-black"
            />
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-600 pb-4">
        すべての処理はブラウザ内で完結します。動画はサーバーに送信されません。
      </p>
    </div>
  );
}
