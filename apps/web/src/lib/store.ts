import { create } from "zustand";

export type WorkspaceView = "assets" | "scripts" | "create" | "jobs" | "analytics";

type AppState = {
  view: WorkspaceView;
  selectedProductId?: string;
  selectedScriptId?: string;
  activeJobId?: string;
  setView: (view: WorkspaceView) => void;
  setSelectedProductId: (id?: string) => void;
  setSelectedScriptId: (id?: string) => void;
  setActiveJobId: (id?: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  view: "assets",
  setView: (view) => set({ view }),
  setSelectedProductId: (selectedProductId) => set({ selectedProductId }),
  setSelectedScriptId: (selectedScriptId) => set({ selectedScriptId }),
  setActiveJobId: (activeJobId) => set({ activeJobId })
}));
