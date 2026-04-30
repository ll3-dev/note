export function scrollBlockIntoView(blockId: string | null) {
  if (!blockId) {
    return;
  }

  const blockElement = document.querySelector<HTMLElement>(
    `[data-block-id="${escapeCssIdentifier(blockId)}"]`
  );

  blockElement?.scrollIntoView({ block: "nearest" });
}

function escapeCssIdentifier(value: string) {
  return globalThis.CSS?.escape ? globalThis.CSS.escape(value) : value;
}
