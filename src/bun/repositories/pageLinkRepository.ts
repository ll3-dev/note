import { and, eq, isNull, like, ne, sql } from "drizzle-orm";
import type { DatabaseHandle } from "@/bun/database";
import { blocks, pages } from "@/bun/schema";
import type {
  Backlink,
  ListBacklinksInput,
  PageSearchResult,
  SearchPagesInput,
  SearchWorkspaceInput,
  SearchWorkspaceResult
} from "@/shared/contracts";

export function searchPages(
  handle: DatabaseHandle,
  input: SearchPagesInput
): PageSearchResult[] {
  const query = input.query.trim();
  const limit = Math.max(1, Math.min(input.limit ?? 8, 20));

  if (!query) {
    return [];
  }

  return handle.orm
    .select({
      pageId: pages.id,
      title: pages.title
    })
    .from(pages)
    .where(and(isNull(pages.archived_at), like(pages.title, `%${escapeLike(query)}%`)))
    .orderBy(sql`CASE WHEN ${pages.title} = ${query} THEN 0 ELSE 1 END`, pages.title)
    .limit(limit)
    .all();
}

export function listBacklinks(
  handle: DatabaseHandle,
  input: ListBacklinksInput
): Backlink[] {
  const rows = handle.orm
    .select({
      blockId: blocks.id,
      pageId: blocks.page_id,
      pageTitle: pages.title,
      propsJson: blocks.props_json,
      text: blocks.text
    })
    .from(blocks)
    .innerJoin(pages, eq(pages.id, blocks.page_id))
    .where(
      and(
        ne(blocks.page_id, input.pageId),
        eq(blocks.type, "page_link"),
        isNull(pages.archived_at)
      )
    )
    .orderBy(pages.title, blocks.sort_key)
    .all();

  return rows.flatMap((row) => {
    const props = parseProps(row.propsJson);

    return props.targetPageId === input.pageId
      ? [
          {
            blockId: row.blockId,
            pageId: row.pageId,
            pageTitle: row.pageTitle,
            text: row.text
          }
        ]
      : [];
  });
}

export function searchWorkspace(
  handle: DatabaseHandle,
  input: SearchWorkspaceInput
): SearchWorkspaceResult[] {
  const query = input.query.trim();
  const limit = Math.max(1, Math.min(input.limit ?? 12, 30));

  if (!query) {
    return [];
  }

  const pageResults: SearchWorkspaceResult[] = searchPages(handle, {
    query,
    limit
  }).map((page) => ({
    kind: "page",
    pageId: page.pageId,
    title: page.title
  }));

  const blockResults: SearchWorkspaceResult[] = handle.orm
    .select({
      blockId: blocks.id,
      pageId: blocks.page_id,
      pageTitle: pages.title,
      text: blocks.text
    })
    .from(blocks)
    .innerJoin(pages, eq(pages.id, blocks.page_id))
    .where(and(isNull(pages.archived_at), like(blocks.text, `%${escapeLike(query)}%`)))
    .orderBy(pages.title, blocks.sort_key)
    .limit(limit)
    .all()
    .map((row) => ({ kind: "block", ...row }));

  return [...pageResults, ...blockResults].slice(0, limit);
}

function parseProps(value: string) {
  try {
    const parsed = JSON.parse(value) as { targetPageId?: unknown };

    return typeof parsed.targetPageId === "string"
      ? { targetPageId: parsed.targetPageId }
      : {};
  } catch {
    return {};
  }
}

function escapeLike(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}
