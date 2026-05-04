import Electrobun, {
  ApplicationMenu,
  BrowserView,
  BrowserWindow,
  Screen,
  Utils
} from "electrobun/bun";
import type { NoteRPC } from "@/shared/contracts";
import { getDatabaseStatus, openDatabase } from "./database";
import { resolveMainviewUrl } from "./mainviewUrl";
import { getNavigationDirectionFromMouseButtons } from "./navigationMouseButtons";
import {
  createBlock,
  createBlocks,
  createPage,
  deleteBlock,
  deleteBlocks,
  deletePage,
  getPageDocument,
  listArchivedPages,
  listBacklinks,
  listPages,
  moveBlock,
  moveBlocks,
  movePage,
  purgeExpiredArchivedPages,
  redoPageHistory,
  restorePage,
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
  validateDeletePageInput,
  validateGetPageDocumentInput,
  validateMoveBlockInput,
  validateMoveBlocksInput,
  validateMovePageInput,
  validatePageHistoryInput,
  validateRestorePageInput,
  validateListBacklinksInput,
  validateSearchPagesInput,
  validateSearchWorkspaceInput,
  validateUpdateBlockInput,
  validateUpdatePageInput
} from "./rpcValidation";

const databaseHandle = openDatabase(Utils.paths.userData);
purgeExpiredArchivedPages(databaseHandle);
const mainviewUrl = resolveMainviewUrl();
let mainWindow: BrowserWindow | null = null;
let navigationMouseButtons = 0n;
const shouldLogNavigationMouseButtons =
  process.env["NOTE_DEBUG_MOUSE_BUTTONS"] === "1";

function dispatchMainviewEvent(name: string, detail: unknown) {
  mainWindow?.webview.executeJavascript(
    `window.dispatchEvent(new CustomEvent(${JSON.stringify(name)}, { detail: ${JSON.stringify(
      detail
    )} }))`
  );
}

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
      listArchivedPages: () => listArchivedPages(databaseHandle),
      searchPages: (input) => searchPages(databaseHandle, validateSearchPagesInput(input)),
      listBacklinks: (input) => listBacklinks(databaseHandle, validateListBacklinksInput(input)),
      searchWorkspace: (input) => searchWorkspace(databaseHandle, validateSearchWorkspaceInput(input)),
      getPageDocument: (input) => getPageDocument(databaseHandle, validateGetPageDocumentInput(input)),
      createPage: (input) => createPage(databaseHandle, validateCreatePageInput(input)),
      updatePage: (input) => updatePage(databaseHandle, validateUpdatePageInput(input)),
      deletePage: (input) => deletePage(databaseHandle, validateDeletePageInput(input)),
      restorePage: (input) => restorePage(databaseHandle, validateRestorePageInput(input)),
      purgeExpiredArchivedPages: () => purgeExpiredArchivedPages(databaseHandle),
      createBlock: (input) => createBlock(databaseHandle, validateCreateBlockInput(input)),
      createBlocks: (input) => createBlocks(databaseHandle, validateCreateBlocksInput(input)),
      updateBlock: (input) => updateBlock(databaseHandle, validateUpdateBlockInput(input)),
      deleteBlock: (input) => deleteBlock(databaseHandle, validateDeleteBlockInput(input)),
      deleteBlocks: (input) => deleteBlocks(databaseHandle, validateDeleteBlocksInput(input)),
      moveBlock: (input) => moveBlock(databaseHandle, validateMoveBlockInput(input)),
      moveBlocks: (input) => moveBlocks(databaseHandle, validateMoveBlocksInput(input)),
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

setInterval(() => {
  const currentButtons = Screen.getMouseButtons();
  const direction = getNavigationDirectionFromMouseButtons(
    navigationMouseButtons,
    currentButtons
  );

  if (
    shouldLogNavigationMouseButtons &&
    currentButtons !== navigationMouseButtons
  ) {
    console.info(`[navigation] mouse buttons: ${currentButtons.toString(2)}`);
  }

  navigationMouseButtons = currentButtons;

  if (!direction || !mainWindow) {
    return;
  }

  dispatchMainviewEvent("note-navigation-command", direction);
}, 16);

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
    label: "Navigate",
    submenu: [
      {
        accelerator: "CommandOrControl+Left",
        action: "note.navigateBack",
        label: "Back"
      },
      {
        accelerator: "CommandOrControl+Right",
        action: "note.navigateForward",
        label: "Forward"
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

  if (action === "note.navigateBack" || action === "note.navigateForward") {
    dispatchMainviewEvent(
      "note-navigation-command",
      action === "note.navigateBack" ? "back" : "forward"
    );
    return;
  }

  if (action !== "note.undo" && action !== "note.redo") {
    return;
  }

  dispatchMainviewEvent(
    "note-history-command",
    action === "note.undo" ? "undo" : "redo"
  );
});
