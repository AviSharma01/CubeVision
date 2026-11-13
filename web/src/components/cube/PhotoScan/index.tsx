"use client";

import { useState } from "react";
import { CubeState } from "@/lib/cube/types";
import { UploadStep } from "./UploadStep";
import { ProcessingStep, JobFaces } from "./ProcessingStep";
import { ReviewStep } from "./ReviewStep";

type Screen = "upload" | "processing" | "review";

interface Props {
  solveCube: (state: CubeState) => Promise<string | null>;
}

export function PhotoScan({ solveCube }: Props) {
  const [screen, setScreen] = useState<Screen>("upload");
  const [jobId, setJobId] = useState<string | null>(null);
  const [faces, setFaces] = useState<JobFaces | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  const handleJobCreated = (id: string) => {
    setJobId(id);
    setPollError(null);
    setScreen("processing");
  };

  const handleDone = (result: JobFaces) => {
    setFaces(result);
    setScreen("review");
  };

  const handleFailed = (err: string) => {
    setPollError(err);
    setScreen("upload");
  };

  const handleStartOver = () => {
    setJobId(null);
    setFaces(null);
    setPollError(null);
    setScreen("upload");
  };

  return (
    <div className="flex flex-col gap-4">
      {pollError && (
        <p className="text-xs text-red-400 bg-red-400/10 rounded p-2">{pollError}</p>
      )}

      {screen === "upload" && <UploadStep onJobCreated={handleJobCreated} />}

      {screen === "processing" && jobId && (
        <ProcessingStep
          jobId={jobId}
          onDone={handleDone}
          onFailed={handleFailed}
        />
      )}

      {screen === "review" && faces && (
        <ReviewStep
          faces={faces}
          solveCube={solveCube}
          onStartOver={handleStartOver}
        />
      )}
    </div>
  );
}
