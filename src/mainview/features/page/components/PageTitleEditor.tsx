import {
  forwardRef,
  useImperativeHandle,
} from "react";
import type { Page } from "@/shared/contracts";
import { getPageTitleDisplay } from "@/shared/pageDisplay";
import { usePageTitleEditing } from "@/mainview/features/page/hooks/usePageTitleEditing";
import { placeCursorAtEnd } from "@/mainview/features/page/web/domSelection";

export type PageTitleEditorHandle = {
  focus: () => void;
};

type PageTitleEditorProps = {
  page: Page;
  onFocusFirstBlock: () => void;
  onUpdatePageTitle: (page: Page, title: string) => void;
};

export const PageTitleEditor = forwardRef<
  PageTitleEditorHandle,
  PageTitleEditorProps
>(function PageTitleEditor({ page, onFocusFirstBlock, onUpdatePageTitle }, ref) {
  const { handleTitleKeyDown, queueTitleSave, saveTitle, titleRef } =
    usePageTitleEditing({
      page,
      onFocusFirstBlock,
      onUpdatePageTitle
    });

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (titleRef.current) {
        placeCursorAtEnd(titleRef.current);
      }
    }
  }));

  return (
    <header className="mb-7 pl-10">
      <div
        aria-level={1}
        aria-label={getPageTitleDisplay(page.title)}
        className="page-title-editor rounded-sm text-[40px] font-bold leading-tight tracking-normal outline-none"
        contentEditable="plaintext-only"
        data-page-title-editor
        data-placeholder={getPageTitleDisplay("")}
        onBlur={(event) => saveTitle(event.currentTarget)}
        onInput={(event) => queueTitleSave(event.currentTarget)}
        onKeyDown={handleTitleKeyDown}
        ref={titleRef}
        role="heading"
        suppressContentEditableWarning
      />
    </header>
  );
});
