import type { PageDocument } from "@/shared/contracts";

export function getSelectedBlockEditTargetId(
  selectedBlockIds: string[],
  selectionFocusBlockId: string | null
) {
  return selectionFocusBlockId ?? selectedBlockIds.at(-1) ?? null;
}

export function getBlockSelectAllShortcutIds(
  document: PageDocument,
  selectedBlockIds: string[],
  target: EventTarget | null
) {
  if (
    selectedBlockIds.length > 0 &&
    shouldIgnoreSelectedBlockShortcutTarget(target, selectedBlockIds)
  ) {
    return null;
  }

  if (selectedBlockIds.length > 0) {
    return document.blocks.map((block) => block.id);
  }

  const targetBlockId = getTargetBlockId(target);

  return targetBlockId ? [targetBlockId] : null;
}

export function shouldIgnoreSelectedBlockShortcutTarget(
  target: EventTarget | null,
  selectedBlockIds: string[]
) {
  if (!isClosestTarget(target)) {
    return false;
  }

  const editableTarget = target.closest(
    "input,textarea,select,[contenteditable]"
  );

  if (!editableTarget) {
    return false;
  }

  const blockElement = target.closest("[data-block-id]");
  const blockId = blockElement?.getAttribute("data-block-id");

  return !blockId || !selectedBlockIds.includes(blockId);
}

export function getTargetBlockId(target: EventTarget | null) {
  if (!isClosestTarget(target)) {
    return null;
  }

  return target.closest("[data-block-id]")?.getAttribute("data-block-id") ?? null;
}

export function shouldIgnoreEditableEscapeTarget(target: EventTarget | null) {
  if (!isClosestTarget(target)) {
    return true;
  }

  return !target.closest("[contenteditable]");
}

function isClosestTarget(
  target: EventTarget | null
): target is EventTarget & {
  closest: (selector: string) => Element | null;
} {
  return (
    typeof target === "object" &&
    target !== null &&
    "closest" in target &&
    typeof target.closest === "function"
  );
}
