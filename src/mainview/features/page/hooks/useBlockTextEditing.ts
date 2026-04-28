import { RefObject, useEffect, useMemo, useState } from "react";
import type { Block, BlockProps } from "../../../../shared/contracts";
import {
  type BlockCommand,
  filterBlockCommands,
  getMarkdownShortcut
} from "../lib/blockCommands";
import {
  getTextSelectionOffsets,
  placeCursorAtEnd,
  placeCursorAtOffset
} from "../lib/domSelection";
import {
  addInlineMarksToProps,
  getInlineFormatProps,
  getInlineMarksAtOffset,
  getInlineMarkType,
  type InlineMarkType
} from "../lib/inlineFormatting";
import type { BlockEditorUpdate } from "../types/blockEditorTypes";

type UseBlockTextEditingOptions = {
  block: Block;
  checked: boolean;
  editableRef: RefObject<HTMLDivElement | null>;
  onTextDraftChange: (block: Block, text: string) => void;
  onTextDraftFlush: (block: Block, text: string) => Promise<void>;
  onTextHistoryApply: (block: Block, text: string) => void;
  onTextRedo: (block: Block) => string | null;
  onTextUndo: (block: Block) => string | null;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
};

export function useBlockTextEditing({
  block,
  checked,
  editableRef,
  onTextDraftChange,
  onTextDraftFlush,
  onTextHistoryApply,
  onTextRedo,
  onTextUndo,
  onUpdate
}: UseBlockTextEditingOptions) {
  const [draft, setDraft] = useState(block.text);
  const [draftProps, setDraftProps] = useState<BlockProps>(block.props);
  const [activeInlineMarks, setActiveInlineMarks] = useState<InlineMarkType[]>([]);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const commandQuery = draft.startsWith("/") ? draft.slice(1).toLowerCase() : "";
  const visibleCommands = useMemo(
    () => filterBlockCommands(commandQuery),
    [commandQuery]
  );

  useEffect(() => {
    setDraft(block.text);
    setDraftProps(block.props);
    syncEditableText(block.text);
  }, [block.id, block.props, block.text]);

  useEffect(() => {
    setActiveInlineMarks([]);
  }, [block.id]);

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

  async function commitDraft() {
    if (draft !== block.text) {
      await onTextDraftFlush(block, draft);
    }
  }

  async function applyCommand(command: BlockCommand) {
    const nextProps = command.type === "todo" ? { checked, ...command.props } : {};
    const nextText = draft.startsWith("/") ? "" : draft;

    setDraft(nextText);
    setDraftProps(nextProps);
    syncEditableText(nextText);
    setIsCommandMenuOpen(false);
    onUpdate(block, {
      props: nextProps,
      text: nextText,
      type: command.type
    });
    editableRef.current?.focus();
  }

  function applySelectedCommand() {
    const command = visibleCommands[selectedCommandIndex];

    if (command) {
      void applyCommand(command);
    }
  }

  function changeDraft(nextValue: string) {
    const shortcut = getMarkdownShortcut(nextValue);

    if (shortcut) {
      setDraft(shortcut.text);
      setDraftProps(shortcut.props);
      syncEditableText(shortcut.text);
      setIsCommandMenuOpen(false);
      onUpdate(block, shortcut);
      return;
    }

    applyTextDraftChange(nextValue);
  }

  function applyInlineFormat(commandId: string) {
    const editable = editableRef.current;
    const selection = editable ? getTextSelectionOffsets(editable) : null;

    if (!selection || selection.start === selection.end) {
      toggleActiveInlineMark(commandId);
      return;
    }

    const props = getInlineFormatProps(commandId, draftProps, selection);

    if (!props) {
      return;
    }

    setDraftProps(props);
    onUpdate(block, { props });
  }

  function applyTextDraftChange(nextValue: string) {
    const selection = editableRef.current
      ? getTextSelectionOffsets(editableRef.current)
      : null;
    const insertedLength = nextValue.length - draft.length;

    setDraft(nextValue);

    if (
      activeInlineMarks.length > 0 &&
      insertedLength > 0 &&
      selection &&
      selection.start === selection.end
    ) {
      const end = selection.end;
      const start = Math.max(0, end - insertedLength);
      const props = addInlineMarksToProps(draftProps, activeInlineMarks, {
        end,
        start
      });

      setDraftProps(props);
      onUpdate(block, { props, text: nextValue });
      return;
    }

    onTextDraftChange(block, nextValue);
  }

  function redoTextDraft() {
    applyHistoryTextDraft(onTextRedo(block));
  }

  function undoTextDraft() {
    applyHistoryTextDraft(onTextUndo(block));
  }

  function applyHistoryTextDraft(nextText: string | null) {
    if (nextText === null) {
      return;
    }

    setDraft(nextText);
    syncEditableText(nextText);
    onTextHistoryApply(block, nextText);
  }

  function syncActiveInlineMarksFromSelection() {
    const editable = editableRef.current;
    const selection = editable ? getTextSelectionOffsets(editable) : null;

    if (!selection || selection.start !== selection.end) {
      return;
    }

    setActiveInlineMarks(getInlineMarksAtOffset(draftProps, selection.start));
  }

  function toggleActiveInlineMark(commandId: string) {
    const type = getInlineMarkType(commandId);

    if (!type) {
      return;
    }

    setActiveInlineMarks((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    );
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

  function syncEditableText(nextText: string, cursorOffset?: number) {
    const editable = editableRef.current;

    if (editable && editable.textContent !== nextText) {
      editable.textContent = nextText;
      if (cursorOffset === undefined) {
        placeCursorAtEnd(editable);
      } else {
        placeCursorAtOffset(editable, cursorOffset);
      }
    }
  }

  return {
    applyCommand,
    applyInlineFormat,
    applySelectedCommand,
    changeDraft,
    closeCommandMenu,
    commitDraft,
    draft,
    draftProps,
    isCommandMenuOpen,
    selectedCommandIndex,
    selectNextCommand,
    selectPreviousCommand,
    setSelectedCommandIndex,
    syncActiveInlineMarksFromSelection,
    redoTextDraft,
    undoTextDraft,
    visibleCommands
  };
}
