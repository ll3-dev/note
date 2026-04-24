import { BrowserView, BrowserWindow, Utils } from "electrobun/bun";
import type { NoteRPC } from "../shared/contracts";
import { getDatabaseStatus, openDatabase } from "./database";
import { createPage } from "./notes";

const databaseHandle = openDatabase(Utils.paths.userData);

const rpc = BrowserView.defineRPC<NoteRPC>({
  maxRequestTime: 5000,
  handlers: {
    requests: {
      getDatabaseStatus: () => getDatabaseStatus(databaseHandle),
      createPage: (input) => createPage(databaseHandle, input)
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
