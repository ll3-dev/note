import { and, eq, isNull, ne } from "drizzle-orm";
import type { DatabaseHandle } from "@/bun/database";
import { blocks, pages } from "@/bun/schema";
import { buildFtsQuery } from "./searchIndexRepository";
import type {
  Backlink,
  BlockProps,
  ListBacklinksInput,
  PageSearchResult,
  SearchPagesInput,
  SearchWorkspaceInput,
  SearchWorkspaceResult
} from "@/shared/contracts";
import { getConnectedPageIdsFromProps } from "@/shared/pageConnections";

export function searchPages(
  handle: DatabaseHandle,
  input: SearchPagesInput
): PageSearchResult[] {
  const query = input.query.trim();
  const limit = Math.max(1, Math.min(input.limit ?? 8, 20));

  if (!query) {
    return [];
  }

  const ftsQuery = buildFtsQuery(query);

  if (!ftsQuery) {
    return [];
  }

  return handle.db
    .query<PageSearchResult, [string, string, number]>(`
      SELECT pages.id AS pageId, pages.title AS title
      FROM pages_fts
      INNER JOIN pages ON pages.id = pages_fts.page_id
      WHERE pages.archived_at IS NULL
        AND pages_fts MATCH ?
      ORDER BY
        CASE WHEN pages.title = ? THEN 0 ELSE 1 END,
        bm25(pages_fts),
        pages.title
      LIMIT ?
    `)
    .all(ftsQuery, query, limit);
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
        isNull(pages.archived_at)
      )
    )
    .orderBy(pages.title, blocks.sort_key)
    .all();

  return rows.flatMap((row) => {
    const props = parseProps(row.propsJson);

    return getConnectedPageIdsFromProps(props).includes(input.pageId)
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

  const ftsQuery = buildFtsQuery(query);
  const blockResults: SearchWorkspaceResult[] = ftsQuery
    ? handle.db
        .query<
          {
            blockId: string;
            pageId: string;
            pageTitle: string;
            text: string;
          },
          [string, number]
        >(`
          SELECT
            blocks.id AS blockId,
            blocks.page_id AS pageId,
            pages.title AS pageTitle,
            blocks.text AS text
          FROM blocks_fts
          INNER JOIN blocks ON blocks.id = blocks_fts.block_id
          INNER JOIN pages ON pages.id = blocks.page_id
          WHERE pages.archived_at IS NULL
            AND blocks_fts MATCH ?
          ORDER BY bm25(blocks_fts), pages.title, blocks.sort_key
          LIMIT ?
        `)
        .all(ftsQuery, limit)
        .map((row) => ({ kind: "block", ...row }))
    : [];

  return [...pageResults, ...blockResults].slice(0, limit);
}

function parseProps(value: string): BlockProps {
  try {
    const parsed = JSON.parse(value);

    return parsed && typeof parsed === "object" ? (parsed as BlockProps) : {};
  } catch {
    return {};
  }
}
