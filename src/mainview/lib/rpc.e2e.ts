import type {
  Block,
  BlockProps,
  BlockType,
  CreateBlockInput,
  CreatePageInput,
  DeleteBlockInput,
  GetPageDocumentInput,
  MoveBlockInput,
  MovePageInput,
  Page,
  PageDocument,
  PageHistoryInput,
  UpdateBlockInput,
  UpdatePageInput
} from "@/shared/contracts";

let idCounter = 0;

const state: {
  documents: Map<string, PageDocument>;
  history: Map<string, { redo: Block[][]; undo: Block[][] }>;
  pages: Page[];
} = {
  documents: new Map(),
  history: new Map(),
  pages: []
};

resetState();

export const noteApi = {
  async createBlock(input: CreateBlockInput) {
    const document = getDocument(input.pageId);
    recordDocumentHistory(document);
    const block = makeBlock({
      pageId: input.pageId,
      props: input.props ?? {},
      text: input.text ?? "",
      type: input.type ?? "paragraph"
    });
    const afterIndex = input.afterBlockId
      ? document.blocks.findIndex((item) => item.id === input.afterBlockId)
      : -1;

    document.blocks.splice(afterIndex + 1, 0, block);
    normalizeBlockSortKeys(document);
    touchPage(document.page);

    return block;
  },

  async createBlocks(input: { blocks: CreateBlockInput[] }) {
    const firstInput = input.blocks[0];

    if (!firstInput) {
      return [];
    }

    const document = getDocument(firstInput.pageId);
    const createdBlocks: Block[] = [];
    let afterBlockId = firstInput.afterBlockId ?? null;

    recordDocumentHistory(document);

    for (const blockInput of input.blocks) {
      if (blockInput.pageId !== firstInput.pageId) {
        throw new Error("batch block creation must target one page");
      }

      const block = makeBlock({
        pageId: blockInput.pageId,
        props: blockInput.props ?? {},
        text: blockInput.text ?? "",
        type: blockInput.type ?? "paragraph"
      });
      const afterIndex = afterBlockId
        ? document.blocks.findIndex((item) => item.id === afterBlockId)
        : -1;

      document.blocks.splice(afterIndex + 1, 0, block);
      afterBlockId = block.id;
      createdBlocks.push(block);
    }

    normalizeBlockSortKeys(document);
    touchPage(document.page);

    return cloneBlocks(createdBlocks);
  },

  async createPage(input: CreatePageInput) {
    const page = makePage(input.title, input.parentPageId ?? null);
    const block = makeBlock({ pageId: page.id });
    const document = { blocks: [block], page };

    state.pages.push(page);
    state.documents.set(page.id, document);

    return cloneDocument(document);
  },

  async deleteBlock(input: DeleteBlockInput) {
    for (const document of state.documents.values()) {
      const index = document.blocks.findIndex((block) => block.id === input.blockId);

      if (index !== -1) {
        recordDocumentHistory(document);
        document.blocks.splice(index, 1);
        normalizeBlockSortKeys(document);
        touchPage(document.page);
        break;
      }
    }

    return { deleted: true as const };
  },

  async deleteBlocks(input: {
    blockIds: string[];
    fallbackBlock?: {
      pageId: string;
      props?: BlockProps;
      text?: string;
      type?: BlockType;
    };
  }) {
    const document = [...state.documents.values()].find((item) =>
      item.blocks.some((block) => block.id === input.blockIds[0])
    );

    if (!document) {
      throw new Error(`block not found: ${input.blockIds[0]}`);
    }

    recordDocumentHistory(document);
    const blockIds = new Set(input.blockIds);
    document.blocks = document.blocks.filter((block) => !blockIds.has(block.id));
    let createdBlock: Block | undefined;

    if (input.fallbackBlock) {
      createdBlock = makeBlock({
        pageId: input.fallbackBlock.pageId,
        props: input.fallbackBlock.props ?? {},
        text: input.fallbackBlock.text ?? "",
        type: input.fallbackBlock.type ?? "paragraph"
      });
      document.blocks.push(createdBlock);
    }

    normalizeBlockSortKeys(document);
    touchPage(document.page);

    return createdBlock
      ? { createdBlock: cloneBlocks([createdBlock])[0], deleted: true as const }
      : { deleted: true as const };
  },

  async getDatabaseStatus() {
    return {
      blocksCount: [...state.documents.values()].reduce(
        (sum, document) => sum + document.blocks.length,
        0
      ),
      pagesCount: state.pages.length,
      sqliteVersion: "e2e"
    };
  },

  async getPageDocument(input: GetPageDocumentInput) {
    return cloneDocument(getDocument(input.pageId));
  },

  async listPages() {
    return state.pages.map((page) => ({ ...page }));
  },

  async searchPages(input: { query: string; limit?: number }) {
    const query = input.query.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return state.pages
      .filter((page) => page.title.toLowerCase().includes(query))
      .slice(0, input.limit ?? 8)
      .map((page) => ({ pageId: page.id, title: page.title }));
  },

  async listBacklinks(input: { pageId: string }) {
    return [...state.documents.values()].flatMap((document) =>
      document.blocks.flatMap((block) =>
        block.type === "page_link" &&
        block.pageId !== input.pageId &&
        block.props.targetPageId === input.pageId
          ? [
              {
                blockId: block.id,
                pageId: block.pageId,
                pageTitle: document.page.title,
                text: block.text
              }
            ]
          : []
      )
    );
  },

  async searchWorkspace(input: { query: string; limit?: number }) {
    const query = input.query.trim().toLowerCase();
    const limit = input.limit ?? 12;

    if (!query) {
      return [];
    }

    const pageResults = state.pages
      .filter((page) => page.title.toLowerCase().includes(query))
      .map((page) => ({ kind: "page" as const, pageId: page.id, title: page.title }));
    const blockResults = [...state.documents.values()].flatMap((document) =>
      document.blocks
        .filter((block) => block.text.toLowerCase().includes(query))
        .map((block) => ({
          blockId: block.id,
          kind: "block" as const,
          pageId: block.pageId,
          pageTitle: document.page.title,
          text: block.text
        }))
    );

    return [...pageResults, ...blockResults].slice(0, limit);
  },

  async moveBlock(input: MoveBlockInput) {
    const document = [...state.documents.values()].find((item) =>
      item.blocks.some((block) => block.id === input.blockId)
    );

    if (!document) {
      throw new Error(`block not found: ${input.blockId}`);
    }

    recordDocumentHistory(document);
    const movingIndex = document.blocks.findIndex((block) => block.id === input.blockId);
    const [block] = document.blocks.splice(movingIndex, 1);
    const afterIndex = input.afterBlockId
      ? document.blocks.findIndex((item) => item.id === input.afterBlockId)
      : -1;

    document.blocks.splice(afterIndex + 1, 0, block);
    normalizeBlockSortKeys(document);
    touchPage(document.page);

    return { ...block };
  },

  async movePage(input: MovePageInput) {
    const page = state.pages.find((item) => item.id === input.pageId);

    if (!page) {
      throw new Error(`page not found: ${input.pageId}`);
    }

    page.parentPageId = input.parentPageId ?? null;
    page.updatedAt = now();

    return { ...page };
  },

  async redoPageHistory(input: PageHistoryInput) {
    return restoreDocumentSnapshot(input.pageId, "redo");
  },

  async undoPageHistory(input: PageHistoryInput) {
    return restoreDocumentSnapshot(input.pageId, "undo");
  },

  async updateBlock(input: UpdateBlockInput) {
    const { block, document } = findBlock(input.blockId);
    recordDocumentHistory(document);

    if (input.type !== undefined) {
      block.type = input.type;
    }
    if (input.text !== undefined) {
      block.text = input.text;
    }
    if (input.props !== undefined) {
      block.props = input.props;
    }
    block.updatedAt = now();

    return { ...block, props: { ...block.props } };
  },

  async updatePage(input: UpdatePageInput) {
    const page = state.pages.find((item) => item.id === input.pageId);

    if (!page) {
      throw new Error(`page not found: ${input.pageId}`);
    }

    if (input.title !== undefined) {
      page.title = input.title;
    }
    page.updatedAt = now();

    return { ...page };
  }
};

Object.assign(window, {
  __noteE2E: {
    getDocument: (pageId: string) => cloneDocument(getDocument(pageId)),
    reset: resetState
  }
});

function resetState() {
  idCounter = 0;
  state.documents.clear();
  state.history.clear();
  state.pages = [];

  const page = makePage("", null);
  const block = makeBlock({ pageId: page.id });

  state.pages.push(page);
  state.documents.set(page.id, { blocks: [block], page });
}

function getDocument(pageId: string) {
  const document = state.documents.get(pageId);

  if (!document) {
    throw new Error(`page not found: ${pageId}`);
  }

  return document;
}

function findBlock(blockId: string) {
  for (const document of state.documents.values()) {
    const block = document.blocks.find((item) => item.id === blockId);

    if (block) {
      return { block, document };
    }
  }

  throw new Error(`block not found: ${blockId}`);
}

function cloneDocument(document: PageDocument): PageDocument {
  return {
    blocks: cloneBlocks(document.blocks),
    page: { ...document.page }
  };
}

function cloneBlocks(blocks: Block[]) {
  return blocks.map((block) => ({
    ...block,
    props: { ...block.props }
  }));
}

function getPageHistory(pageId: string) {
  let history = state.history.get(pageId);

  if (!history) {
    history = { redo: [], undo: [] };
    state.history.set(pageId, history);
  }

  return history;
}

function recordDocumentHistory(document: PageDocument) {
  const history = getPageHistory(document.page.id);
  history.undo.push(cloneBlocks(document.blocks));
  history.redo = [];
}

function restoreDocumentSnapshot(pageId: string, direction: "redo" | "undo") {
  const document = getDocument(pageId);
  const history = getPageHistory(pageId);
  const source = direction === "undo" ? history.undo : history.redo;
  const target = direction === "undo" ? history.redo : history.undo;
  const snapshot = source.pop();

  if (!snapshot) {
    return null;
  }

  target.push(cloneBlocks(document.blocks));
  document.blocks = cloneBlocks(snapshot);
  normalizeBlockSortKeys(document);
  touchPage(document.page);

  return cloneDocument(document);
}

function makePage(title: string, parentPageId: string | null): Page {
  const timestamp = now();

  return {
    archivedAt: null,
    cover: null,
    createdAt: timestamp,
    icon: null,
    id: nextId("page"),
    parentPageId,
    sortKey: String(state.pages.length).padStart(8, "0"),
    title,
    updatedAt: timestamp
  };
}

function makeBlock(
  input: {
    pageId: string;
    props?: BlockProps;
    text?: string;
    type?: BlockType;
  }
): Block {
  const timestamp = now();

  return {
    createdAt: timestamp,
    id: nextId("block"),
    pageId: input.pageId,
    parentBlockId: null,
    props: input.props ?? {},
    sortKey: "00000000",
    text: input.text ?? "",
    type: input.type ?? "paragraph",
    updatedAt: timestamp
  };
}

function normalizeBlockSortKeys(document: PageDocument) {
  document.blocks.forEach((block, index) => {
    block.sortKey = String(index).padStart(8, "0");
  });
}

function touchPage(page: Page) {
  page.updatedAt = now();
}

function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function now() {
  return new Date().toISOString();
}
