import { desc, eq, isNull, sql } from "drizzle-orm";
import { runInTransaction, type DatabaseHandle } from "../database";
import { pages } from "../schema";
import { DEFAULT_BLOCK_TYPE, insertBlock } from "./blockRepository";
import { listBlocksForPage } from "./blockReadRepository";
import { makeSortKey } from "./blockOrdering";
import { mapPage } from "./noteRows";
import type {
  CreatePageInput,
  Page,
  PageDocument
} from "../../shared/contracts";

export function listPages(handle: DatabaseHandle): Page[] {
  const rows = handle.orm
    .select()
    .from(pages)
    .where(isNull(pages.archived_at))
    .orderBy(desc(pages.updated_at), desc(sql`rowid`))
    .all();

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

  runInTransaction(handle, () => {
    handle.orm
      .insert(pages)
      .values({
        id: pageId,
        parent_page_id: input.parentPageId ?? null,
        title
      })
      .run();

    insertBlock(handle, {
      pageId,
      parentBlockId: null,
      type: DEFAULT_BLOCK_TYPE,
      text: "",
      props: {},
      sortKey: makeSortKey(0)
    });
  });

  return {
    page: getPage(handle, pageId),
    blocks: listBlocksForPage(handle, pageId)
  };
}

export function getPage(handle: DatabaseHandle, pageId: string): Page {
  const row = handle.orm
    .select()
    .from(pages)
    .where(eq(pages.id, pageId))
    .get();

  if (!row) {
    throw new Error(`page not found: ${pageId}`);
  }

  return mapPage(row);
}
