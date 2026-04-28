import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type KeyboardEvent
} from "react";
import type { Page } from "../../../../shared/contracts";
import { placeCursorAtEnd } from "../lib/domSelection";

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
  const titleRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (titleRef.current) {
        placeCursorAtEnd(titleRef.current);
      }
    }
  }));

  useLayoutEffect(() => {
    const titleElement = titleRef.current;

    if (titleElement && window.document.activeElement !== titleElement) {
      titleElement.textContent = page.title;
    }
  }, [page.id, page.title]);

  useEffect(() => clearSaveTimer, []);

  function clearSaveTimer() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }

  function saveTitle(target: HTMLElement) {
    clearSaveTimer();
    const title = (target.textContent ?? "").trim();

    if (title && title !== page.title) {
      onUpdatePageTitle(page, title);
    } else {
      target.textContent = page.title;
    }
  }

  function queueTitleSave(target: HTMLElement) {
    clearSaveTimer();
    saveTimerRef.current = setTimeout(() => {
      saveTitle(target);
    }, 700);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveTitle(event.currentTarget);
      event.currentTarget.blur();
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      saveTitle(event.currentTarget);
      onFocusFirstBlock();
    }
  }

  return (
    <header className="mb-7 pl-10">
      <div
        aria-level={1}
        aria-label={page.title}
        className="rounded-sm text-[40px] font-bold leading-tight tracking-normal outline-none"
        contentEditable="plaintext-only"
        onBlur={(event) => saveTitle(event.currentTarget)}
        onInput={(event) => queueTitleSave(event.currentTarget)}
        onKeyDown={handleKeyDown}
        ref={titleRef}
        role="heading"
        suppressContentEditableWarning
      />
    </header>
  );
});
