import type { DatabaseHandle } from "../database";

export function recordOperation(
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
