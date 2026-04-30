import { useEffect, useState, type RefObject } from "react";
import type { Block, BlockProps } from "@/shared/contracts";
import {
  addInlineMarksToProps,
  getInlineFormatProps,
  getInlineLinkProps,
  getInlineMarksAtOffset,
  getInlineMarkType,
  type TextStyleInlineMarkType
} from "@/mainview/features/page/lib/inlineFormatting";
import {
  getTextSelectionOffsets,
  getTextSelectionRect
} from "@/mainview/features/page/web/domSelection";
import type { BlockEditorUpdate } from "@/mainview/features/page/types/blockEditorTypes";

type SelectionOffsets = { end: number; start: number };

type UseInlineMarkEditingOptions = {
  block: Block;
  draftProps: BlockProps;
  editableRef: RefObject<HTMLDivElement | null>;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
  setDraftProps: (props: BlockProps) => void;
};

export function useInlineMarkEditing({
  block,
  draftProps,
  editableRef,
  onUpdate,
  setDraftProps
}: UseInlineMarkEditingOptions) {
  const [activeInlineMarks, setActiveInlineMarks] = useState<TextStyleInlineMarkType[]>([]);
  const [selectionOffsets, setSelectionOffsets] = useState<SelectionOffsets | null>(null);
  const [selectionToolbarRect, setSelectionToolbarRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setActiveInlineMarks([]);
    setSelectionOffsets(null);
    setSelectionToolbarRect(null);
  }, [block.id]);

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
    syncActiveInlineMarksFromSelection();
  }

  function applyInlineLink(href: string) {
    const editable = editableRef.current;
    const selection = editable
      ? getTextSelectionOffsets(editable) ?? selectionOffsets
      : selectionOffsets;
    const props = getInlineLinkProps(draftProps, selection, href);

    if (!props) {
      return;
    }

    setDraftProps(props);
    onUpdate(block, { props });
    syncActiveInlineMarksFromSelection();
  }

  function applyMarksToInsertedText(nextValue: string, previousValue: string) {
    const selection = editableRef.current
      ? getTextSelectionOffsets(editableRef.current)
      : null;
    const insertedLength = nextValue.length - previousValue.length;

    if (
      activeInlineMarks.length === 0 ||
      insertedLength <= 0 ||
      !selection ||
      selection.start !== selection.end
    ) {
      return null;
    }

    const end = selection.end;
    const start = Math.max(0, end - insertedLength);
    return addInlineMarksToProps(draftProps, activeInlineMarks, { end, start });
  }

  function syncActiveInlineMarksFromSelection() {
    const editable = editableRef.current;
    const selection = editable ? getTextSelectionOffsets(editable) : null;

    setSelectionToolbarRect(editable ? getTextSelectionRect(editable) : null);

    if (!selection) {
      setSelectionOffsets(null);
      return;
    }

    if (selection.start !== selection.end) {
      setSelectionOffsets(selection);
      return;
    }

    setSelectionOffsets(null);
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

  return {
    applyInlineFormat,
    applyInlineLink,
    applyMarksToInsertedText,
    selectionToolbarRect,
    syncActiveInlineMarksFromSelection
  };
}
