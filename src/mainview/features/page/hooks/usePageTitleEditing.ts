import {
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent
} from "react";
import type { Page } from "@/shared/contracts";

type UsePageTitleEditingOptions = {
  page: Page;
  onFocusFirstBlock: () => void;
  onUpdatePageTitle: (page: Page, title: string) => void;
};

export function usePageTitleEditing({
  page,
  onFocusFirstBlock,
  onUpdatePageTitle
}: UsePageTitleEditingOptions) {
  const titleRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function handleTitleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveTitle(event.currentTarget);
      onFocusFirstBlock();
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      saveTitle(event.currentTarget);
      onFocusFirstBlock();
    }
  }

  return {
    handleTitleKeyDown,
    queueTitleSave,
    saveTitle,
    titleRef
  };
}
