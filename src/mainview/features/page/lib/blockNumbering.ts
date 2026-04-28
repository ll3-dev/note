import type { Block } from "../../../../shared/contracts";
import { getBlockDepth, getNumberedListStart } from "./blockEditingBehavior";

export function getNumberedListMarkers(blocks: Block[]) {
  const markers = new Map<string, number>();
  let previousDepth: number | null = null;
  let previousMarker: number | null = null;

  for (const block of blocks) {
    if (block.type !== "numbered_list") {
      previousDepth = null;
      previousMarker = null;
      continue;
    }

    const depth = getBlockDepth(block);
    const explicitStart = getNumberedListStart(block);
    const marker: number =
      previousDepth === depth && previousMarker !== null
        ? Math.max(explicitStart, previousMarker + 1)
        : explicitStart;

    markers.set(block.id, marker);
    previousDepth = depth;
    previousMarker = marker;
  }

  return markers;
}
