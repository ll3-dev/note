import { blockOperations } from "@/bun/schema";
import type { DatabaseHandle } from "@/bun/database";

export function recordOperation(
  handle: DatabaseHandle,
  entityType: string,
  entityId: string,
  opType: string,
  payload: unknown
) {
  handle.orm
    .insert(blockOperations)
    .values({
      id: crypto.randomUUID(),
      entity_type: entityType,
      entity_id: entityId,
      op_type: opType,
      payload_json: JSON.stringify(payload)
    })
    .run();
}
