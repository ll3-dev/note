import { BrowserView, BrowserWindow, Utils } from "electrobun/bun";
import type { NoteRPC } from "../shared/contracts";
import { getDatabaseStatus, openDatabase } from "./database";
import {
  createBlock,
  createPage,
  deleteBlock,
  getPageDocument,
  listPages,
  updateBlock
} from "./notes";

const databaseHandle = openDatabase(Utils.paths.userData);

const rpc = BrowserView.defineRPC<NoteRPC>({
  maxRequestTime: 5000,
  handlers: {
    requests: {
      getDatabaseStatus: () => getDatabaseStatus(databaseHandle),
      listPages: () => listPages(databaseHandle),
      getPageDocument: (input) => getPageDocument(databaseHandle, input),
      createPage: (input) => createPage(databaseHandle, input),
      createBlock: (input) => createBlock(databaseHandle, input),
      updateBlock: (input) => updateBlock(databaseHandle, input),
      deleteBlock: (input) => deleteBlock(databaseHandle, input)
    },
    messages: {}
  }
});

new BrowserWindow({
  title: "Note",
  url: "views://mainview/index.html",
  frame: {
    x: 80,
    y: 80,
    width: 1180,
    height: 760
  },
  renderer: "native",
  rpc
});
