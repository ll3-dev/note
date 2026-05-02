import type { Page, PageDocument } from "@/shared/contracts";

declare global {
  interface Window {
    __noteE2E: {
      getDocument: (pageId: string) => PageDocument;
      getArchivedPages: () => Page[];
      getPages: () => Page[];
      reset: () => void;
    };
  }
}

export {};
