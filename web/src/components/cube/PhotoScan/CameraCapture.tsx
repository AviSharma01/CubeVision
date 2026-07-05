"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { FaceId, FACE_IDS, FACE_COLORS, COLOR_HEX, Color } from "@/lib/cube/types";
import { Button } from "@/components/ui/Button";

const COLOR_NAME: Record<Color, string> = {
  W: "white",
  Y: "yellow",
  G: "green",
  B: "blue",
  O: "orange",
  R: "red",
};

// Crop geometry: a centered square of side 0.7 × min(videoWidth, videoHeight),
// in native video pixels. The overlay renders over the same square in the
// preview (70% of the displayed frame's shorter side, centered), so what the
// grid frames is exactly what gets cropped.
const CROP_FRACTION = 0.7;

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

interface Props {
  previews: Partial<Record<FaceId, string>>;
  onCapture: (faceId: FaceId, file: File) => void;
  onExit: () => void;
}

type CameraStatus = "starting" | "ready" | "denied" | "unavailable";

export function CameraCapture({ previews, onCapture, onExit }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("starting");
  const [videoSize, setVideoSize] = useState<{ w: number; h: number } | null>(null);
  const [currentFace, setCurrentFace] = useState<FaceId>(
    () => FACE_IDS.find((f) => !previews[f]) ?? FACE_IDS[0]
  );
  const [pending, setPending] = useState<{ file: File; sampledName: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      let stream: MediaStream;
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      } catch (e) {
        if (!cancelled) {
          setStatus(
            e instanceof DOMException && e.name === "NotAllowedError" ? "denied" : "unavailable"
          );
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus("ready");
    };
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const commit = useCallback(
    (faceId: FaceId, file: File) => {
      onCapture(faceId, file);
      const next =
        FACE_IDS.find((f) => f !== faceId && !previews[f]) ?? faceId;
      setCurrentFace(next);
    },
    [onCapture, previews]
  );

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const side = Math.round(CROP_FRACTION * Math.min(video.videoWidth, video.videoHeight));
    const sx = Math.round((video.videoWidth - side) / 2);
    const sy = Math.round((video.videoHeight - side) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // The video element is mirrored via CSS only; drawImage reads the raw
    // unmirrored frame, so the capture keeps left/right columns correct.
    ctx.drawImage(video, sx, sy, side, side, 0, 0, side, side);

    // Sample a ~20px patch at the crop center and find the nearest cube color.
    const patch = ctx.getImageData(Math.round(side / 2) - 10, Math.round(side / 2) - 10, 20, 20);
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < patch.data.length; i += 4) {
      r += patch.data[i];
      g += patch.data[i + 1];
      b += patch.data[i + 2];
    }
    const n = patch.data.length / 4;
    const sampled: [number, number, number] = [r / n, g / n, b / n];
    const expected = FACE_COLORS[currentFace];
    const nearest = (Object.keys(COLOR_HEX) as Color[]).reduce((best, c) =>
      rgbDistance(sampled, hexToRgb(COLOR_HEX[c])) < rgbDistance(sampled, hexToRgb(COLOR_HEX[best]))
        ? c
        : best
    );

    const faceId = currentFace;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `${faceId}.jpg`, { type: "image/jpeg" });
        if (nearest !== expected) {
          setPending({ file, sampledName: COLOR_NAME[nearest] });
        } else {
          commit(faceId, file);
        }
      },
      "image/jpeg",
      0.92
    );
  };

  if (status === "denied" || status === "unavailable") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg bg-panel border border-hairline p-6">
        <p className="text-xs text-white/50 text-center leading-relaxed">
          {status === "denied"
            ? "Camera access was denied. Allow camera access in your browser settings, or upload photos instead."
            : "No camera found. You can upload photos instead."}
        </p>
        <Button onClick={onExit}>
          <Upload size={14} />
          Use file upload
        </Button>
      </div>
    );
  }

  const expected = FACE_COLORS[currentFace];
  const faceNumber = FACE_IDS.indexOf(currentFace) + 1;
  const allCaptured = FACE_IDS.every((f) => previews[f]);
  const landscape = videoSize ? videoSize.w >= videoSize.h : true;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm text-white">
          Face {faceNumber} of 6 — <span className="font-mono">{currentFace}</span> (
          {COLOR_NAME[expected]} center)
        </p>
        <p className="text-xs text-white/50 leading-relaxed">
          Hold the cube flat to the camera at about arm&apos;s length. Avoid direct light on the
          cube.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-lg bg-panel border border-hairline">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth > 0) setVideoSize({ w: v.videoWidth, h: v.videoHeight });
          }}
          className="block w-full h-auto"
          style={{ transform: "scaleX(-1)" }}
        />
        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-white/50">Starting camera…</p>
          </div>
        )}
        {videoSize && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 grid grid-cols-3 grid-rows-3"
            style={landscape ? { height: "70%", aspectRatio: "1" } : { width: "70%", aspectRatio: "1" }}
          >
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className="border border-white/40"
                style={i === 4 ? { backgroundColor: COLOR_HEX[expected] + "4D" } : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {pending ? (
        <div className="flex flex-col gap-2 rounded-lg bg-raised border border-hairline p-3">
          <p className="text-xs text-white/70 leading-relaxed">
            The center doesn&apos;t look {COLOR_NAME[expected]} (closer to {pending.sampledName}).
            Retake?
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setPending(null)}>Retake</Button>
            <Button
              variant="primary"
              onClick={() => {
                commit(currentFace, pending.file);
                setPending(null);
              }}
            >
              Use anyway
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="primary"
          onClick={handleCapture}
          disabled={status !== "ready" || !videoSize}
        >
          <Camera size={14} />
          {allCaptured ? `Retake ${currentFace}` : `Capture ${currentFace}`}
        </Button>
      )}

      <div className="flex gap-2">
        {FACE_IDS.map((f) => {
          const preview = previews[f];
          return (
            <button
              key={f}
              onClick={() => {
                setPending(null);
                setCurrentFace(f);
              }}
              className="relative w-12 h-12 rounded overflow-hidden border-2 transition-all hover:scale-105 active:scale-95"
              style={{
                borderColor: f === currentFace ? "#ffffff" : preview ? "#4ade80" : "transparent",
              }}
              title={`${preview ? "Retake" : "Capture"} face ${f}`}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={f} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-raised">
                  <span className="text-white/60 text-xs font-mono">{f}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
