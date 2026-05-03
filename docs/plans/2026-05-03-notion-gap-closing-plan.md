# Notion Gap Closing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add callout block, @/[[ inline page links, and page search (Cmd+F/Cmd+H) to close the Notion text editing gap.

**Architecture:** Each feature follows existing patterns. Callout extends the block type system. Page links extend the inline formatting mark system. Search adds a new UI layer on top of the page editor.

**Tech Stack:** React, TypeScript, Tailwind CSS, lucide-react, existing block/inline formatting infrastructure.

---

## Task 1: Callout Block — Type & Command

**Files:**
- Modify: `src/shared/contracts.ts:21-34`
- Modify: `src/mainview/features/page/lib/blockCommands.ts:1-15,31-152,186-204`
- Test: `src/mainview/features/page/lib/blockCommands.test.ts`

**Step 1: Write the failing test**

Add to `blockCommands.test.ts`:

```typescript
test("converts callout shortcut into callout block", () => {
  expect(getMarkdownShortcut(">! ")).toEqual({
    props: { icon: "💡" },
    text: "",
    type: "callout"
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/mainview/features/page/lib/blockCommands.test.ts`
Expected: FAIL

**Step 3: Add "callout" to BlockType union**

In `src/shared/contracts.ts`, add `| "callout"` after `"page_link"`:

```typescript
export type BlockType =
  | "paragraph"
  // ... existing types
  | "page_link"
  | "callout";
```

In `src/mainview/features/page/lib/blockCommands.ts`:

Add `MessageSquare` to imports:
```typescript
import {
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Link,
  List,
  ListOrdered,
  MessageSquare,
  Minus,
  ListTree,
  Quote,
  Text
} from "lucide-react";
```

Add callout command to `BLOCK_COMMANDS` array (after the page_link entry, before `];`):

```typescript
{
  action: "turnInto",
  aliases: ["alert", "info", "notice", "tip", "warning"],
  description: "Highlighted callout with icon",
  icon: MessageSquare,
  id: "turn-into-callout",
  label: "Callout",
  props: { icon: "💡" },
  type: "callout"
},
```

Add markdown shortcut to `getMarkdownShortcut()` shortcuts array (before `###`):

```typescript
[/^>!\s$/, { props: { icon: "💡" }, text: "", type: "callout" }],
```

**Step 4: Run test to verify it passes**

Run: `bun test src/mainview/features/page/lib/blockCommands.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/contracts.ts src/mainview/features/page/lib/blockCommands.ts src/mainview/features/page/lib/blockCommands.test.ts
git commit -m "feat(editor): add callout block type and slash command"
```

---

## Task 2: Callout Block — Styling

**Files:**
- Modify: `src/mainview/features/page/lib/blockStyles.ts`
- Modify: `src/mainview/features/page/lib/blockEditingBehavior.ts:11-17,79-118`
- Test: `src/mainview/features/page/lib/blockEditingBehavior.test.ts`

**Step 1: Write the failing test**

Add to `blockEditingBehavior.test.ts`:

```typescript
test("callout does not continue on Enter — creates paragraph", () => {
  expect(getNextBlockDraft({ ...block, type: "callout" })).toEqual({
    props: {},
    type: "paragraph"
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/mainview/features/page/lib/blockEditingBehavior.test.ts`
Expected: FAIL (callout not in BlockType yet might cause type error, but the test should fail because the behavior returns wrong result)

Actually — callout is NOT in CONTINUING_BLOCK_TYPES, so `getNextBlockDraft` already returns `{ props: {}, type: "paragraph" }` by default. The test should PASS immediately. So we verify that behavior is correct first.

**Step 3: Add callout styling**

In `blockStyles.ts`, add to `blockShellClass`:

```typescript
if (type === "callout") {
  return "rounded-md bg-accent/50 px-3 py-1";
}
```

In `editableClass`, add case:

```typescript
case "callout":
  return "text-[15px]";
```

Add `"callout"` to `EMPTY_ENTER_RESET_TYPES` in `blockEditorCommands.ts:11-17`:

```typescript
const EMPTY_ENTER_RESET_TYPES = new Set<BlockType>([
  "bulleted_list",
  "numbered_list",
  "quote",
  "todo",
  "toggle",
  "callout"
]);
```

**Step 4: Run all tests**

Run: `bun test src/mainview/features/page/lib/blockEditingBehavior.test.ts src/mainview/features/page/lib/blockEditorCommands.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/mainview/features/page/lib/blockStyles.ts src/mainview/features/page/lib/blockEditingBehavior.test.ts src/mainview/features/page/lib/blockEditorCommands.ts
git commit -m "feat(editor): add callout block styling and editing behavior"
```

---

## Task 3: Callout Block — Rendering

**Files:**
- Modify: `src/mainview/features/page/components/BlockBody.tsx:1-15,82-160`

**Step 1: Add callout icon rendering in BlockBody**

In `BlockBody.tsx`, add callout icon before the `block.type === "image"` check (around line 124):

```tsx
{block.type === "callout" ? (
  <span className="mt-1 shrink-0 text-lg" role="img" aria-label="callout icon">
    {typeof draftProps.icon === "string" ? draftProps.icon : "💡"}
  </span>
) : null}
```

The callout block falls through to `EditableTextBlock` for text editing, which is correct — it uses the same editing pattern as paragraph with custom shell styling.

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/mainview/features/page/components/BlockBody.tsx
git commit -m "feat(editor): render callout block with icon and styled background"
```

---

## Task 4: Callout Block — Paste Support

**Files:**
- Modify: `src/mainview/features/page/lib/markdownBlockParsing.ts`
- Test: `src/mainview/features/page/lib/markdownBlocks.test.ts`

**Step 1: Add callout to markdown block parsing**

Look at the `parseMarkdownToBlockDrafts` function in `markdownBlockParsing.ts`. Add a pattern for callout blocks (lines starting with `>!`):

```typescript
// After the blockquote pattern, add:
if (line.startsWith(">! ")) {
  return { text: line.slice(3), props: { icon: "💡" }, type: "callout" };
}
```

**Step 2: Add test**

Add to `markdownBlocks.test.ts`:

```typescript
test("parses callout blocks", () => {
  const drafts = parseMarkdownToBlockDrafts(">! This is a callout\n>! Another one");
  expect(drafts).toHaveLength(2);
  expect(drafts[0]).toEqual({ text: "This is a callout", props: { icon: "💡" }, type: "callout" });
  expect(drafts[1]).toEqual({ text: "Another one", props: { icon: "💡" }, type: "callout" });
});
```

**Step 3: Run tests**

Run: `bun test src/mainview/features/page/lib/markdownBlocks.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/mainview/features/page/lib/markdownBlockParsing.ts src/mainview/features/page/lib/markdownBlocks.test.ts
git commit -m "feat(editor): parse callout blocks from markdown paste"
```

---

## Task 5: Inline Page Link — Mark Type Extension

**Files:**
- Modify: `src/mainview/features/page/lib/inlineFormatting.ts:4-7,9-14,16-20,108-150,174-189`
- Test: `src/mainview/features/page/lib/inlineFormatting.test.ts`

**Step 1: Write the failing test**

Add to `inlineFormatting.test.ts`:

```typescript
test("segments pageLink marks with pageId", () => {
  const props = {
    inlineMarks: [
      { start: 0, end: 5, type: "pageLink", pageId: "page-abc" }
    ]
  };
  const segments = getInlineTextSegments("Hello world", props);
  expect(segments).toHaveLength(2);
  expect(segments[0]).toEqual({
    marks: [],
    pageId: "page-abc",
    text: "Hello"
  });
  expect(segments[1]).toEqual({
    marks: [],
    text: " world"
  });
});

test("validates pageLink mark with pageId", () => {
  const marks = getInlineMarks({
    inlineMarks: [
      { start: 0, end: 5, type: "pageLink", pageId: "abc" },
      { start: 0, end: 5, type: "pageLink" },
      { start: 0, end: 5, type: "pageLink", pageId: 123 }
    ]
  });
  expect(marks).toHaveLength(1);
  expect(marks[0].pageId).toBe("abc");
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/mainview/features/page/lib/inlineFormatting.test.ts`
Expected: FAIL

**Step 3: Extend InlineMark type system**

In `inlineFormatting.ts`:

Update type definitions:
```typescript
export type InlineMarkType = "bold" | "italic" | "code";
export type TextStyleInlineMarkType = InlineMarkType;
export type LinkInlineMarkType = "link";
export type PageLinkInlineMarkType = "pageLink";
export type AnyInlineMarkType = InlineMarkType | LinkInlineMarkType | PageLinkInlineMarkType;

export type InlineMark = {
  end: number;
  href?: string;
  pageId?: string;
  start: number;
  type: AnyInlineMarkType;
};

export type InlineTextSegment = {
  marks: InlineMarkType[];
  href?: string;
  pageId?: string;
  text: string;
};
```

Update `getInlineTextSegments` to handle pageLink (around line 136-146):

In the segment push, add pageId extraction:
```typescript
segments.push({
  href: marks
    .find(
      (mark) => mark.type === "link" && mark.start <= start && mark.end >= end
    )
    ?.href,
  marks: marks
    .filter((mark) => mark.start <= start && mark.end >= end)
    .flatMap((mark) =>
      mark.type === "link" || mark.type === "pageLink" ? [] : [mark.type]
    ),
  pageId: marks.find(
    (mark) =>
      mark.type === "pageLink" && mark.start <= start && mark.end >= end
  )?.pageId,
  text: segmentText
});
```

Update `isInlineMark` to validate pageLink:
```typescript
function isInlineMark(value: unknown): value is InlineMark {
  if (!value || typeof value !== "object") {
    return false;
  }

  const mark = value as Partial<InlineMark>;

  return (
    typeof mark.start === "number" &&
    typeof mark.end === "number" &&
    (mark.type === "bold" ||
      mark.type === "italic" ||
      mark.type === "code" ||
      (mark.type === "link" && typeof mark.href === "string") ||
      (mark.type === "pageLink" && typeof mark.pageId === "string"))
  );
}
```

Add `getInlinePageLinkProps` function:

```typescript
export function getInlinePageLinkProps(
  props: BlockProps,
  selection: { end: number; start: number } | null,
  pageId: string
) {
  if (!selection || !pageId) {
    return null;
  }

  const start = Math.min(selection.start, selection.end);
  const end = Math.max(selection.start, selection.end);

  if (start === end) {
    return null;
  }

  return {
    ...props,
    inlineMarks: [
      ...getInlineMarks(props).filter(
        (mark) =>
          !(mark.type === "pageLink" && mark.start === start && mark.end === end)
      ),
      { end, pageId, start, type: "pageLink" }
    ]
  };
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/mainview/features/page/lib/inlineFormatting.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/mainview/features/page/lib/inlineFormatting.ts src/mainview/features/page/lib/inlineFormatting.test.ts
git commit -m "feat(editor): add pageLink inline mark type with pageId"
```

---

## Task 6: Inline Page Link — Rendering

**Files:**
- Modify: `src/mainview/features/page/components/InlineMarksViewer.tsx:48-76`

**Step 1: Update InlineSegment to handle pageLink**

Update the `InlineSegment` component to accept `pageId` and render page links:

```tsx
function InlineSegment({
  href,
  marks,
  pageId,
  text
}: {
  href?: string;
  marks: Array<"bold" | "italic" | "code">;
  pageId?: string;
  text: string;
}) {
  const className = cn(
    marks.includes("bold") && "font-semibold",
    marks.includes("italic") && "italic",
    marks.includes("code") &&
      "rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.92em]"
  );

  if (pageId) {
    return (
      <a
        className={cn(className, "text-primary underline underline-offset-2")}
        data-page-link-id={pageId}
      >
        {text}
      </a>
    );
  }

  if (href) {
    return (
      <a
        className={cn(className, "text-primary underline underline-offset-2")}
        href={href}
      >
        {text}
      </a>
    );
  }

  return className ? <span className={className}>{text}</span> : <span>{text}</span>;
}
```

Update the segments mapping to pass `pageId`:

```tsx
<InlineSegment
  href={segment.href}
  key={`${segmentStart}-${segmentOffset}-${segment.text}`}
  marks={segment.marks}
  pageId={segment.pageId}
  text={segment.text}
/>
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/mainview/features/page/components/InlineMarksViewer.tsx
git commit -m "feat(editor): render inline page links with underline styling"
```

---

## Task 7: Inline Page Link — Search Menu Component

**Files:**
- Create: `src/mainview/features/page/components/InlinePageSearchMenu.tsx`

**Step 1: Create the page search menu component**

This component appears when `@` or `[[` is typed, shows filtered page results, and calls back with the selected page.

```tsx
import { useState } from "react";
import { noteApi } from "@/mainview/lib/rpc";

type InlinePageSearchMenuProps = {
  query: string;
  onSelect: (pageId: string, pageTitle: string) => void;
  onClose: () => void;
};

export function InlinePageSearchMenu({
  query,
  onSelect,
  onClose
}: InlinePageSearchMenuProps) {
  const [results, setResults] = useState<{ pageId: string; title: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Search pages when query changes
  // Debounce and call noteApi.searchPages({ query })

  return null; // Placeholder — full implementation in next step
}
```

**Implementation details:**

The full component should:
1. Call `noteApi.searchPages({ query })` with debounced input
2. Render a floating list of page results below the cursor
3. Support keyboard navigation (ArrowUp/ArrowDown, Enter to select, Escape to close)
4. Call `onSelect(pageId, title)` when a result is chosen
5. Position near the cursor using the same pattern as `InlineFormattingToolbar`

**Step 2: Commit**

```bash
git add src/mainview/features/page/components/InlinePageSearchMenu.tsx
git commit -m "feat(editor): add inline page search menu component skeleton"
```

---

## Task 8: Inline Page Link — Trigger Detection

**Files:**
- Create: `src/mainview/features/page/hooks/useInlinePageSearch.ts`

**Step 1: Create trigger detection hook**

This hook watches text input for `@` or `[[` triggers and manages the search state.

```typescript
import { useState, useCallback } from "react";

type PageSearchTriggerState = {
  active: boolean;
  query: string;
  triggerChar: "@" | "[[";
  triggerOffset: number;
};

export function useInlinePageSearch() {
  const [triggerState, setTriggerState] = useState<PageSearchTriggerState | null>(null);

  const checkTrigger = useCallback((text: string, cursorOffset: number) => {
    // Check if text before cursor ends with @ or [[
    const textBeforeCursor = text.slice(0, cursorOffset);

    // Check [[ trigger
    const bracketMatch = textBeforeCursor.match(/\[\[([^\]]*?)$/);
    if (bracketMatch) {
      setTriggerState({
        active: true,
        query: bracketMatch[1],
        triggerChar: "[[",
        triggerOffset: cursorOffset - bracketMatch[0].length
      });
      return;
    }

    // Check @ trigger (only after whitespace or at start)
    const atMatch = textBeforeCursor.match(/(?:^|\s)@([^\s@]*)$/);
    if (atMatch) {
      setTriggerState({
        active: true,
        query: atMatch[1],
        triggerChar: "@",
        triggerOffset: cursorOffset - atMatch[0].length
      });
      return;
    }

    setTriggerState(null);
  }, []);

  const closeSearch = useCallback(() => {
    setTriggerState(null);
  }, []);

  return { checkTrigger, closeSearch, triggerState };
}
```

**Step 2: Commit**

```bash
git add src/mainview/features/page/hooks/useInlinePageSearch.ts
git commit -m "feat(editor): add @/[[ trigger detection hook"
```

---

## Task 9: Inline Page Link — Integration

**Files:**
- Modify: `src/mainview/features/page/components/EditableTextBlock.tsx`
- Modify: `src/mainview/features/page/components/BlockBody.tsx`

**Step 1: Wire trigger detection into EditableTextBlock**

In `EditableTextBlock.tsx`:
1. Import `useInlinePageSearch`
2. Call `checkTrigger` on every `onChange`
3. Render `InlinePageSearchMenu` when trigger is active
4. On page selection, replace trigger text with pageLink mark

**Step 2: Add click handler for page links in InlineMarksViewer**

Page links rendered in `InlineMarksViewer` need click handling. Since the viewer is `pointer-events-none`, the click needs to be handled at the `EditableTextBlock` level by checking `data-page-link-id` attributes.

**Step 3: Run typecheck and tests**

Run: `bun run typecheck && bun test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/mainview/features/page/components/EditableTextBlock.tsx src/mainview/features/page/components/BlockBody.tsx
git commit -m "feat(editor): integrate @/[[ inline page search and linking"
```

---

## Task 10: Page Search — Search Logic

**Files:**
- Create: `src/mainview/features/page/lib/pageSearch.ts`
- Create: `src/mainview/features/page/lib/pageSearch.test.ts`

**Step 1: Write the failing test**

```typescript
import { findInBlocks } from "./pageSearch";

test("finds all occurrences across blocks", () => {
  const blocks = [
    { id: "a", text: "Hello world" },
    { id: "b", text: "hello again" },
    { id: "c", text: "no match" }
  ];

  const results = findInBlocks(blocks, "hello");
  expect(results).toHaveLength(2);
  expect(results[0]).toEqual({ blockId: "a", offset: 0, length: 5 });
  expect(results[1]).toEqual({ blockId: "b", offset: 0, length: 5 });
});

test("finds multiple matches in one block", () => {
  const blocks = [
    { id: "a", text: "cat and cat" }
  ];

  const results = findInBlocks(blocks, "cat");
  expect(results).toHaveLength(2);
  expect(results[0].offset).toBe(0);
  expect(results[1].offset).toBe(8);
});

test("returns empty for empty query", () => {
  expect(findInBlocks([], "hello")).toHaveLength(0);
  expect(findInBlocks([{ id: "a", text: "hi" }], "")).toHaveLength(0);
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/mainview/features/page/lib/pageSearch.test.ts`
Expected: FAIL

**Step 3: Implement search logic**

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `bun test src/mainview/features/page/lib/pageSearch.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/mainview/features/page/lib/pageSearch.ts src/mainview/features/page/lib/pageSearch.test.ts
git commit -m "feat(editor): add page text search logic"
```

---

## Task 11: Page Search — Hook

**Files:**
- Create: `src/mainview/features/page/hooks/usePageSearch.ts`

**Step 1: Create search hook**

```typescript
import { useState, useCallback, useMemo } from "react";
import type { Block } from "@/shared/contracts";
import { findInBlocks, type SearchResult } from "../lib/pageSearch";

type PageSearchState = {
  active: boolean;
  activeIndex: number;
  matches: SearchResult[];
  query: string;
  replaceQuery: string;
  showReplace: boolean;
};

export function usePageSearch() {
  const [state, setState] = useState<PageSearchState>({
    active: false,
    activeIndex: 0,
    matches: [],
    query: "",
    replaceQuery: "",
    showReplace: false
  });

  const openSearch = useCallback(() => {
    setState((prev) => ({ ...prev, active: true }));
  }, []);

  const closeSearch = useCallback(() => {
    setState({
      active: false,
      activeIndex: 0,
      matches: [],
      query: "",
      replaceQuery: "",
      showReplace: false
    });
  }, []);

  const setQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, activeIndex: 0, query }));
  }, []);

  const setReplaceQuery = useCallback((replaceQuery: string) => {
    setState((prev) => ({ ...prev, replaceQuery }));
  }, []);

  const toggleReplace = useCallback(() => {
    setState((prev) => ({ ...prev, showReplace: !prev.showReplace }));
  }, []);

  const goNext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeIndex: (prev.activeIndex + 1) % Math.max(prev.matches.length, 1)
    }));
  }, []);

  const goPrevious = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeIndex:
        (prev.activeIndex - 1 + prev.matches.length) %
        Math.max(prev.matches.length, 1)
    }));
  }, []);

  return {
    ...state,
    closeSearch,
    goNext,
    goPrevious,
    openSearch,
    setQuery,
    setReplaceQuery,
    toggleReplace
  };
}
```

**Step 2: Commit**

```bash
git add src/mainview/features/page/hooks/usePageSearch.ts
git commit -m "feat(editor): add page search state management hook"
```

---

## Task 12: Page Search — SearchBar Component

**Files:**
- Create: `src/mainview/features/page/components/SearchBar.tsx`

**Step 1: Create SearchBar component**

The search bar renders at the top of the editor with find/replace inputs, match counter, and navigation controls.

```tsx
import { useEffect, useRef } from "react";

type SearchBarProps = {
  activeIndex: number;
  matchCount: number;
  query: string;
  replaceQuery: string;
  showReplace: boolean;
  onClose: () => void;
  onGoNext: () => void;
  onGoPrevious: () => void;
  onQueryChange: (query: string) => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onReplaceQueryChange: (query: string) => void;
  onToggleReplace: () => void;
};

export function SearchBar({
  activeIndex,
  matchCount,
  query,
  replaceQuery,
  showReplace,
  onClose,
  onGoNext,
  onGoPrevious,
  onQueryChange,
  onReplace,
  onReplaceAll,
  onReplaceQueryChange,
  onToggleReplace
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center gap-2 border-b bg-background px-4 py-2">
      <button
        className="text-muted-foreground hover:text-foreground text-xs"
        onClick={onToggleReplace}
        type="button"
      >
        {showReplace ? "≪" : "≫"}
      </button>
      <input
        className="w-40 rounded-sm border bg-transparent px-2 py-1 text-sm outline-none focus:border-primary"
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.shiftKey ? onGoPrevious() : onGoNext();
          }
          if (e.key === "Escape") {
            onClose();
          }
        }}
        placeholder="Find"
        ref={inputRef}
        value={query}
      />
      <span className="text-xs text-muted-foreground min-w-12 text-center">
        {matchCount > 0 ? `${activeIndex + 1}/${matchCount}` : "0/0"}
      </span>
      <button className="text-xs hover:text-foreground" onClick={onGoPrevious} type="button">
        ↑
      </button>
      <button className="text-xs hover:text-foreground" onClick={onGoNext} type="button">
        ↓
      </button>
      {showReplace ? (
        <>
          <input
            className="w-40 rounded-sm border bg-transparent px-2 py-1 text-sm outline-none focus:border-primary"
            onChange={(e) => onReplaceQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
            placeholder="Replace"
            value={replaceQuery}
          />
          <button
            className="text-xs hover:text-foreground"
            onClick={onReplace}
            type="button"
          >
            Replace
          </button>
          <button
            className="text-xs hover:text-foreground"
            onClick={onReplaceAll}
            type="button"
          >
            All
          </button>
        </>
      ) : null}
      <button className="text-xs hover:text-foreground" onClick={onClose} type="button">
        ✕
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/mainview/features/page/components/SearchBar.tsx
git commit -m "feat(editor): add search bar component"
```

---

## Task 13: Page Search — Keyboard Command

**Files:**
- Modify: `src/mainview/features/page/lib/blockEditorCommands.ts:56-318`

**Step 1: Add Cmd+F command**

Add to `BLOCK_EDITOR_COMMANDS` array:

```typescript
{
  defaultKeybindings: ["Mod+F"],
  id: "editor.search.open",
  scope: "block",
  title: "Open search",
  run: ({ openSearch }) => {
    openSearch();
  }
},
```

Update `BlockShortcutContext` to include `openSearch`:

```typescript
export type BlockShortcutContext = {
  // ... existing fields
  openSearch: () => void;
};
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: Type error — `openSearch` not yet passed from controller. Fix in next task.

**Step 3: Commit**

```bash
git add src/mainview/features/page/lib/blockEditorCommands.ts
git commit -m "feat(editor): add Cmd+F search command"
```

---

## Task 14: Page Search — Editor Integration

**Files:**
- Modify: `src/mainview/features/page/components/PageEditor.tsx`
- Modify: `src/mainview/features/page/hooks/usePageEditorController.ts` (or equivalent controller)
- Modify: `src/mainview/features/page/components/EditableTextBlock.tsx`

**Step 1: Wire search into PageEditor**

1. Import `usePageSearch` hook in PageEditor
2. Import `SearchBar` component
3. Render SearchBar above the ScrollArea when active
4. Pass `openSearch` down to the editor controller

**Step 2: Add search highlight rendering**

In `EditableTextBlock.tsx`, when search is active and the block has matches:
1. Accept `searchHighlights` as a prop (array of `{ offset, length }`)
2. Render highlight markers in a third layer (similar to InlineMarksViewer)
3. Active match gets a stronger highlight color

**Step 3: Run typecheck and tests**

Run: `bun run typecheck && bun test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/mainview/features/page/components/PageEditor.tsx src/mainview/features/page/hooks/usePageEditorController.ts src/mainview/features/page/components/EditableTextBlock.tsx
git commit -m "feat(editor): integrate search bar with page editor and highlight matches"
```

---

## Task 15: Verification — All Features

**Step 1: Run full test suite**

Run: `bun test`
Expected: All tests PASS

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Run build**

Run: `bun run build:mainview`
Expected: PASS

**Step 4: Manual verification checklist**

- [ ] `/callout` creates a callout block with 💡 icon and accent background
- [ ] `>! ` markdown shortcut creates a callout
- [ ] Enter on empty callout resets to paragraph
- [ ] Backspace on non-paragraph callout resets to paragraph
- [ ] `@` in text opens page search menu
- [ ] `[[` in text opens page search menu
- [ ] Selecting a page creates inline page link
- [ ] Page link renders with underline and can be clicked
- [ ] Cmd+F opens search bar
- [ ] Typing highlights matches across blocks
- [ ] Enter/Shift+Enter navigates next/previous match
- [ ] Cmd+H toggles replace mode
- [ ] Replace and Replace All work correctly
- [ ] Escape closes search bar

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(editor): Notion gap closing — callout, inline page links, page search"
```
