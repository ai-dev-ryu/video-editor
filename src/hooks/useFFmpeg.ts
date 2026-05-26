"use client";

import { useRef, useState, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const loadedRef = useRef(false);   // state ではなく ref で管理
  const loadingRef = useRef(false);

  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState("");

  const load = useCallback(async () => {
    // ref で判定するので古い closure の値に依存しない
    if (loadedRef.current || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on("progress", ({ progress: p }) => {
        setProgress(Math.round(p * 100));
      });
      ffmpeg.on("log", ({ message }) => {
        setLog(message);
      });

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      loadedRef.current = true;
      setLoaded(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const processVideo = useCallback(
    async (
      file: File,
      options: { startTime?: number; endTime?: number; speed?: number }
    ): Promise<Blob> => {
      // state ではなく ref で確認するので常に最新の値を参照できる
      if (!ffmpegRef.current || !loadedRef.current) {
        throw new Error("FFmpeg の読み込みが完了していません");
      }

      const ffmpeg = ffmpegRef.current;
      const inputName = "input" + file.name.slice(file.name.lastIndexOf("."));
      const outputName = "output.mp4";

      setProgress(0);
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      const args: string[] = ["-i", inputName];

      const { startTime = 0, endTime, speed = 1 } = options;

      if (startTime > 0) {
        args.push("-ss", String(startTime));
      }
      if (endTime !== undefined && endTime > startTime) {
        args.push("-to", String(endTime));
      }

      if (speed !== 1) {
        const videoFilter = `setpts=${(1 / speed).toFixed(4)}*PTS`;
        // atempo は 0.5〜2.0 の範囲制限があるため連結で対応
        const atempoFilters = buildAtempoFilters(speed);
        args.push(
          "-filter_complex",
          `[0:v]${videoFilter}[v];[0:a]${atempoFilters}[a]`
        );
        args.push("-map", "[v]", "-map", "[a]");
      }

      args.push("-c:v", "libx264", "-preset", "fast", "-c:a", "aac", outputName);

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      const buffer = data instanceof Uint8Array ? data.buffer : data;
      return new Blob([buffer as ArrayBuffer], { type: "video/mp4" });
    },
    []
  );

  return { load, loaded, loading, progress, log, processVideo };
}

/** atempo は 0.5〜2.0 の範囲しか受け付けないため、範囲外は複数フィルターを連結する */
function buildAtempoFilters(speed: number): string {
  const filters: string[] = [];
  let remaining = speed;

  if (remaining > 2.0) {
    while (remaining > 2.0) {
      filters.push("atempo=2.0");
      remaining /= 2.0;
    }
  } else if (remaining < 0.5) {
    while (remaining < 0.5) {
      filters.push("atempo=0.5");
      remaining /= 0.5;
    }
  }

  filters.push(`atempo=${remaining.toFixed(4)}`);
  return filters.join(",");
}
