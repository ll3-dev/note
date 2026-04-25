import type { DatabaseHandle } from "../database";
import { DEFAULT_BLOCK_TYPE, insertBlock } from "./blockRepository";
import { listBlocksForPage } from "./blockReadRepository";
import { makeSortKey } from "./blockOrdering";
import { mapPage, type PageRow } from "./noteRows";
import type {
  CreatePageInput,
  Page,
  PageDocument
} from "../../shared/contracts";

export function listPages(handle: DatabaseHandle): Page[] {
  const rows = handle.db
    .query(
      `
      SELECT
        id,
        parent_page_id,
        title,
        icon,
        cover,
        archived_at,
        created_at,
        updated_at
      FROM pages
      WHERE archived_at IS NULL
      ORDER BY updated_at DESC, rowid DESC
      `
    )
    .all() as PageRow[];

  return rows.map(mapPage);
}

export function createPage(
  handle: DatabaseHandle,
  input: CreatePageInput
): PageDocument {
  const title = input.title.trim();

  if (!title) {
    throw new Error("page title must not be empty");
  }

  const pageId = crypto.randomUUID();

  handle.db.transaction(() => {
    handle.db
      .query(
        `
        INSERT INTO pages (id, parent_page_id, title)
        VALUES (?, ?, ?)
        `
      )
      .run(pageId, input.parentPageId ?? null, title);

    insertBlock(handle, {
      pageId,
      parentBlockId: null,
      type: DEFAULT_BLOCK_TYPE,
      text: "",
      props: {},
      sortKey: makeSortKey(0)
    });
  })();

  return {
    page: getPage(handle, pageId),
    blocks: listBlocksForPage(handle, pageId)
  };
}

export function getPage(handle: DatabaseHandle, pageId: string): Page {
  const row = handle.db
    .query(
      `
      SELECT
        id,
        parent_page_id,
        title,
        icon,
        cover,
        archived_at,
        created_at,
        updated_at
      FROM pages
      WHERE id = ?
      `
    )
    .get(pageId) as PageRow | null;

  if (!row) {
    throw new Error(`page not found: ${pageId}`);
  }

  return mapPage(row);
}
