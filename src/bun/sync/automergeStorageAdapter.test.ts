import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDatabase } from "../database";
import { SqliteAutomergeStorageAdapter } from "./automergeStorageAdapter";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe("SQLite Automerge storage adapter", () => {
  test("saves, loads, ranges, and removes repo chunks", async () => {
    const storage = new SqliteAutomergeStorageAdapter(openTempDatabase());
    const snapshot = new Uint8Array([1, 2, 3]);
    const incremental = new Uint8Array([4, 5, 6]);

    await storage.save(["doc-1", "snapshot", "a"], snapshot);
    await storage.save(["doc-1", "incremental", "b"], incremental);
    await storage.save(["doc-2", "snapshot", "c"], new Uint8Array([7]));

    expect(await storage.load(["doc-1", "snapshot", "a"])).toEqual(snapshot);

    const docChunks = await storage.loadRange(["doc-1"]);
    expect(docChunks.map((chunk) => chunk.key)).toEqual([
      ["doc-1", "incremental", "b"],
      ["doc-1", "snapshot", "a"]
    ]);

    await storage.removeRange(["doc-1"]);
    expect(await storage.load(["doc-1", "snapshot", "a"])).toBeUndefined();
    expect(await storage.load(["doc-2", "snapshot", "c"])).toEqual(
      new Uint8Array([7])
    );
  });
});

function openTempDatabase() {
  const root = mkdtempSync(path.join(tmpdir(), "note-automerge-test-"));
  tempRoots.push(root);
  return openDatabase(root);
}
