import type {
  BlockProps,
  BlockType,
  CreateBlockInput,
  CreatePageInput,
  DeleteBlockInput,
  GetPageDocumentInput,
  MoveBlockInput,
  MovePageInput,
  PageHistoryInput,
  UpdateBlockInput,
  UpdatePageInput
} from "../shared/contracts";

const BLOCK_TYPES = new Set<BlockType>([
  "paragraph",
  "heading_1",
  "heading_2",
  "todo",
  "bulleted_list",
  "numbered_list",
  "quote",
  "code",
  "divider",
  "image",
  "page_link"
]);

const MAX_ID_LENGTH = 128;
const MAX_TITLE_LENGTH = 200;
const MAX_BLOCK_TEXT_LENGTH = 100_000;
const MAX_BLOCK_PROPS_JSON_LENGTH = 20_000;

export function validateCreatePageInput(input: unknown): CreatePageInput {
  const record = asRecord(input);
  return {
    parentPageId: optionalId(record.parentPageId, "parentPageId"),
    title: stringValue(record.title, "title", MAX_TITLE_LENGTH)
  };
}

export function validateUpdatePageInput(input: unknown): UpdatePageInput {
  const record = asRecord(input);
  const output: UpdatePageInput = {
    pageId: idValue(record.pageId, "pageId")
  };

  if (record.title !== undefined) {
    output.title = stringValue(record.title, "title", MAX_TITLE_LENGTH);
  }

  return output;
}

export function validateGetPageDocumentInput(input: unknown): GetPageDocumentInput {
  const record = asRecord(input);
  return { pageId: idValue(record.pageId, "pageId") };
}

export function validateCreateBlockInput(input: unknown): CreateBlockInput {
  const record = asRecord(input);
  const output: CreateBlockInput = {
    afterBlockId: optionalId(record.afterBlockId, "afterBlockId"),
    pageId: idValue(record.pageId, "pageId"),
    parentBlockId: optionalId(record.parentBlockId, "parentBlockId")
  };

  if (record.type !== undefined) {
    output.type = blockTypeValue(record.type);
  }

  if (record.text !== undefined) {
    output.text = stringValue(record.text, "text", MAX_BLOCK_TEXT_LENGTH);
  }

  if (record.props !== undefined) {
    output.props = propsValue(record.props);
  }

  return output;
}

export function validateUpdateBlockInput(input: unknown): UpdateBlockInput {
  const record = asRecord(input);
  const output: UpdateBlockInput = {
    blockId: idValue(record.blockId, "blockId")
  };

  if (record.type !== undefined) {
    output.type = blockTypeValue(record.type);
  }

  if (record.text !== undefined) {
    output.text = stringValue(record.text, "text", MAX_BLOCK_TEXT_LENGTH);
  }

  if (record.props !== undefined) {
    output.props = propsValue(record.props);
  }

  return output;
}

export function validateDeleteBlockInput(input: unknown): DeleteBlockInput {
  const record = asRecord(input);
  return { blockId: idValue(record.blockId, "blockId") };
}

export function validateMoveBlockInput(input: unknown): MoveBlockInput {
  const record = asRecord(input);
  return {
    afterBlockId: optionalId(record.afterBlockId, "afterBlockId"),
    blockId: idValue(record.blockId, "blockId")
  };
}

export function validateMovePageInput(input: unknown): MovePageInput {
  const record = asRecord(input);
  return {
    afterPageId: optionalId(record.afterPageId, "afterPageId"),
    pageId: idValue(record.pageId, "pageId"),
    parentPageId: optionalId(record.parentPageId, "parentPageId")
  };
}

export function validatePageHistoryInput(input: unknown): PageHistoryInput {
  const record = asRecord(input);
  return { pageId: idValue(record.pageId, "pageId") };
}

function asRecord(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("RPC input must be an object");
  }

  return input as Record<string, unknown>;
}

function idValue(value: unknown, field: string) {
  const text = stringValue(value, field, MAX_ID_LENGTH);

  if (/[\u0000-\u001f\u007f]/.test(text)) {
    throw new Error(`${field} contains control characters`);
  }

  return text;
}

function optionalId(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return null;
  }

  return idValue(value, field);
}

function stringValue(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }

  if (value.length > maxLength) {
    throw new Error(`${field} is too long`);
  }

  return value;
}

function blockTypeValue(value: unknown) {
  if (typeof value !== "string" || !BLOCK_TYPES.has(value as BlockType)) {
    throw new Error("block type is invalid");
  }

  return value as BlockType;
}

function propsValue(value: unknown): BlockProps {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("props must be an object");
  }

  const json = JSON.stringify(value);

  if (json.length > MAX_BLOCK_PROPS_JSON_LENGTH) {
    throw new Error("props payload is too large");
  }

  return value as BlockProps;
}
