import type { BlockRow, PageRow } from "../schema";
import type { Block, BlockProps, BlockType, Page } from "../../shared/contracts";

export function mapPage(row: PageRow): Page {
  return {
    id: row.id,
    parentPageId: row.parent_page_id,
    title: row.title,
    sortKey: row.sort_key,
    icon: row.icon,
    cover: row.cover,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapBlock(row: BlockRow): Block {
  return {
    id: row.id,
    pageId: row.page_id,
    parentBlockId: row.parent_block_id,
    type: row.type as BlockType,
    sortKey: row.sort_key,
    text: row.text,
    props: parseProps(row.props_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function parseProps(value: string): BlockProps {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return {};
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  return parsed as BlockProps;
}
