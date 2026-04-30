import type { Block } from "../../../../shared/contracts";

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
