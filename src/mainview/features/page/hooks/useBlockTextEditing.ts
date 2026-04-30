import { RefObject, useCallback, useState } from "react";
import type { Block, BlockProps } from "@/shared/contracts";
import { type BlockCommand, getMarkdownShortcut } from "@/mainview/features/page/lib/blockCommands";
import {
  placeCursorAtEnd,
  placeCursorAtOffset
} from "@/mainview/features/page/web/domSelection";
import { areBlockPropsEqual } from "@/mainview/features/page/lib/blockProps";
import type {
  BlockEditorUpdate,
  CreateBlockOptions
} from "@/mainview/features/page/types/blockEditorTypes";
import type { CreateBlockDraft } from "@/mainview/features/page/lib/blockEditingBehavior";
import { useBlockCommandMenu } from "./useBlockCommandMenu";
import { useBlockDraftSync } from "./useBlockDraftSync";
import { useInlineMarkEditing } from "./useInlineMarkEditing";

type UseBlockTextEditingOptions = {
  block: Block;
  checked: boolean;
  editableRef: RefObject<HTMLDivElement | null>;
  onTextDraftChange: (block: Block, text: string, props?: BlockProps) => void;
  onTextDraftFlush: (
    block: Block,
    text: string,
    props?: BlockProps
  ) => Promise<void>;
  onCreateBlockAfter: (
    block: Block,
    draft?: CreateBlockDraft,
    options?: CreateBlockOptions
  ) => Promise<void>;
  onTextHistoryApply: (block: Block, text: string) => void;
  onTextRedo: (block: Block) => Promise<Block | null>;
  onTextUndo: (block: Block) => Promise<Block | null>;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
};

export function useBlockTextEditing({
  block,
  checked,
  editableRef,
  onTextDraftChange,
  onTextDraftFlush,
  onCreateBlockAfter,
  onTextHistoryApply,
  onTextRedo,
  onTextUndo,
  onUpdate
}: UseBlockTextEditingOptions) {
  const [draft, setDraft] = useState(block.text);
  const [draftProps, setDraftProps] = useState<BlockProps>(block.props);
  const commandMenu = useBlockCommandMenu({ draft });

  const syncEditableText = useCallback(
    (nextText: string, cursorOffset?: number) => {
      const editable = editableRef.current;

      if (editable && editable.textContent !== nextText) {
        editable.textContent = nextText;
        if (cursorOffset === undefined) {
          placeCursorAtEnd(editable);
        } else {
          placeCursorAtOffset(editable, cursorOffset);
        }
      }
    },
    [editableRef]
  );

  useBlockDraftSync({
    block,
    draft,
    draftProps,
    setDraft,
    setDraftProps,
    syncEditableText
  });

  const {
    applyInlineFormat,
    applyInlineLink,
    applyMarksToInsertedText,
    selectionToolbarRect,
    syncActiveInlineMarksFromSelection
  } = useInlineMarkEditing({
    block,
    draftProps,
    editableRef,
    onUpdate,
    setDraftProps
  });

  async function commitDraft() {
    if (draft !== block.text || !areBlockPropsEqual(draftProps, block.props)) {
      await onTextDraftFlush(block, draft, draftProps);
    }
  }

  async function applyCommand(command: BlockCommand) {
    const nextProps = command.type === "todo" ? { checked, ...command.props } : {};
    const nextText = draft.startsWith("/") ? "" : draft;

    setDraft(nextText);
    setDraftProps(nextProps);
    syncEditableText(nextText);
    commandMenu.closeCommandMenu();
    onUpdate(block, {
      props: nextProps,
      text: nextText,
      type: command.type
    });
    if (command.createBlockAfter) {
      await onCreateBlockAfter(block, command.createBlockAfter, {
        focusPlacement: "start"
      });
      return;
    }
    editableRef.current?.focus();
  }

  function applySelectedCommand() {
    const command = commandMenu.getSelectedCommand();

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
      commandMenu.closeCommandMenu();
      onUpdate(block, shortcut);
      if (shortcut.createBlockAfter) {
        void onCreateBlockAfter(block, shortcut.createBlockAfter);
      }
      return;
    }

    applyTextDraftChange(nextValue);
  }

  function applyTextDraftChange(nextValue: string) {
    const nextProps = applyMarksToInsertedText(nextValue, draft);

    setDraft(nextValue);

    if (nextProps) {
      setDraftProps(nextProps);
      onTextDraftChange(block, nextValue, nextProps);
      return;
    }

    onTextDraftChange(block, nextValue, draftProps);
  }

  async function redoTextDraft() {
    await applyHistoryTextDraft(await onTextRedo(block));
  }

  async function undoTextDraft() {
    await applyHistoryTextDraft(await onTextUndo(block));
  }

  async function applyHistoryTextDraft(nextBlock: Block | null) {
    if (nextBlock === null) {
      return;
    }

    setDraft(nextBlock.text);
    setDraftProps(nextBlock.props);
    syncEditableText(nextBlock.text);
    onTextHistoryApply(nextBlock, nextBlock.text);
  }

  return {
    applyCommand,
    applyInlineFormat,
    applyInlineLink,
    applySelectedCommand,
    changeDraft,
    closeCommandMenu: commandMenu.closeCommandMenu,
    commitDraft,
    draft,
    draftProps,
    isCommandMenuOpen: commandMenu.isCommandMenuOpen,
    selectedCommandIndex: commandMenu.selectedCommandIndex,
    selectionToolbarRect,
    selectNextCommand: commandMenu.selectNextCommand,
    selectPreviousCommand: commandMenu.selectPreviousCommand,
    setSelectedCommandIndex: commandMenu.setSelectedCommandIndex,
    syncActiveInlineMarksFromSelection,
    redoTextDraft,
    undoTextDraft,
    visibleCommands: commandMenu.visibleCommands
  };
}
