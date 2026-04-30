import type { BlockDropPlacement } from "@/mainview/features/page/lib/blockDrag";

export function getDropPlacement(
  clientY: number,
  target: HTMLElement
): BlockDropPlacement {
  const rect = target.getBoundingClientRect();

  return clientY < rect.top + rect.height / 2 ? "before" : "after";
}

export function getDragPreviewOffset(event: {
  clientX: number;
  clientY: number;
  currentTarget: Element;
}) {
  const blockElement = event.currentTarget.closest<HTMLElement>("[data-block-id]");
  const rect = blockElement?.getBoundingClientRect();

  if (!rect) {
    return { x: 12, y: -12 };
  }

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}
