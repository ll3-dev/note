import { create } from "zustand";

type WorkspaceState = {
  selectedPageId: string | null;
  setSelectedPageId: (pageId: string | null) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedPageId: null,
  setSelectedPageId: (pageId) => set({ selectedPageId: pageId })
}));
