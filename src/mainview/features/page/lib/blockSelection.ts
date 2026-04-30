import type { Block } from "@/shared/contracts";

export type KeyboardBlockSelectionDirection = "down" | "up";

export type KeyboardBlockSelectionState = {
  anchorBlockId: string | null;
  focusBlockId: string | null;
  selectedBlockIds: string[];
};

export type KeyboardBlockSelectionResult = {
  anchorBlockId: string;
  focusBlockId: string;
  selectedBlockIds: string[];
};

export function getBlockRangeSelection(
  blocks: Block[],
  selectedBlockIds: string[],
  targetBlockId: string
) {
  const anchorId = selectedBlockIds[selectedBlockIds.length - 1];
  const anchorIndex = blocks.findIndex((item) => item.id === anchorId);
  const targetIndex = blocks.findIndex((item) => item.id === targetBlockId);

  if (anchorIndex === -1 || targetIndex === -1) {
    return [targetBlockId];
  }

  const [start, end] =
    anchorIndex < targetIndex
      ? [anchorIndex, targetIndex]
      : [targetIndex, anchorIndex];

  return blocks.slice(start, end + 1).map((item) => item.id);
}

export function getToggledBlockSelection(
  selectedBlockIds: string[],
  targetBlockId: string
) {
  return selectedBlockIds.includes(targetBlockId)
    ? selectedBlockIds.filter((blockId) => blockId !== targetBlockId)
    : [...selectedBlockIds, targetBlockId];
}

export function getHandleBlockSelection(
  blocks: Block[],
  selectedBlockIds: string[],
  targetBlockId: string,
  modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }
) {
  if (modifiers.shiftKey && selectedBlockIds.length > 0) {
    return getBlockRangeSelection(blocks, selectedBlockIds, targetBlockId);
  }

  if (modifiers.metaKey || modifiers.ctrlKey) {
    const nextSelection = getToggledBlockSelection(
      selectedBlockIds,
      targetBlockId
    );

    return nextSelection.length > 0 ? nextSelection : [targetBlockId];
  }

  return selectedBlockIds.includes(targetBlockId)
    ? selectedBlockIds
    : [targetBlockId];
}

export function getKeyboardBlockSelection(
  blocks: Block[],
  state: KeyboardBlockSelectionState,
  direction: KeyboardBlockSelectionDirection,
  extend: boolean
): KeyboardBlockSelectionResult | null {
  const focusBlockId =
    getExistingBlockId(blocks, state.focusBlockId) ??
    getExistingBlockId(blocks, state.selectedBlockIds.at(-1) ?? null);

  if (!focusBlockId) {
    return null;
  }

  const focusIndex = blocks.findIndex((block) => block.id === focusBlockId);
  const nextFocusIndex =
    direction === "up"
      ? Math.max(0, focusIndex - 1)
      : Math.min(blocks.length - 1, focusIndex + 1);
  const nextFocusBlockId = blocks[nextFocusIndex]?.id;

  if (!nextFocusBlockId) {
    return null;
  }

  if (!extend) {
    return {
      anchorBlockId: nextFocusBlockId,
      focusBlockId: nextFocusBlockId,
      selectedBlockIds: [nextFocusBlockId]
    };
  }

  const anchorBlockId =
    getExistingBlockId(blocks, state.anchorBlockId) ?? focusBlockId;

  return {
    anchorBlockId,
    focusBlockId: nextFocusBlockId,
    selectedBlockIds: getBlockRangeSelection(blocks, [anchorBlockId], nextFocusBlockId)
  };
}

function getExistingBlockId(blocks: Block[], blockId: string | null) {
  return blockId && blocks.some((block) => block.id === blockId) ? blockId : null;
}
