import Electrobun, {
  ApplicationMenu,
  BrowserView,
  BrowserWindow,
  Screen,
  Utils
} from "electrobun/bun";
import type { NoteRPC } from "@/shared/contracts";
import { createEngineClient } from "@/shared/engineClient";
import { startEngineProcess } from "./engine/engineProcess";
import { resolveMainviewUrl } from "./mainviewUrl";
import { getNavigationDirectionFromMouseButtons } from "./navigationMouseButtons";
import {
  validateCreateBlockInput,
  validateCreateBlocksInput,
  validateCreatePageInput,
  validateDeleteBlockInput,
  validateDeleteBlocksInput,
  validateDeletePageInput,
  validateGetPageDocumentInput,
  validateListBacklinksInput,
  validateMoveBlockInput,
  validateMoveBlocksInput,
  validateMovePageInput,
  validatePageHistoryInput,
  validateRestorePageInput,
  validateSearchPagesInput,
  validateSearchWorkspaceInput,
  validateUpdateBlockInput,
  validateUpdatePageInput
} from "./rpcValidation";

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

function createMainWindow(rpc: ReturnType<typeof BrowserView.defineRPC<NoteRPC>>) {
  return new BrowserWindow({
    title: "Note",
    url: resolveMainviewUrl(),
    frame: {
      x: 80,
      y: 80,
      width: 1180,
      height: 760
    },
    titleBarStyle: "hiddenInset",
    renderer: "native",
    rpc
  });
}

async function main() {
  const engineProcess = await startEngineProcess(Utils.paths.userData);
  const engineClient = createEngineClient(
    engineProcess.baseUrl,
    engineProcess.token
  );
  await engineClient.purgeExpiredArchivedPages();

  const rpc = BrowserView.defineRPC<NoteRPC>({
    maxRequestTime: 5000,
    handlers: {
      requests: {
        getDatabaseStatus: () => engineClient.getDatabaseStatus(),
        closeMainWindow: () => {
          const windowToClose = mainWindow;
          mainWindow = null;
          windowToClose?.close();
          return { closed: true };
        },
        listPages: () => engineClient.listPages(),
        listArchivedPages: () => engineClient.listArchivedPages(),
        searchPages: (input) =>
          engineClient.searchPages(validateSearchPagesInput(input)),
        listBacklinks: (input) =>
          engineClient.listBacklinks(validateListBacklinksInput(input)),
        searchWorkspace: (input) =>
          engineClient.searchWorkspace(validateSearchWorkspaceInput(input)),
        getPageDocument: (input) =>
          engineClient.getPageDocument(validateGetPageDocumentInput(input)),
        createPage: (input) =>
          engineClient.createPage(validateCreatePageInput(input)),
        updatePage: (input) =>
          engineClient.updatePage(validateUpdatePageInput(input)),
        deletePage: (input) =>
          engineClient.deletePage(validateDeletePageInput(input)),
        restorePage: (input) =>
          engineClient.restorePage(validateRestorePageInput(input)),
        purgeExpiredArchivedPages: () => engineClient.purgeExpiredArchivedPages(),
        createBlock: (input) =>
          engineClient.createBlock(validateCreateBlockInput(input)),
        createBlocks: (input) =>
          engineClient.createBlocks(validateCreateBlocksInput(input)),
        updateBlock: (input) =>
          engineClient.updateBlock(validateUpdateBlockInput(input)),
        deleteBlock: (input) =>
          engineClient.deleteBlock(validateDeleteBlockInput(input)),
        deleteBlocks: (input) =>
          engineClient.deleteBlocks(validateDeleteBlocksInput(input)),
        moveBlock: (input) =>
          engineClient.moveBlock(validateMoveBlockInput(input)),
        moveBlocks: (input) =>
          engineClient.moveBlocks(validateMoveBlocksInput(input)),
        movePage: (input) =>
          engineClient.movePage(validateMovePageInput(input)),
        redoPageHistory: (input) =>
          engineClient.redoPageHistory(validatePageHistoryInput(input)),
        undoPageHistory: (input) =>
          engineClient.undoPageHistory(validatePageHistoryInput(input))
      },
      messages: {}
    }
  });

  mainWindow = createMainWindow(rpc);

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
      mainWindow = createMainWindow(rpc);
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
      engineProcess.stop();
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

  process.on("exit", () => {
    engineProcess.stop();
  });
}

void main().catch((error) => {
  console.error(error);
  Utils.quit();
});
