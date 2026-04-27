import { eq } from "drizzle-orm";
import type { DatabaseHandle } from "../database";
import { blocks } from "../schema";
import { mapBlock } from "./noteRows";
import type { Block } from "../../shared/contracts";

export function listBlocksForPage(
  handle: DatabaseHandle,
  pageId: string
): Block[] {
  const rows = handle.orm
    .select()
    .from(blocks)
    .where(eq(blocks.page_id, pageId))
    .orderBy(blocks.parent_block_id, blocks.sort_key)
    .all();

  return rows.map(mapBlock);
}

export function getBlock(handle: DatabaseHandle, blockId: string): Block {
  const row = handle.orm
    .select()
    .from(blocks)
    .where(eq(blocks.id, blockId))
    .get();

  if (!row) {
    throw new Error(`block not found: ${blockId}`);
  }

  return mapBlock(row);
}
