import { describe, expect, test } from "bun:test";
import type { BlockProps, BlockType } from "@/shared/contracts";
import {
  getDraftSyncState,
  shouldAdoptIncomingServerDraft
} from "./blockDraftSyncMachine";

describe("block draft sync machine", () => {
  test("adopts incoming server text when local draft is clean", () => {
    const state = getDraftSyncState(
      server("block-1", "saved"),
      server("block-1", "remote"),
      { props: {}, text: "saved", type: "paragraph" }
    );

    expect(state).toBe("clean");
    expect(shouldAdoptIncomingServerDraft(state)).toBe(true);
  });

  test("keeps local draft when a stale save response arrives while dirty", () => {
    const state = getDraftSyncState(
      server("block-1", "saved"),
      server("block-1", "saving"),
      { props: {}, text: "still typing", type: "paragraph" }
    );

    expect(state).toBe("dirty");
    expect(shouldAdoptIncomingServerDraft(state)).toBe(false);
  });

  test("adopts incoming server snapshot once it catches up to the draft", () => {
    const state = getDraftSyncState(
      server("block-1", "saving"),
      server("block-1", "still typing"),
      { props: {}, text: "still typing", type: "paragraph" }
    );

    expect(state).toBe("server-caught-up");
    expect(shouldAdoptIncomingServerDraft(state)).toBe(true);
  });

  test("always adopts a different block", () => {
    const state = getDraftSyncState(
      server("block-1", "old"),
      server("block-2", "new"),
      { props: {}, text: "local draft", type: "paragraph" }
    );

    expect(state).toBe("block-changed");
    expect(shouldAdoptIncomingServerDraft(state)).toBe(true);
  });

  test("keeps local draft when a stale response has an older block type", () => {
    const state = getDraftSyncState(
      server("block-1", "", "paragraph", { icon: "💡" }),
      server("block-1", "typed", "paragraph", { icon: "💡" }),
      { props: { icon: "💡" }, text: "typed", type: "callout" }
    );

    expect(state).toBe("dirty");
    expect(shouldAdoptIncomingServerDraft(state)).toBe(false);
  });
});

function server(
  id: string,
  text: string,
  type: BlockType = "paragraph",
  props: BlockProps = {}
) {
  return { id, props, text, type };
}
