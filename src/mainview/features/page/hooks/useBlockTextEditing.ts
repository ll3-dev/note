import { RefObject, useEffect, useMemo, useState } from "react";
import type { Block } from "../../../../shared/contracts";
import {
  BLOCK_COMMANDS,
  type BlockCommand,
  getMarkdownShortcut
} from "../lib/blockCommands";
import { placeCursorAtEnd } from "../lib/domSelection";
import type { BlockEditorUpdate } from "../types/blockEditorTypes";

type UseBlockTextEditingOptions = {
  block: Block;
  checked: boolean;
  editableRef: RefObject<HTMLDivElement | null>;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
};

export function useBlockTextEditing({
  block,
  checked,
  editableRef,
  onUpdate
}: UseBlockTextEditingOptions) {
  const [draft, setDraft] = useState(block.text);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const commandQuery = draft.startsWith("/") ? draft.slice(1).toLowerCase() : "";
  const visibleCommands = useMemo(
    () =>
      BLOCK_COMMANDS.filter((command) =>
        command.label.toLowerCase().includes(commandQuery)
      ),
    [commandQuery]
  );

  useEffect(() => {
    setDraft(block.text);
    syncEditableText(block.text);
  }, [block.id, block.text]);

  useEffect(() => {
    setIsCommandMenuOpen(draft.startsWith("/"));
  }, [draft]);

  function commitDraft() {
    if (draft !== block.text) {
      onUpdate(block, { text: draft });
    }
  }

  function applyCommand(command: BlockCommand) {
    const nextProps =
      command.type === "todo" ? { checked: checked, ...command.props } : {};
    const nextText = draft.startsWith("/") ? "" : draft;

    setDraft(nextText);
    syncEditableText(nextText);
    setIsCommandMenuOpen(false);
    onUpdate(block, {
      props: nextProps,
      text: nextText,
      type: command.type
    });
    editableRef.current?.focus();
  }

  function changeDraft(nextValue: string) {
    const shortcut = getMarkdownShortcut(nextValue);

    if (shortcut) {
      setDraft(shortcut.text);
      syncEditableText(shortcut.text);
      setIsCommandMenuOpen(false);
      onUpdate(block, shortcut);
      return;
    }

    setDraft(nextValue);
  }

  function closeCommandMenu() {
    setIsCommandMenuOpen(false);
  }

  function syncEditableText(nextText: string) {
    const editable = editableRef.current;

    if (editable && editable.textContent !== nextText) {
      editable.textContent = nextText;
      placeCursorAtEnd(editable);
    }
  }

  return {
    applyCommand,
    changeDraft,
    closeCommandMenu,
    commitDraft,
    draft,
    isCommandMenuOpen,
    visibleCommands
  };
}
