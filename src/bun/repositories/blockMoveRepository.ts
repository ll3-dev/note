import type { DatabaseHandle } from "../database";
import { getBlock } from "./blockReadRepository";
import { recordOperation } from "./noteOperations";
import { touchPage } from "./pageTouch";
import type { Block, MoveBlockInput } from "../../shared/contracts";

export function moveBlock(
  handle: DatabaseHandle,
  input: MoveBlockInput
): Block {
  const movingBlock = getBlock(handle, input.blockId);
  const afterBlock = input.afterBlockId ? getBlock(handle, input.afterBlockId) : null;

  if (
    afterBlock &&
    (afterBlock.id === movingBlock.id ||
      afterBlock.pageId !== movingBlock.pageId ||
      afterBlock.parentBlockId !== movingBlock.parentBlockId)
  ) {
    throw new Error("afterBlockId must belong to the same block list");
  }

  handle.db.transaction(() => {
    const nextIds = getSiblingBlockIds(handle, movingBlock);
    const afterIndex = afterBlock ? nextIds.indexOf(afterBlock.id) : -1;
    const insertIndex = afterBlock ? afterIndex + 1 : 0;

    if (afterBlock && afterIndex < 0) {
      throw new Error("afterBlockId must belong to the same block list");
    }

    nextIds.splice(insertIndex, 0, movingBlock.id);
    rewriteSortKeys(handle, nextIds, movingBlock.id);

    touchPage(handle, movingBlock.pageId);
    recordOperation(handle, "block", movingBlock.id, "move", {
      afterBlockId: afterBlock?.id ?? null
    });
  })();

  return getBlock(handle, movingBlock.id);
}

function getSiblingBlockIds(handle: DatabaseHandle, movingBlock: Block) {
  const rows = handle.db
    .query(
      `
      SELECT id
      FROM blocks
      WHERE page_id = ?
        AND parent_block_id IS ?
        AND id != ?
      ORDER BY sort_key
      `
    )
    .all(
      movingBlock.pageId,
      movingBlock.parentBlockId,
      movingBlock.id
    ) as Array<{ id: string }>;

  return rows.map((row) => row.id);
}

function rewriteSortKeys(
  handle: DatabaseHandle,
  blockIds: string[],
  movedBlockId: string
) {
  for (const [index, blockId] of blockIds.entries()) {
    handle.db
      .query(
        `
        UPDATE blocks
        SET sort_key = printf('%08d', ?),
            updated_at = CASE WHEN id = ? THEN CURRENT_TIMESTAMP ELSE updated_at END
        WHERE id = ?
        `
      )
      .run(index, movedBlockId, blockId);
  }
}
