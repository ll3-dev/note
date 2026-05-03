export type SearchResult = {
  blockId: string;
  length: number;
  offset: number;
};

export function findInBlocks(
  blocks: ReadonlyArray<{ id: string; text: string }>,
  query: string
): SearchResult[] {
  if (!query) {
    return [];
  }

  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const block of blocks) {
    const lowerText = block.text.toLowerCase();
    let searchFrom = 0;

    while (searchFrom < lowerText.length) {
      const index = lowerText.indexOf(lowerQuery, searchFrom);

      if (index === -1) {
        break;
      }

      results.push({
        blockId: block.id,
        length: query.length,
        offset: index
      });
      searchFrom = index + 1;
    }
  }

  return results;
}
