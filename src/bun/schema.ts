import type { InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const schemaMigrations = sqliteTable("schema_migrations", {
  version: integer("version").primaryKey(),
  name: text("name").notNull(),
  applied_at: text("applied_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const pages = sqliteTable("pages", {
  id: text("id").primaryKey(),
  parent_page_id: text("parent_page_id"),
  title: text("title").notNull().default(""),
  icon: text("icon"),
  cover: text("cover"),
  archived_at: text("archived_at"),
  created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const blocks = sqliteTable(
  "blocks",
  {
    id: text("id").primaryKey(),
    page_id: text("page_id").notNull(),
    parent_block_id: text("parent_block_id"),
    type: text("type").notNull(),
    sort_key: text("sort_key").notNull(),
    text: text("text").notNull().default(""),
    props_json: text("props_json").notNull().default("{}"),
    created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updated_at: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    index("idx_blocks_page_parent_sort").on(
      table.page_id,
      table.parent_block_id,
      table.sort_key
    )
  ]
);

export const blockOperations = sqliteTable(
  "block_operations",
  {
    id: text("id").primaryKey(),
    entity_type: text("entity_type").notNull(),
    entity_id: text("entity_id").notNull(),
    op_type: text("op_type").notNull(),
    payload_json: text("payload_json").notNull().default("{}"),
    created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    index("idx_block_operations_entity").on(
      table.entity_type,
      table.entity_id,
      table.created_at
    )
  ]
);

export const schema = {
  blockOperations,
  blocks,
  pages,
  schemaMigrations
};

export type PageRow = InferSelectModel<typeof pages>;
export type BlockRow = InferSelectModel<typeof blocks>;

export type BlockOperationRow = InferSelectModel<typeof blockOperations>;
export type SchemaMigrationRow = InferSelectModel<typeof schemaMigrations>;
