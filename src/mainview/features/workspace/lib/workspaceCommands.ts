import type { Command } from "@/mainview/features/commands/types";

export type WorkspaceCommandContext = {
  closeActiveTab: () => Promise<void>;
  navigateBack: () => Promise<void>;
  navigateForward: () => Promise<void>;
  openQuickSwitcher: () => void;
  openSettings: () => void;
  toggleSidebar: () => void;
};

export const WORKSPACE_COMMANDS: Command<WorkspaceCommandContext>[] = [
  {
    defaultKeybindings: ["Mod+[", "Mod+ArrowLeft", "BrowserBack"],
    id: "workspace.history.back",
    scope: "workspace",
    title: "Go back",
    run: async ({ navigateBack }) => {
      await navigateBack();
    }
  },
  {
    defaultKeybindings: ["Mod+]", "Mod+ArrowRight", "BrowserForward"],
    id: "workspace.history.forward",
    scope: "workspace",
    title: "Go forward",
    run: async ({ navigateForward }) => {
      await navigateForward();
    }
  },
  {
    defaultKeybindings: ["Mod+P"],
    id: "workspace.quickSwitcher.open",
    scope: "workspace",
    title: "Open quick switcher",
    run: ({ openQuickSwitcher }) => {
      openQuickSwitcher();
    }
  },
  {
    defaultKeybindings: ["Mod+,"],
    id: "workspace.settings.open",
    scope: "workspace",
    title: "Open settings",
    run: ({ openSettings }) => {
      openSettings();
    }
  },
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
