import { useMemo, useState } from "react";
import {
  type BlockCommand,
  filterBlockCommands
} from "../lib/blockCommands";

type UseBlockCommandMenuOptions = {
  draft: string;
};

export function useBlockCommandMenu({ draft }: UseBlockCommandMenuOptions) {
  const commandQuery = draft.startsWith("/") ? draft.slice(1).toLowerCase() : "";
  const [closedCommandQuery, setClosedCommandQuery] = useState<string | null>(
    null
  );
  const [selectedCommandState, setSelectedCommandState] = useState({
    index: 0,
    query: commandQuery
  });
  const visibleCommands = useMemo(
    () => filterBlockCommands(commandQuery),
    [commandQuery]
  );
  const isCommandMenuOpen =
    draft.startsWith("/") && closedCommandQuery !== commandQuery;
  const selectedCommandIndex =
    selectedCommandState.query === commandQuery
      ? clampCommandIndex(selectedCommandState.index, visibleCommands.length)
      : 0;

  function getSelectedCommand(): BlockCommand | null {
    return visibleCommands[selectedCommandIndex] ?? null;
  }

  function closeCommandMenu() {
    setClosedCommandQuery(commandQuery);
  }

  function selectNextCommand() {
    if (visibleCommands.length === 0) {
      return;
    }

    setSelectedCommandState({
      index: (selectedCommandIndex + 1) % visibleCommands.length,
      query: commandQuery
    });
  }

  function selectPreviousCommand() {
    if (visibleCommands.length === 0) {
      return;
    }

    setSelectedCommandState({
      index:
        (selectedCommandIndex - 1 + visibleCommands.length) %
        visibleCommands.length,
      query: commandQuery
    });
  }

  function setSelectedCommandIndex(index: number) {
    setSelectedCommandState({ index, query: commandQuery });
  }

  return {
    closeCommandMenu,
    getSelectedCommand,
    isCommandMenuOpen,
    selectedCommandIndex,
    selectNextCommand,
    selectPreviousCommand,
    setSelectedCommandIndex,
    visibleCommands
  };
}

function clampCommandIndex(index: number, commandCount: number) {
  if (commandCount === 0) {
    return 0;
  }

  return Math.max(0, Math.min(index, commandCount - 1));
}
