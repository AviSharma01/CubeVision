"use client";

import { useEffect, useRef } from "react";

interface StickerResult {
  color: string;
  confidence: number;
}

interface FaceResult {
  stickers: StickerResult[];
  face_confidence: number;
}

export interface JobFaces {
  [faceId: string]: FaceResult;
}

interface Props {
  jobId: string;
  onDone: (faces: JobFaces) => void;
  onFailed: (error: string) => void;
}

const POLL_INTERVAL_MS = 1000;

export function ProcessingStep({ jobId, onDone, onFailed }: Props) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs so the effect never needs to restart when parent re-renders
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onFailedRef = useRef(onFailed);
  onFailedRef.current = onFailed;

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

    const poll = async () => {
      try {
        const res = await fetch(`${apiBase}/jobs/${jobId}`);
        if (!res.ok) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onFailedRef.current(`Poll error ${res.status}`);
          return;
        }
        const data = await res.json();
        if (data.status === "done") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onDoneRef.current(data.faces as JobFaces);
        } else if (data.status === "failed") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onFailedRef.current(data.error ?? "Analysis failed");
        }
        // pending / running → keep polling
      } catch {
        // network blip — keep polling
      }
    };

    poll(); // immediate first check
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId]); // jobId is the only real dependency

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-white/60">
      {/* Spinner */}
      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
      <p className="text-sm">Analyzing cube…</p>
      <p className="text-xs font-mono text-white/30">{jobId.slice(0, 8)}</p>
    </div>
  );
}
