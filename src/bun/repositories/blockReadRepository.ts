import type { DatabaseHandle } from "../database";
import { mapBlock, type BlockRow } from "./noteRows";
import type { Block } from "../../shared/contracts";

export function listBlocksForPage(
  handle: DatabaseHandle,
  pageId: string
): Block[] {
  const rows = handle.db
    .query(
      `
      SELECT
        id,
        page_id,
        parent_block_id,
        type,
        sort_key,
        text,
        props_json,
        created_at,
        updated_at
      FROM blocks
      WHERE page_id = ?
      ORDER BY parent_block_id IS NOT NULL, parent_block_id, sort_key
      `
    )
    .all(pageId) as BlockRow[];

  return rows.map(mapBlock);
}

export function getBlock(handle: DatabaseHandle, blockId: string): Block {
  const row = handle.db
    .query(
      `
      SELECT
        id,
        page_id,
        parent_block_id,
        type,
        sort_key,
        text,
        props_json,
        created_at,
        updated_at
      FROM blocks
      WHERE id = ?
      `
    )
    .get(blockId) as BlockRow | null;

  if (!row) {
    throw new Error(`block not found: ${blockId}`);
  }

  return mapBlock(row);
}
