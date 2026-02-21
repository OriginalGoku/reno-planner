"use client";

import { createContext, useContext } from "react";
import type { RenovationProject } from "@/lib/reno-data-loader";

const RenoDataContext = createContext<RenovationProject | null>(null);

type RenoDataProviderProps = {
  project: RenovationProject;
  children: React.ReactNode;
};

export function RenoDataProvider({ project, children }: RenoDataProviderProps) {
  return (
    <RenoDataContext.Provider value={project}>{children}</RenoDataContext.Provider>
  );
}

export function useRenoData() {
  const context = useContext(RenoDataContext);
  if (!context) {
    throw new Error("useRenoData must be used inside RenoDataLoader.");
  }
  return context;
}
