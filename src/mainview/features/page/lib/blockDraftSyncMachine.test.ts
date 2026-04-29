import { describe, expect, test } from "bun:test";
import {
  getDraftSyncState,
  shouldAdoptIncomingServerDraft
} from "./blockDraftSyncMachine";

describe("block draft sync machine", () => {
  test("adopts incoming server text when local draft is clean", () => {
    const state = getDraftSyncState(
      server("block-1", "saved"),
      server("block-1", "remote"),
      { props: {}, text: "saved" }
    );

    expect(state).toBe("clean");
    expect(shouldAdoptIncomingServerDraft(state)).toBe(true);
  });

  test("keeps local draft when a stale save response arrives while dirty", () => {
    const state = getDraftSyncState(
      server("block-1", "saved"),
      server("block-1", "saving"),
      { props: {}, text: "still typing" }
    );

    expect(state).toBe("dirty");
    expect(shouldAdoptIncomingServerDraft(state)).toBe(false);
  });

  test("adopts incoming server snapshot once it catches up to the draft", () => {
    const state = getDraftSyncState(
      server("block-1", "saving"),
      server("block-1", "still typing"),
      { props: {}, text: "still typing" }
    );

    expect(state).toBe("server-caught-up");
    expect(shouldAdoptIncomingServerDraft(state)).toBe(true);
  });

  test("always adopts a different block", () => {
    const state = getDraftSyncState(
      server("block-1", "old"),
      server("block-2", "new"),
      { props: {}, text: "local draft" }
    );

    expect(state).toBe("block-changed");
    expect(shouldAdoptIncomingServerDraft(state)).toBe(true);
  });
});

function server(id: string, text: string) {
  return { id, props: {}, text };
}
