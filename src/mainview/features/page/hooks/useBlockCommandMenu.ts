import { useEffect, useMemo, useState } from "react";
import {
  type BlockCommand,
  filterBlockCommands
} from "../lib/blockCommands";

type UseBlockCommandMenuOptions = {
  draft: string;
};

export function useBlockCommandMenu({ draft }: UseBlockCommandMenuOptions) {
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const commandQuery = draft.startsWith("/") ? draft.slice(1).toLowerCase() : "";
  const visibleCommands = useMemo(
    () => filterBlockCommands(commandQuery),
    [commandQuery]
  );

  useEffect(() => {
    setIsCommandMenuOpen(draft.startsWith("/"));
  }, [draft]);

  useEffect(() => {
    setSelectedCommandIndex(0);
  }, [commandQuery]);

  useEffect(() => {
    setSelectedCommandIndex((current) =>
      visibleCommands.length === 0
        ? 0
        : Math.min(current, visibleCommands.length - 1)
    );
  }, [visibleCommands.length]);

  function getSelectedCommand(): BlockCommand | null {
    return visibleCommands[selectedCommandIndex] ?? null;
  }

  function closeCommandMenu() {
    setIsCommandMenuOpen(false);
  }

  function selectNextCommand() {
    if (visibleCommands.length === 0) {
      return;
    }

    setSelectedCommandIndex(
      (current) => (current + 1) % visibleCommands.length
    );
  }

  function selectPreviousCommand() {
    if (visibleCommands.length === 0) {
      return;
    }

    setSelectedCommandIndex(
      (current) =>
        (current - 1 + visibleCommands.length) % visibleCommands.length
    );
  }

  return {
    closeCommandMenu,
    getSelectedCommand,
    isCommandMenuOpen,
    selectedCommandIndex,
    selectNextCommand,
    selectPreviousCommand,
    setIsCommandMenuOpen,
    setSelectedCommandIndex,
    visibleCommands
  };
}
