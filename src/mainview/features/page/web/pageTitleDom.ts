export function focusPageTitleEditor() {
  requestAnimationFrame(() => {
    const title = document.querySelector<HTMLElement>("[data-page-title-editor]");

    title?.focus();
  });
}
