import type { DatabaseHandle } from "./database";
import type { CreatePageInput, Page } from "../shared/contracts";

type PageRow = {
  id: string;
  parent_page_id: string | null;
  title: string;
  icon: string | null;
  cover: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export function createPage(handle: DatabaseHandle, input: CreatePageInput): Page {
  const title = input.title.trim();

  if (!title) {
    throw new Error("page title must not be empty");
  }

  const pageId = crypto.randomUUID();

  handle.db
    .query(
      `
      INSERT INTO pages (id, parent_page_id, title)
      VALUES (?, ?, ?)
      `
    )
    .run(pageId, input.parentPageId ?? null, title);

  return getPage(handle, pageId);
}

function getPage(handle: DatabaseHandle, pageId: string): Page {
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

  return {
    id: row.id,
    parentPageId: row.parent_page_id,
    title: row.title,
    icon: row.icon,
    cover: row.cover,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
