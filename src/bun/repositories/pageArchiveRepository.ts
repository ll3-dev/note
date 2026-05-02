import { eq, sql } from "drizzle-orm";
import type { DatabaseHandle } from "@/bun/database";
import { pages } from "@/bun/schema";
import { deletePageFromSearchIndex } from "./searchIndexRepository";
import type { DeletePageInput } from "@/shared/contracts";

export function deletePage(
  handle: DatabaseHandle,
  input: DeletePageInput
): { deleted: true } {
  archivePagesWithDescendants(handle, [input.pageId]);

  return { deleted: true };
}

export function archivePagesWithDescendants(
  handle: DatabaseHandle,
  pageIds: string[]
) {
  const pageIdsToArchive = collectPageIdsWithDescendants(handle, pageIds);

  for (const pageId of pageIdsToArchive) {
    handle.orm
      .update(pages)
      .set({
        archived_at: sql`CURRENT_TIMESTAMP`,
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(pages.id, pageId))
      .run();
    deletePageFromSearchIndex(handle, pageId);
  }
}

function collectPageIdsWithDescendants(
  handle: DatabaseHandle,
  pageIds: string[]
) {
  const seen = new Set<string>();
  const pending = [...new Set(pageIds.filter(Boolean))];

  while (pending.length > 0) {
    const pageId = pending.pop();

    if (!pageId || seen.has(pageId)) {
      continue;
    }

    seen.add(pageId);

    const children = handle.orm
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.parent_page_id, pageId))
      .all();

    for (const child of children) {
      pending.push(child.id);
    }
  }

  return [...seen];
}
