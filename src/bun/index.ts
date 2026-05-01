import { ApplicationMenu, BrowserView, BrowserWindow, Utils } from "electrobun/bun";
import type { NoteRPC } from "@/shared/contracts";
import { getDatabaseStatus, openDatabase } from "./database";
import { resolveMainviewUrl } from "./mainviewUrl";
import {
  createBlock,
  createBlocks,
  createPage,
  deleteBlock,
  deleteBlocks,
  getPageDocument,
  listBacklinks,
  listPages,
  moveBlock,
  movePage,
  redoPageHistory,
  searchPages,
  searchWorkspace,
  undoPageHistory,
  updateBlock,
  updatePage,
} from "./notes";
import {
  validateCreateBlockInput,
  validateCreateBlocksInput,
  validateCreatePageInput,
  validateDeleteBlockInput,
  validateDeleteBlocksInput,
  validateGetPageDocumentInput,
  validateMoveBlockInput,
  validateMovePageInput,
  validatePageHistoryInput,
  validateListBacklinksInput,
  validateSearchPagesInput,
  validateSearchWorkspaceInput,
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
      searchPages: (input) => searchPages(databaseHandle, validateSearchPagesInput(input)),
      listBacklinks: (input) => listBacklinks(databaseHandle, validateListBacklinksInput(input)),
      searchWorkspace: (input) => searchWorkspace(databaseHandle, validateSearchWorkspaceInput(input)),
      getPageDocument: (input) => getPageDocument(databaseHandle, validateGetPageDocumentInput(input)),
      createPage: (input) => createPage(databaseHandle, validateCreatePageInput(input)),
      updatePage: (input) => updatePage(databaseHandle, validateUpdatePageInput(input)),
      createBlock: (input) => createBlock(databaseHandle, validateCreateBlockInput(input)),
      createBlocks: (input) => createBlocks(databaseHandle, validateCreateBlocksInput(input)),
      updateBlock: (input) => updateBlock(databaseHandle, validateUpdateBlockInput(input)),
      deleteBlock: (input) => deleteBlock(databaseHandle, validateDeleteBlockInput(input)),
      deleteBlocks: (input) => deleteBlocks(databaseHandle, validateDeleteBlocksInput(input)),
      moveBlock: (input) => moveBlock(databaseHandle, validateMoveBlockInput(input)),
      movePage: (input) => movePage(databaseHandle, validateMovePageInput(input)),
      redoPageHistory: (input) => redoPageHistory(databaseHandle, validatePageHistoryInput(input)),
      undoPageHistory: (input) => undoPageHistory(databaseHandle, validatePageHistoryInput(input)),
    },
    messages: {},
  },
});

const mainviewUrl = resolveMainviewUrl();

const mainWindow = new BrowserWindow({
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

ApplicationMenu.setApplicationMenu([
  {
    label: "Edit",
    submenu: [
      {
        accelerator: "CommandOrControl+Z",
        action: "note.undo",
        label: "Undo"
      },
      {
        accelerator: "CommandOrControl+Shift+Z",
        action: "note.redo",
        label: "Redo"
      },
      { type: "divider" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" }
    ]
  }
]);

ApplicationMenu.on("application-menu-clicked", (event) => {
  const action = (event as { data?: { action?: string } }).data?.action;

  if (action !== "note.undo" && action !== "note.redo") {
    return;
  }

  mainWindow.webview.executeJavascript(
    `window.dispatchEvent(new CustomEvent("note-history-command", { detail: ${JSON.stringify(
      action === "note.undo" ? "undo" : "redo"
    )} }))`
  );
});
