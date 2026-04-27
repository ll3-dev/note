import { eq, sql } from "drizzle-orm";
import type { DatabaseHandle } from "../database";
import { pages } from "../schema";

export function touchPage(handle: DatabaseHandle, pageId: string) {
  handle.orm
    .update(pages)
    .set({ updated_at: sql`CURRENT_TIMESTAMP` })
    .where(eq(pages.id, pageId))
    .run();
}
