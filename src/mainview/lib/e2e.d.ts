import type { PageDocument } from "@/shared/contracts";

declare global {
  interface Window {
    __noteE2E: {
      getDocument: (pageId: string) => PageDocument;
      reset: () => void;
    };
  }
}

export {};
