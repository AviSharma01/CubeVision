"use client";

import { useRef, useState } from "react";
import { CubeHandle, PlaybackStatus } from "@/components/cube/RubiksCube";
import { CubeSceneLoader } from "@/components/cube/CubeSceneLoader";
import { CubeEntry, CubeEntryHandle } from "@/components/cube/CubeEntry";
import { PhotoScan } from "@/components/cube/PhotoScan";
import { parseMoveSequence } from "@/lib/cube/moves";

const SCRAMBLE = "R U R' F' R U R' U' R' F R2 U' R'";

type Tab = "manual" | "photo";

export function SolverLayout() {
  const cubeRef = useRef<CubeHandle>(null);
  const entryRef = useRef<CubeEntryHandle>(null);
  const pendingSyncRef = useRef(false);
  const [tab, setTab] = useState<Tab>("manual");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleStatusChange = (status: PlaybackStatus) => {
    if (!status.isAnimating && status.queueLength === 0 && pendingSyncRef.current) {
      pendingSyncRef.current = false;
      entryRef.current?.syncFromCube();
    }
  };

  const handleScramble = () => {
    cubeRef.current?.reset();
    cubeRef.current?.queueMoves(parseMoveSequence(SCRAMBLE));
    pendingSyncRef.current = true;
    setTab("manual");
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden">
      {/* Collapsible left panel */}
      <div
        className="shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
        style={{ width: sidebarOpen ? "20rem" : "0" }}
      >
        <div className="w-80 h-full flex flex-col bg-gray-900 border-r border-white/10">
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

          {/* Scramble button — always visible in Manual tab */}
          {tab === "manual" && (
            <div className="px-4 pt-3 pb-1">
              <button
                onClick={handleScramble}
                className="w-full rounded bg-amber-600/80 hover:bg-amber-500/80 px-3 py-1.5 text-sm text-white transition-colors active:scale-95"
              >
                🔀 Scramble
              </button>
              <p className="mt-1.5 text-xs text-white/30 text-center leading-snug">
                Scrambles the cube and syncs the state here when done
              </p>
            </div>
          )}

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4">
            {tab === "manual" ? (
              <CubeEntry ref={entryRef} cubeRef={cubeRef} />
            ) : (
              <PhotoScan cubeRef={cubeRef} />
            )}
          </div>
        </div>
      </div>

      {/* 3-D viewer */}
      <div className="flex-1 relative">
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          className="absolute left-2 top-2 z-10 rounded bg-white/10 hover:bg-white/20 px-2 py-1 text-white text-xs transition-colors"
        >
          {sidebarOpen ? "◀" : "▶"}
        </button>

        <CubeSceneLoader cubeRef={cubeRef} onStatusChange={handleStatusChange} />
      </div>
    </div>
  );
}
