import type { Backlink>, Block, Block>, BridgeMoveBlockInput, BridgeMoveBlocksInput, CreateBlockInput, CreateBlocksInput, CreatePageInput, DatabaseStatus, DeleteBlockInput, DeleteBlockOutput, DeleteBlocksInput, DeleteBlocksOutput, DeletePageInput, DeletePageOutput, EmptyInput, EngineClient, EngineInfoOutput, GetPageDocumentInput, ListBacklinksInput, MovePageInput, Page, Page>, PageDocument, PageDocument>, PageHistoryInput, PageSearchResult>, PurgeExpiredArchivedPagesOutput, RestorePageInput, RestorePageOutput, RustraError, SearchPagesInput, SearchWorkspaceInput, SearchWorkspaceResult>, UpdateBlockInput, UpdatePageInput } from './types.js';

export function createBlock(engine: EngineClient, input: CreateBlockInput): Promise<Block> {
  return engine.invoke<Block>('createBlock', input);
}

export function createBlocks(engine: EngineClient, input: CreateBlocksInput): Promise<Block>> {
  return engine.invoke<Block>>('createBlocks', input);
}

export function createPage(engine: EngineClient, input: CreatePageInput): Promise<PageDocument> {
  return engine.invoke<PageDocument>('createPage', input);
}

export function databaseStatus(engine: EngineClient, input: EmptyInput): Promise<DatabaseStatus> {
  return engine.invoke<DatabaseStatus>('databaseStatus', input);
}

export function deleteBlock(engine: EngineClient, input: DeleteBlockInput): Promise<DeleteBlockOutput> {
  return engine.invoke<DeleteBlockOutput>('deleteBlock', input);
}

export function deleteBlocks(engine: EngineClient, input: DeleteBlocksInput): Promise<DeleteBlocksOutput> {
  return engine.invoke<DeleteBlocksOutput>('deleteBlocks', input);
}

export function deletePage(engine: EngineClient, input: DeletePageInput): Promise<DeletePageOutput> {
  return engine.invoke<DeletePageOutput>('deletePage', input);
}

export function engineInfo(engine: EngineClient, input: EmptyInput): Promise<EngineInfoOutput> {
  return engine.invoke<EngineInfoOutput>('engineInfo', input);
}

export function getPageDocument(engine: EngineClient, input: GetPageDocumentInput): Promise<PageDocument> {
  return engine.invoke<PageDocument>('getPageDocument', input);
}

export function listArchivedPages(engine: EngineClient, input: EmptyInput): Promise<Page>> {
  return engine.invoke<Page>>('listArchivedPages', input);
}

export function listBacklinks(engine: EngineClient, input: ListBacklinksInput): Promise<Backlink>> {
  return engine.invoke<Backlink>>('listBacklinks', input);
}

export function listPages(engine: EngineClient, input: EmptyInput): Promise<Page>> {
  return engine.invoke<Page>>('listPages', input);
}

export function moveBlock(engine: EngineClient, input: BridgeMoveBlockInput): Promise<Block> {
  return engine.invoke<Block>('moveBlock', input);
}

export function moveBlocks(engine: EngineClient, input: BridgeMoveBlocksInput): Promise<Block>> {
  return engine.invoke<Block>>('moveBlocks', input);
}

export function movePage(engine: EngineClient, input: MovePageInput): Promise<Page> {
  return engine.invoke<Page>('movePage', input);
}

export function purgeExpiredArchivedPages(engine: EngineClient, input: EmptyInput): Promise<PurgeExpiredArchivedPagesOutput> {
  return engine.invoke<PurgeExpiredArchivedPagesOutput>('purgeExpiredArchivedPages', input);
}

export function redoPageHistory(engine: EngineClient, input: PageHistoryInput): Promise<PageDocument>> {
  return engine.invoke<PageDocument>>('redoPageHistory', input);
}

export function restorePage(engine: EngineClient, input: RestorePageInput): Promise<RestorePageOutput> {
  return engine.invoke<RestorePageOutput>('restorePage', input);
}

export function searchPages(engine: EngineClient, input: SearchPagesInput): Promise<PageSearchResult>> {
  return engine.invoke<PageSearchResult>>('searchPages', input);
}

export function searchWorkspace(engine: EngineClient, input: SearchWorkspaceInput): Promise<SearchWorkspaceResult>> {
  return engine.invoke<SearchWorkspaceResult>>('searchWorkspace', input);
}

export function undoPageHistory(engine: EngineClient, input: PageHistoryInput): Promise<PageDocument>> {
  return engine.invoke<PageDocument>>('undoPageHistory', input);
}

export function updateBlock(engine: EngineClient, input: UpdateBlockInput): Promise<Block> {
  return engine.invoke<Block>('updateBlock', input);
}

export function updatePage(engine: EngineClient, input: UpdatePageInput): Promise<Page> {
  return engine.invoke<Page>('updatePage', input);
}

