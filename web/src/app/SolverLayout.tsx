"use client";

import { useRef, useState } from "react";
import { CubeHandle } from "@/components/cube/RubiksCube";
import { CubeSceneLoader } from "@/components/cube/CubeSceneLoader";
import { CubeEntry } from "@/components/cube/CubeEntry";
import { PhotoScan } from "@/components/cube/PhotoScan";

type Tab = "manual" | "photo";

export function SolverLayout() {
  const cubeRef = useRef<CubeHandle>(null);
  const [tab, setTab] = useState<Tab>("manual");

  return (
    <div className="flex w-screen h-screen">
      {/* Left panel */}
      <div className="flex flex-col w-80 shrink-0 bg-gray-900 border-r border-white/10">
        {/* Tab bar */}
        <div className="flex border-b border-white/10">
          {(["manual", "photo"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "flex-1 py-2 text-xs font-semibold uppercase tracking-widest transition-colors",
                tab === t
                  ? "text-white border-b-2 border-blue-500 -mb-px"
                  : "text-white/40 hover:text-white/70",
              ].join(" ")}
            >
              {t === "manual" ? "Manual" : "Photo Scan"}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "manual" ? (
            <CubeEntry cubeRef={cubeRef} />
          ) : (
            <PhotoScan cubeRef={cubeRef} />
          )}
        </div>
      </div>

      {/* 3-D viewer */}
      <div className="flex-1">
        <CubeSceneLoader cubeRef={cubeRef} />
      </div>
    </div>
  );
}
