import { Database } from "bun:sqlite";
import { count, sql } from "drizzle-orm";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { DatabaseStatus } from "../shared/contracts";
import { runMigrations } from "./migrations";
import { blocks, pages, schema } from "./schema";

export type DatabaseHandle = {
  db: Database;
  orm: BunSQLiteDatabase<typeof schema>;
  databasePath: string;
};

export function runInTransaction<T>(
  handle: DatabaseHandle,
  callback: () => T
): T {
  return handle.db.transaction(callback)();
}

export function openDatabase(userDataPath: string): DatabaseHandle {
  mkdirSync(userDataPath, { recursive: true });

  const databasePath = path.join(userDataPath, "note.sqlite3");
  const db = new Database(databasePath, { create: true });

  db.run("PRAGMA foreign_keys = ON");
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA busy_timeout = 5000");

  const orm = drizzle(db, { schema });

  runMigrations(orm);

  return {
    db,
    orm,
    databasePath
  };
}

export function getDatabaseStatus(handle: DatabaseHandle): DatabaseStatus {
  const sqliteVersion = handle.orm.get<[string]>(
    sql`SELECT sqlite_version() AS version`
  );
  const pagesCount = handle.orm.select({ count: count() }).from(pages).get();
  const blocksCount = handle.orm.select({ count: count() }).from(blocks).get();

  return {
    sqliteVersion: sqliteVersion![0],
    pagesCount: pagesCount!.count,
    blocksCount: blocksCount!.count,
    databasePath: handle.databasePath
  };
}
