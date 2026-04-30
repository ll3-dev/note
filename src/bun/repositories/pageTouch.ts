import { eq, sql } from "drizzle-orm";
import type { DatabaseHandle } from "@/bun/database";
import { pages } from "@/bun/schema";

export function touchPage(handle: DatabaseHandle, pageId: string) {
  handle.orm
    .update(pages)
    .set({ updated_at: sql`CURRENT_TIMESTAMP` })
    .where(eq(pages.id, pageId))
    .run();
}
