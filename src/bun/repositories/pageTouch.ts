import type { DatabaseHandle } from "../database";

export function touchPage(handle: DatabaseHandle, pageId: string) {
  handle.db
    .query("UPDATE pages SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(pageId);
}
