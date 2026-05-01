import Electrobun, {
  ApplicationMenu,
  BrowserView,
  BrowserWindow,
  Utils
} from "electrobun/bun";
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
const mainviewUrl = resolveMainviewUrl();
let mainWindow: BrowserWindow | null = null;

const rpc = BrowserView.defineRPC<NoteRPC>({
  maxRequestTime: 5000,
  handlers: {
    requests: {
      getDatabaseStatus: () => getDatabaseStatus(databaseHandle),
      closeMainWindow: () => {
        const windowToClose = mainWindow;
        mainWindow = null;
        windowToClose?.close();
        return { closed: true };
      },
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

function createMainWindow() {
  return new BrowserWindow({
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
}

mainWindow = createMainWindow();

Electrobun.events.on("close", (event) => {
  const windowId = (event as { data?: { id?: number } }).data?.id;

  if (windowId === mainWindow?.id) {
    mainWindow = null;
  }
});

Electrobun.events.on("reopen", () => {
  if (!mainWindow) {
    mainWindow = createMainWindow();
  }
});

ApplicationMenu.setApplicationMenu([
  {
    label: "Note",
    submenu: [
      {
        accelerator: "CommandOrControl+Q",
        action: "note.quit",
        label: "Quit Note"
      }
    ]
  },
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

  if (action === "note.quit") {
    Utils.quit();
    return;
  }

  if (action !== "note.undo" && action !== "note.redo") {
    return;
  }

  mainWindow?.webview.executeJavascript(
    `window.dispatchEvent(new CustomEvent("note-history-command", { detail: ${JSON.stringify(
      action === "note.undo" ? "undo" : "redo"
    )} }))`
  );
});
