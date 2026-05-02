import { useMemo } from "react";
import { useGlobalKeyboardShortcuts } from "@/mainview/features/commands/useGlobalKeyboardShortcuts";
import { useKeybindingStore } from "@/mainview/features/commands/keybindingStore";
import type { WorkspaceTab } from "@/mainview/store/useWorkspaceStore";
import type { WorkspaceHistoryNavigation } from "@/mainview/features/workspace/components/WorkspaceTitleBar";
import { WORKSPACE_COMMANDS } from "@/mainview/features/workspace/lib/workspaceCommands";

type UseWorkspaceScreenCommandsOptions = {
  activeTabId: string | null;
  closeActiveTab: () => Promise<void>;
  navigateTabHistory: (direction: "back" | "forward") => Promise<void>;
  onOpenQuickSwitcher: () => void;
  tabs: WorkspaceTab[];
  toggleSidebar: () => void;
};

export function useWorkspaceScreenCommands({
  activeTabId,
  closeActiveTab,
  navigateTabHistory,
  onOpenQuickSwitcher,
  tabs,
  toggleSidebar
}: UseWorkspaceScreenCommandsOptions) {
  const keybindings = useKeybindingStore((state) => state.keybindings);
  const historyNavigation = useWorkspaceHistoryNavigation({
    activeTabId,
    navigateTabHistory,
    tabs
  });
  const workspaceCommandContext = useMemo(
    () => ({
      closeActiveTab,
      navigateBack: () => navigateTabHistory("back"),
      navigateForward: () => navigateTabHistory("forward"),
      openQuickSwitcher: onOpenQuickSwitcher,
      toggleSidebar: () => {
        window.dispatchEvent(new CustomEvent("note-clear-block-selection"));
        toggleSidebar();
      }
    }),
    [closeActiveTab, navigateTabHistory, onOpenQuickSwitcher, toggleSidebar]
  );

  useGlobalKeyboardShortcuts({
    activeScopes: ["global", "workspace"],
    commands: WORKSPACE_COMMANDS,
    context: workspaceCommandContext,
    keybindings
  });

  return { historyNavigation };
}

function useWorkspaceHistoryNavigation({
  activeTabId,
  navigateTabHistory,
  tabs
}: Pick<
  UseWorkspaceScreenCommandsOptions,
  "activeTabId" | "navigateTabHistory" | "tabs"
>): WorkspaceHistoryNavigation {
  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [activeTabId, tabs]
  );
  const canNavigateBack = (activeTab?.history?.back.length ?? 0) > 0;
  const canNavigateForward = (activeTab?.history?.forward.length ?? 0) > 0;

  return useMemo(
    () => ({
      canGoBack: canNavigateBack,
      canGoForward: canNavigateForward,
      goBack: () => void navigateTabHistory("back"),
      goForward: () => void navigateTabHistory("forward")
    }),
    [canNavigateBack, canNavigateForward, navigateTabHistory]
  );
}
