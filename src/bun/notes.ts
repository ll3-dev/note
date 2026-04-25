import type { DatabaseHandle } from "./database";
import type {
  Block,
  BlockProps,
  BlockType,
  CreateBlockInput,
  CreatePageInput,
  DeleteBlockInput,
  GetPageDocumentInput,
  Page,
  PageDocument,
  UpdateBlockInput
} from "../shared/contracts";

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

type BlockRow = {
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

const DEFAULT_BLOCK_TYPE = "paragraph" satisfies BlockType;

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

  return getPageDocument(handle, { pageId });
}

export function getPageDocument(
  handle: DatabaseHandle,
  input: GetPageDocumentInput
): PageDocument {
  return {
    page: getPage(handle, input.pageId),
    blocks: listBlocksForPage(handle, input.pageId)
  };
}

export function createBlock(
  handle: DatabaseHandle,
  input: CreateBlockInput
): Block {
  const pageId = input.pageId;
  const parentBlockId = input.parentBlockId ?? null;
  const sortKey = getNextSortKey(handle, pageId, parentBlockId, input.afterBlockId);

  const block = insertBlock(handle, {
    pageId,
    parentBlockId,
    type: input.type ?? DEFAULT_BLOCK_TYPE,
    text: input.text ?? "",
    props: input.props ?? {},
    sortKey
  });

  touchPage(handle, pageId);
  recordOperation(handle, "block", block.id, "create", block);

  return block;
}

export function updateBlock(
  handle: DatabaseHandle,
  input: UpdateBlockInput
): Block {
  const current = getBlock(handle, input.blockId);
  const nextType = input.type ?? current.type;
  const nextText = input.text ?? current.text;
  const nextProps = input.props ?? current.props;

  handle.db
    .query(
      `
      UPDATE blocks
      SET type = ?, text = ?, props_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `
    )
    .run(nextType, nextText, JSON.stringify(nextProps), input.blockId);

  touchPage(handle, current.pageId);

  const block = getBlock(handle, input.blockId);
  recordOperation(handle, "block", block.id, "update", {
    type: nextType,
    text: nextText,
    props: nextProps
  });

  return block;
}

export function deleteBlock(
  handle: DatabaseHandle,
  input: DeleteBlockInput
): { deleted: true } {
  const current = getBlock(handle, input.blockId);

  handle.db.query("DELETE FROM blocks WHERE id = ?").run(input.blockId);
  touchPage(handle, current.pageId);
  recordOperation(handle, "block", input.blockId, "delete", {});

  return { deleted: true };
}

function listBlocksForPage(handle: DatabaseHandle, pageId: string): Block[] {
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

function insertBlock(
  handle: DatabaseHandle,
  input: {
    pageId: string;
    parentBlockId: string | null;
    type: BlockType;
    text: string;
    props: BlockProps;
    sortKey: string;
  }
): Block {
  const blockId = crypto.randomUUID();

  handle.db
    .query(
      `
      INSERT INTO blocks (
        id,
        page_id,
        parent_block_id,
        type,
        sort_key,
        text,
        props_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      blockId,
      input.pageId,
      input.parentBlockId,
      input.type,
      input.sortKey,
      input.text,
      JSON.stringify(input.props)
    );

  return getBlock(handle, blockId);
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

  return mapPage(row);
}

function getBlock(handle: DatabaseHandle, blockId: string): Block {
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

function getNextSortKey(
  handle: DatabaseHandle,
  pageId: string,
  parentBlockId: string | null,
  afterBlockId?: string | null
): string {
  if (afterBlockId) {
    const afterBlock = getBlock(handle, afterBlockId);
    return makeSortKey(Number.parseInt(afterBlock.sortKey, 10) + 1);
  }

  const row = handle.db
    .query(
      `
      SELECT COUNT(*) AS count
      FROM blocks
      WHERE page_id = ?
        AND parent_block_id IS ?
      `
    )
    .get(pageId, parentBlockId) as { count: number };

  return makeSortKey(row.count);
}

function makeSortKey(index: number): string {
  return String(index).padStart(8, "0");
}

function touchPage(handle: DatabaseHandle, pageId: string) {
  handle.db
    .query("UPDATE pages SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(pageId);
}

function recordOperation(
  handle: DatabaseHandle,
  entityType: string,
  entityId: string,
  opType: string,
  payload: unknown
) {
  handle.db
    .query(
      `
      INSERT INTO block_operations (
        id,
        entity_type,
        entity_id,
        op_type,
        payload_json
      )
      VALUES (?, ?, ?, ?, ?)
      `
    )
    .run(
      crypto.randomUUID(),
      entityType,
      entityId,
      opType,
      JSON.stringify(payload)
    );
}

function mapPage(row: PageRow): Page {
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

function mapBlock(row: BlockRow): Block {
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
