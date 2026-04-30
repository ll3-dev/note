import { asc, eq } from "drizzle-orm";
import type {
  Chunk,
  StorageAdapterInterface,
  StorageKey
} from "@automerge/automerge-repo";
import type { DatabaseHandle } from "@/bun/database";
import { automergeRepoChunks } from "@/bun/schema";

export class SqliteAutomergeStorageAdapter implements StorageAdapterInterface {
  constructor(private readonly handle: DatabaseHandle) {}

  async load(key: StorageKey): Promise<Uint8Array | undefined> {
    const row = this.handle.orm
      .select({ data: automergeRepoChunks.data })
      .from(automergeRepoChunks)
      .where(eq(automergeRepoChunks.storage_key, encodeStorageKey(key)))
      .get();

    return row?.data;
  }

  async save(key: StorageKey, data: Uint8Array): Promise<void> {
    this.handle.orm
      .insert(automergeRepoChunks)
      .values({
        data: Buffer.from(data),
        storage_key: encodeStorageKey(key)
      })
      .onConflictDoUpdate({
        set: {
          data: Buffer.from(data),
          updated_at: new Date().toISOString()
        },
        target: automergeRepoChunks.storage_key
      })
      .run();
  }

  async remove(key: StorageKey): Promise<void> {
    this.handle.orm
      .delete(automergeRepoChunks)
      .where(eq(automergeRepoChunks.storage_key, encodeStorageKey(key)))
      .run();
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    const rows = this.handle.orm
      .select({
        data: automergeRepoChunks.data,
        key: automergeRepoChunks.storage_key
      })
      .from(automergeRepoChunks)
      .orderBy(asc(automergeRepoChunks.storage_key))
      .all();

    return rows
      .map((row) => ({ data: row.data, key: decodeStorageKey(row.key) }))
      .filter((chunk) => hasStorageKeyPrefix(chunk.key, keyPrefix));
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
    const chunks = await this.loadRange(keyPrefix);

    for (const chunk of chunks) {
      await this.remove(chunk.key);
    }
  }
}

function encodeStorageKey(key: StorageKey) {
  return JSON.stringify(key);
}

function decodeStorageKey(value: string): StorageKey {
  const key = JSON.parse(value);

  if (!Array.isArray(key) || key.some((part) => typeof part !== "string")) {
    throw new Error(`invalid Automerge storage key: ${value}`);
  }

  return key;
}

function hasStorageKeyPrefix(key: StorageKey, prefix: StorageKey) {
  return prefix.every((part, index) => key[index] === part);
}
