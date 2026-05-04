export type InlinePageSearchTriggerChar = "@" | "[[";

export type InlinePageSearchTriggerMatch = {
  query: string;
  triggerChar: InlinePageSearchTriggerChar;
  triggerOffset: number;
};

export function getInlinePageSearchTrigger(
  text: string,
  cursorOffset: number
): InlinePageSearchTriggerMatch | null {
  const textBeforeCursor = text.slice(0, cursorOffset);
  const bracketMatch = textBeforeCursor.match(/\[\[([^\]]*?)$/);

  if (bracketMatch) {
    return {
      query: bracketMatch[1] ?? "",
      triggerChar: "[[",
      triggerOffset: cursorOffset - bracketMatch[0].length
    };
  }

  const atMatch = textBeforeCursor.match(/(?:^|\s)@([^\s@]*)$/);

  if (!atMatch || atMatch.index === undefined) {
    return null;
  }

  const triggerOffset = atMatch.index + atMatch[0].indexOf("@");

  return {
    query: atMatch[1] ?? "",
    triggerChar: "@",
    triggerOffset
  };
}
