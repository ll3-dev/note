import type { Block, BlockProps, BlockType, Page } from "../../shared/contracts";

export type PageRow = {
  id: string;
  parent_page_id: string | null;
  title: string;
  icon: string | null;
  cover: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlockRow = {
  id: string;
  page_id: string;
  parent_block_id: string | null;
  type: string;
  sort_key: string;
  text: string;
  props_json: string;
  created_at: string;
  updated_at: string;
};

export function mapPage(row: PageRow): Page {
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
  const parsed = JSON.parse(value) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  return parsed as BlockProps;
}
