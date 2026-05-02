import type { Page, PageDocument } from "@/shared/contracts";

declare global {
  interface Window {
    __noteE2E: {
      getDocument: (pageId: string) => PageDocument;
      getPages: () => Page[];
      reset: () => void;
    };
  }
}

export {};
