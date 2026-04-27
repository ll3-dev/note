import type { Command } from "@/mainview/features/commands/types";

export type WorkspaceCommandContext = {
  toggleSidebar: () => void;
};

export const WORKSPACE_COMMANDS: Command<WorkspaceCommandContext>[] = [
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
