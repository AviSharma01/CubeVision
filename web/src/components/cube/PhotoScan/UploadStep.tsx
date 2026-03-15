"use client";

import { useRef, useState } from "react";
import { FaceId, FACE_IDS, FACE_COLORS, COLOR_HEX } from "@/lib/cube/types";

const FACE_LABEL: Record<FaceId, string> = {
  U: "Top (White)",
  D: "Bottom (Yellow)",
  F: "Front (Green)",
  B: "Back (Blue)",
  L: "Left (Orange)",
  R: "Right (Red)",
};

interface Props {
  onJobCreated: (jobId: string) => void;
}

export function UploadStep({ onJobCreated }: Props) {
  const [files, setFiles] = useState<Partial<Record<FaceId, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<FaceId, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Partial<Record<FaceId, HTMLInputElement>>>({});

  const handleFile = (faceId: FaceId, file: File) => {
    setFiles((prev) => ({ ...prev, [faceId]: file }));
    const url = URL.createObjectURL(file);
    setPreviews((prev) => ({ ...prev, [faceId]: url }));
    setError(null);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      for (const faceId of FACE_IDS) {
        form.append(faceId, files[faceId]!);
      }
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiBase}/analyze`, { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail ?? `Server error ${res.status}`);
      }
      const { job_id } = (await res.json()) as { job_id: string };
      onJobCreated(job_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setLoading(false);
    }
  };

  const allUploaded = FACE_IDS.every((f) => files[f]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-white/50 leading-relaxed">
        Take a photo of each face with the cube oriented so that face is pointing toward you.
      </p>

      {/* 4-col × 3-row cross layout matching the face net */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "repeat(3, auto)" }}
      >
        {(
          [
            { id: "U" as FaceId, col: 2, row: 1 },
            { id: "L" as FaceId, col: 1, row: 2 },
            { id: "F" as FaceId, col: 2, row: 2 },
            { id: "R" as FaceId, col: 3, row: 2 },
            { id: "B" as FaceId, col: 4, row: 2 },
            { id: "D" as FaceId, col: 2, row: 3 },
          ] as const
        ).map(({ id, col, row }) => {
          const preview = previews[id];
          const centerHex = COLOR_HEX[FACE_COLORS[id]];
          return (
            <div
              key={id}
              style={{ gridColumn: col, gridRow: row }}
              className="flex flex-col items-center gap-1"
            >
              <button
                onClick={() => inputRefs.current[id]?.click()}
                className="relative w-14 h-14 rounded overflow-hidden border-2 transition-all hover:scale-105 active:scale-95"
                style={{
                  borderColor: preview ? "#4ade80" : centerHex,
                  opacity: preview ? 1 : 0.6,
                }}
                title={FACE_LABEL[id]}
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt={id}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-lg"
                    style={{ backgroundColor: centerHex + "33" }}
                  >
                    <span className="text-white/60 text-xs font-mono">{id}</span>
                  </div>
                )}
                {preview && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 transition-opacity">
                    <span className="text-white text-xs">change</span>
                  </div>
                )}
              </button>
              <input
                ref={(el) => {
                  if (el) inputRefs.current[id] = el;
                }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(id, f);
                }}
              />
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-400/10 rounded p-2 leading-relaxed">{error}</p>
      )}

      <button
        onClick={handleAnalyze}
        disabled={!allUploaded || loading}
        className="rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1.5 text-sm text-white transition-colors active:scale-95"
      >
        {loading ? "Uploading…" : allUploaded ? "Analyze →" : `${FACE_IDS.filter((f) => !files[f]).length} faces missing`}
      </button>
    </div>
  );
}
