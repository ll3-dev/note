import { eq } from "drizzle-orm";
import { createAutomergePageDocument, toPageDocument } from "@/shared/automerge/pageDocument";
import type { AutomergeChangeOrigin } from "@/shared/automerge/pageDocument";
import type { PageDocument, PageHistoryInput } from "@/shared/contracts";
import type { DatabaseHandle } from "@/bun/database";
import { pages } from "@/bun/schema";
import { listBlocksForPage } from "@/bun/repositories/blockReadRepository";
import { mapPage } from "@/bun/repositories/noteRows";
import { applySelectivePageHistory } from "./pageHistoryPatch";
import {
  discardRedoEntries,
  getRedoEntry,
  getUndoEntry,
  LOCAL_ACTOR_ID,
  markEntryRedone,
  markEntryUndone,
  persistPageHistoryEntry
} from "./pageHistoryStore";

type PageHistoryCaptureOptions = {
  actorId?: string;
  origin?: AutomergeChangeOrigin;
};

type PendingCapture = {
  actorId: string;
  before: PageDocument;
  origin: AutomergeChangeOrigin;
};

const pendingCaptures = new Map<string, PendingCapture>();

export function capturePageHistoryBeforeChange(
  handle: DatabaseHandle,
  pageId: string,
  options: PageHistoryCaptureOptions = {}
) {
  if (pendingCaptures.has(pageId)) {
    return;
  }

  pendingCaptures.set(pageId, {
    actorId: options.actorId ?? LOCAL_ACTOR_ID,
    before: getPageDocumentSnapshot(handle, pageId),
    origin: options.origin ?? "local"
  });
}

export function syncPageHistoryAfterChange(
  handle: DatabaseHandle,
  pageId: string,
  options: PageHistoryCaptureOptions = {}
) {
  const pending = pendingCaptures.get(pageId);

  if (!pending) {
    return;
  }

  pendingCaptures.delete(pageId);
  const before = pending.before;
  const after = getPageDocumentSnapshot(handle, pageId);

  if (isSamePageDocument(before, after)) {
    return;
  }

  const actorId = options.actorId ?? pending.actorId;
  const origin = options.origin ?? pending.origin;

  if (origin === "local" && actorId === LOCAL_ACTOR_ID) {
    discardRedoEntries(handle, pageId);
  }

  persistPageHistoryEntry(handle, { actorId, after, before, origin, pageId });
}

export function undoPageHistory(
  handle: DatabaseHandle,
  input: PageHistoryInput
): PageDocument | null {
  const entry = getUndoEntry(handle, input.pageId);

  if (!entry) {
    return null;
  }

  applySelectivePageHistory(handle, entry.before, entry.after, "undo");
  markEntryUndone(handle, entry.id);
  return getPageDocumentSnapshot(handle, input.pageId);
}

export function redoPageHistory(
  handle: DatabaseHandle,
  input: PageHistoryInput
): PageDocument | null {
  const entry = getRedoEntry(handle, input.pageId);

  if (!entry) {
    return null;
  }

  applySelectivePageHistory(handle, entry.before, entry.after, "redo");
  markEntryRedone(handle, entry.id);
  return getPageDocumentSnapshot(handle, input.pageId);
}

export function clearPageHistoryMemoryForTests() {
  pendingCaptures.clear();
}

function encodeDocument(document: PageDocument) {
  return JSON.stringify(toPageDocument(createAutomergePageDocument(document)));
}

function isSamePageDocument(left: PageDocument, right: PageDocument) {
  return encodeDocument(left) === encodeDocument(right);
}

function getPageDocumentSnapshot(
  handle: DatabaseHandle,
  pageId: string
): PageDocument {
  const pageRow = handle.orm.select().from(pages).where(eq(pages.id, pageId)).get();

  if (!pageRow) {
    throw new Error(`page not found: ${pageId}`);
  }

  return {
    blocks: listBlocksForPage(handle, pageId),
    page: mapPage(pageRow)
  };
}
