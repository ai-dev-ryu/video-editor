"use client";

import { useRef, useState, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState("");

  const load = useCallback(async () => {
    if (loaded || loading) return;
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

      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [loaded, loading]);

  const processVideo = useCallback(
    async (
      file: File,
      options: { startTime?: number; endTime?: number; speed?: number }
    ): Promise<Blob> => {
      if (!ffmpegRef.current || !loaded) throw new Error("FFmpeg not loaded");

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
        const audioFilter = `atempo=${Math.min(Math.max(speed, 0.5), 2.0).toFixed(4)}`;
        args.push("-filter_complex", `[0:v]${videoFilter}[v];[0:a]${audioFilter}[a]`);
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
    [loaded]
  );

  return { load, loaded, loading, progress, log, processVideo };
}
