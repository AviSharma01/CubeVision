"use client";

import { useRef, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, Shuffle, Check } from "lucide-react";
import { CubeHandle, PlaybackStatus } from "@/components/cube/RubiksCube";
import { CubeSceneLoader } from "@/components/cube/CubeSceneLoader";
import { CubeEntry, CubeEntryHandle } from "@/components/cube/CubeEntry";
import { CubeErrorBoundary } from "@/components/cube/CubeErrorBoundary";
import { PhotoScan } from "@/components/cube/PhotoScan";
import { Button } from "@/components/ui/Button";
import { parseMoveSequence } from "@/lib/cube/moves";
import { CubeState, FACE_IDS, SOLVED_STATE, COLOR_HEX } from "@/lib/cube/types";

const SCRAMBLE = "R U R' F' R U R' U' R' F R2 U' R'";

function isSolvedState(state: CubeState): boolean {
  return FACE_IDS.every((f) => state[f].every((c, i) => c === SOLVED_STATE[f][i]));
}

type Tab = "manual" | "photo";

/** Wordmark: the six sticker colors as a 3×2 mark next to the name */
function Logo() {
  const swatches = ["W", "G", "R", "Y", "B", "O"] as const;
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid grid-cols-3 gap-[2px]">
        {swatches.map((c) => (
          <span
            key={c}
            className="h-[7px] w-[7px] rounded-[1.5px]"
            style={{ backgroundColor: COLOR_HEX[c] }}
          />
        ))}
      </div>
      <span className="text-sm font-semibold tracking-tight">CubeVision</span>
    </div>
  );
}

export function SolverLayout() {
  const cubeRef = useRef<CubeHandle>(null);
  const entryRef = useRef<CubeEntryHandle>(null);
  const prevStatusRef = useRef<PlaybackStatus | null>(null);
  const [tab, setTab] = useState<Tab>("manual");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSolved, setShowSolved] = useState(false);

  const handleStatusChange = (status: PlaybackStatus) => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    const idle = !status.isAnimating && status.queueLength === 0;
    if (!prev || !idle) return;

    const sequenceEnded = prev.isAnimating || prev.queueLength > 0;
    // History shrinking while idle means reset() or loadState() jumped the state
    const stateJumped = status.history.length < prev.history.length;
    if (!sequenceEnded && !stateJumped) return;

    entryRef.current?.syncFromCube();

    if (sequenceEnded) {
      const state = cubeRef.current?.getState();
      if (state && isSolvedState(state)) {
        setShowSolved(true);
        setTimeout(() => setShowSolved(false), 2500);
      }
    }
  };

  const handleScramble = () => {
    cubeRef.current?.loadState(SOLVED_STATE);
    cubeRef.current?.queueMoves(parseMoveSequence(SCRAMBLE));
    setTab("manual");
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-background px-4">
        <Logo />
        <p className="hidden text-xs text-white/30 sm:block">
          Scan · Solve · Watch every turn
        </p>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Collapsible left panel */}
        <div
          className="shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
          style={{ width: sidebarOpen ? "28rem" : "0" }}
        >
          <div className="flex h-full w-[28rem] flex-col border-r border-hairline bg-panel">
            {/* Tab bar */}
            <div className="flex border-b border-hairline">
              {(["manual", "photo"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={[
                    "flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors",
                    tab === t
                      ? "-mb-px border-b-2 border-white text-white"
                      : "text-white/40 hover:text-white/70",
                  ].join(" ")}
                >
                  {t === "manual" ? "Manual" : "Photo Scan"}
                </button>
              ))}
            </div>

            {tab === "manual" && (
              <div className="px-4 pt-3 pb-1">
                <Button onClick={handleScramble} className="w-full">
                  <Shuffle size={14} /> Scramble
                </Button>
                <p className="mt-1.5 text-center text-xs leading-snug text-white/30">
                  Scrambles the cube and syncs the state here when done
                </p>
              </div>
            )}

            {/* Panel content */}
            {/* Both panels stay mounted so their state survives tab switches */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className={tab === "manual" ? "" : "hidden"}>
                <CubeEntry ref={entryRef} cubeRef={cubeRef} />
              </div>
              <div className={tab === "photo" ? "" : "hidden"}>
                <PhotoScan cubeRef={cubeRef} />
              </div>
            </div>
          </div>
        </div>

        {/* 3-D viewer */}
        <div className="relative min-w-0 flex-1">
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            title={sidebarOpen ? "Hide panel" : "Show panel"}
            aria-label={sidebarOpen ? "Hide panel" : "Show panel"}
            className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-white/50 transition-colors hover:bg-white/[0.12] hover:text-white"
          >
            {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
          </button>

          {/* Solved banner */}
          {showSolved && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <div className="animate-in fade-in zoom-in-95 duration-200 rounded-2xl border border-hairline bg-panel/85 px-10 py-6 text-center backdrop-blur-sm">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
                  <Check size={22} strokeWidth={3} />
                </div>
                <p className="text-lg font-semibold">Solved</p>
              </div>
            </div>
          )}

          <CubeErrorBoundary>
            <CubeSceneLoader cubeRef={cubeRef} onStatusChange={handleStatusChange} />
          </CubeErrorBoundary>
        </div>
      </div>
    </div>
  );
}
