import type { RefObject } from "react";
import { useState } from "react";
import type { Block } from "@/shared/contracts";
import { getInlinePageLinkProps } from "@/mainview/features/page/lib/inlineFormatting";
import { useInlinePageSearch } from "@/mainview/features/page/hooks/useInlinePageSearch";
import {
  getCursorClientRect,
  getCursorTextOffset
} from "@/mainview/features/page/web/domSelection";
import type { InlinePageLinkApplyMode } from "@/mainview/features/page/types/blockEditorTypes";

type UseInlinePageLinkEditingOptions = {
  draft: string;
  draftProps: Block["props"];
  editableRef: RefObject<HTMLDivElement | null>;
  onApplyInlinePageLink: (
    text: string,
    props: Block["props"],
    cursorOffset: number,
    mode?: InlinePageLinkApplyMode
  ) => void;
};

export function useInlinePageLinkEditing({
  draft,
  draftProps,
  editableRef,
  onApplyInlinePageLink
}: UseInlinePageLinkEditingOptions) {
  const { triggerState, checkTrigger, closeSearch } = useInlinePageSearch();
  const [inlineSearchRect, setInlineSearchRect] = useState<DOMRect | null>(null);

  function closeInlineSearch() {
    closeSearch();
    setInlineSearchRect(null);
  }

  function handleEditableInput(nextValue: string) {
    if (!editableRef.current) {
      return;
    }

    const offset = getCursorTextOffset(editableRef.current);

    if (offset === null) {
      return;
    }

    const nextTriggerState = checkTrigger(nextValue, offset);
    setInlineSearchRect(
      nextTriggerState ? getCursorClientRect(editableRef.current) : null
    );
  }

  function handlePageSelect(pageId: string, pageTitle: string) {
    if (!triggerState || !editableRef.current) return;

    const triggerEnd =
      triggerState.triggerOffset + (triggerState.triggerChar === "[[" ? 2 : 1);
    const queryEnd = triggerEnd + triggerState.query.length;
    const beforeTrigger = draft.slice(0, triggerState.triggerOffset);
    const afterQuery = draft.slice(queryEnd);

    if (isStandalonePageLink(beforeTrigger, afterQuery)) {
      onApplyInlinePageLink(
        "",
        { targetPageId: pageId, targetTitle: pageTitle },
        0,
        "block"
      );
      closeInlineSearch();
      return;
    }

    const newText = beforeTrigger + pageTitle + afterQuery;
    const markStart = beforeTrigger.length;
    const markEnd = markStart + pageTitle.length;
    const newProps = getInlinePageLinkProps(
      draftProps,
      { start: markStart, end: markEnd },
      pageId
    );

    if (newProps) {
      onApplyInlinePageLink(newText, newProps, markEnd);
    }

    closeInlineSearch();
  }

  return {
    closeInlineSearch,
    handleEditableInput,
    handlePageSelect,
    inlineSearchRect,
    triggerState
  };
}

function isStandalonePageLink(beforeTrigger: string, afterQuery: string) {
  return beforeTrigger.trim().length === 0 && afterQuery.trim().length === 0;
}
