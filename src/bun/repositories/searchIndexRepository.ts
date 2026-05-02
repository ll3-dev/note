import type { DatabaseHandle } from "@/bun/database";
import type { Block, Page } from "@/shared/contracts";

export function indexPage(handle: DatabaseHandle, page: Page) {
  handle.db
    .query("DELETE FROM pages_fts WHERE page_id = ?")
    .run(page.id);
  handle.db
    .query("INSERT INTO pages_fts(page_id, title) VALUES (?, ?)")
    .run(page.id, page.title);
}

export function deletePageFromSearchIndex(
  handle: DatabaseHandle,
  pageId: string
) {
  handle.db
    .query("DELETE FROM pages_fts WHERE page_id = ?")
    .run(pageId);
}

export function indexBlock(handle: DatabaseHandle, block: Block) {
  handle.db
    .query("DELETE FROM blocks_fts WHERE block_id = ?")
    .run(block.id);

  if (!block.text.trim()) {
    return;
  }

  handle.db
    .query("INSERT INTO blocks_fts(block_id, page_id, text) VALUES (?, ?, ?)")
    .run(block.id, block.pageId, block.text);
}

export function deleteBlockFromSearchIndex(
  handle: DatabaseHandle,
  blockId: string
) {
  handle.db
    .query("DELETE FROM blocks_fts WHERE block_id = ?")
    .run(blockId);
}

export function buildFtsQuery(value: string) {
  const terms = value
    .trim()
    .split(/\s+/)
    .map((term) => term.replaceAll('"', '""'))
    .filter(Boolean);

  if (terms.length === 0) {
    return null;
  }

  return terms.map((term) => `"${term}"*`).join(" AND ");
}
