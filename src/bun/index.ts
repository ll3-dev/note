import { BrowserView, BrowserWindow, Utils } from "electrobun/bun";
import type { NoteRPC } from "@/shared/contracts";
import { getDatabaseStatus, openDatabase } from "./database";
import { resolveMainviewUrl } from "./mainviewUrl";
import {
  createBlock,
  createPage,
  deleteBlock,
  getPageDocument,
  listPages,
  moveBlock,
  movePage,
  redoPageHistory,
  undoPageHistory,
  updateBlock,
  updatePage,
} from "./notes";
import {
  validateCreateBlockInput,
  validateCreatePageInput,
  validateDeleteBlockInput,
  validateGetPageDocumentInput,
  validateMoveBlockInput,
  validateMovePageInput,
  validatePageHistoryInput,
  validateUpdateBlockInput,
  validateUpdatePageInput
} from "./rpcValidation";

const databaseHandle = openDatabase(Utils.paths.userData);

const rpc = BrowserView.defineRPC<NoteRPC>({
  maxRequestTime: 5000,
  handlers: {
    requests: {
      getDatabaseStatus: () => getDatabaseStatus(databaseHandle),
      listPages: () => listPages(databaseHandle),
      getPageDocument: (input) => getPageDocument(databaseHandle, validateGetPageDocumentInput(input)),
      createPage: (input) => createPage(databaseHandle, validateCreatePageInput(input)),
      updatePage: (input) => updatePage(databaseHandle, validateUpdatePageInput(input)),
      createBlock: (input) => createBlock(databaseHandle, validateCreateBlockInput(input)),
      updateBlock: (input) => updateBlock(databaseHandle, validateUpdateBlockInput(input)),
      deleteBlock: (input) => deleteBlock(databaseHandle, validateDeleteBlockInput(input)),
      moveBlock: (input) => moveBlock(databaseHandle, validateMoveBlockInput(input)),
      movePage: (input) => movePage(databaseHandle, validateMovePageInput(input)),
      redoPageHistory: (input) => redoPageHistory(databaseHandle, validatePageHistoryInput(input)),
      undoPageHistory: (input) => undoPageHistory(databaseHandle, validatePageHistoryInput(input)),
    },
    messages: {},
  },
});

const mainviewUrl = resolveMainviewUrl();

new BrowserWindow({
  title: "Note",
  url: mainviewUrl,
  frame: {
    x: 80,
    y: 80,
    width: 1180,
    height: 760,
  },
  titleBarStyle: "hiddenInset",
  renderer: "native",
  rpc,
});
