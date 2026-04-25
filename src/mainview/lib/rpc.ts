import { Electroview } from "electrobun/view";
import type { NoteRPC } from "../../shared/contracts";

const rpc = Electroview.defineRPC<NoteRPC>({
  handlers: {
    requests: {},
    messages: {}
  }
});

new Electroview({ rpc });

export const noteApi = rpc.requestProxy;
