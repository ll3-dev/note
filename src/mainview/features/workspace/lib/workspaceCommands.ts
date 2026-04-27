import type { Command } from "@/mainview/features/commands/types";

export type WorkspaceCommandContext = {
  closeActiveTab: () => Promise<void>;
  toggleSidebar: () => void;
};

export const WORKSPACE_COMMANDS: Command<WorkspaceCommandContext>[] = [
  {
    defaultKeybindings: ["Mod+W"],
    id: "workspace.tab.closeActive",
    scope: "workspace",
    title: "Close active tab",
    run: async ({ closeActiveTab }) => {
      await closeActiveTab();
    }
  },
  {
    defaultKeybindings: ["Mod+\\"],
    id: "workspace.sidebar.toggle",
    scope: "workspace",
    title: "Toggle sidebar",
    run: ({ toggleSidebar }) => {
      toggleSidebar();
    }
  }
];
