export const UNTITLED_PAGE_TITLE = "Untitled";

export function getPageTitleDisplay(title: string) {
  return title.trim() || UNTITLED_PAGE_TITLE;
}
