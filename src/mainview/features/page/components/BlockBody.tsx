import type {
  DragEvent,
  FormEvent,
  KeyboardEvent,
  RefObject
} from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/mainview/lib/utils";
import type { Block, Page } from "@/shared/contracts";
import { getBlockDepth } from "@/mainview/features/page/lib/blockEditingBehavior";
import { blockShellClass } from "@/mainview/features/page/lib/blockStyles";
import { useEditableHistoryInput } from "@/mainview/features/page/hooks/useEditableHistoryInput";
import { EditableTextBlock } from "./EditableTextBlock";
import { ImageBlock } from "./ImageBlock";
import { PageLinkBlock } from "./PageLinkBlock";
import type {
  BlockEditorUpdate,
  OpenPageLinkOptions,
  TextSelectionOffsets
} from "@/mainview/features/page/types/blockEditorTypes";

type BlockBodyProps = {
  block: Block;
  blockIndex: number;
  checked: boolean;
  draft: string;
  draftProps: Block["props"];
  numberedListMarker: number | null;
  isSelected: boolean;
  linkedPage: Page | null;
  onBlur: () => Promise<void>;
  onBeforeInput: (event: FormEvent<HTMLDivElement>) => void;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onHistoryInput: (inputType: "historyRedo" | "historyUndo") => void;
  onPasteMarkdown: (
    block: Block,
    markdown: string,
    editableElement: HTMLElement,
    selection: TextSelectionOffsets
  ) => Promise<void> | void;
  onOpenPageLink: (pageId: string, options?: OpenPageLinkOptions) => void;
  onRestorePageLink: (pageId: string) => void;
  onSelectionChange: () => void;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
  editableRef: RefObject<HTMLDivElement | null>;
};

export function BlockBody({
  block,
  blockIndex,
  checked,
  draft,
  draftProps,
  numberedListMarker,
  isSelected,
  linkedPage,
  onBlur,
  onBeforeInput,
  onChange,
  onKeyDown,
  onDragStart,
  onHistoryInput,
  onPasteMarkdown,
  onOpenPageLink,
  onRestorePageLink,
  onSelectionChange,
  onUpdate,
  editableRef
}: BlockBodyProps) {
  const blockDepth = getBlockDepth(block);
  useEditableHistoryInput({ editableRef, onHistoryInput });

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-1",
        blockShellClass(block.type),
      )}
    >
      {block.type === "todo" ? (
        <input
          aria-label="완료 여부"
          checked={checked}
          className="mt-2.5 size-4 shrink-0 accent-foreground"
          onChange={(event) =>
            onUpdate(block, {
              props: { ...block.props, checked: event.target.checked },
            })
          }
          type="checkbox"
        />
      ) : null}
      {block.type === "bulleted_list" ? (
        <span className="flex h-7 w-3 shrink-0 items-center justify-center">
          <BulletMarker depth={blockDepth} />
        </span>
      ) : null}
      {block.type === "numbered_list" ? (
        <span className="flex h-7 w-5 shrink-0 items-center justify-end text-sm font-medium text-muted-foreground">
          {numberedListMarker ?? blockIndex + 1}.
        </span>
      ) : null}
      {block.type === "toggle" ? (
        <button
          aria-label={isToggleOpen(draftProps) ? "토글 닫기" : "토글 열기"}
          className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() =>
            onUpdate(block, {
              props: { ...draftProps, open: !isToggleOpen(draftProps) }
            })
          }
          type="button"
        >
          {isToggleOpen(draftProps) ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
      ) : null}
      {block.type === "callout" ? (
        <span className="mt-1 shrink-0 text-lg" role="img" aria-label="callout icon">
          {typeof draftProps.icon === "string" ? draftProps.icon : "💡"}
        </span>
      ) : null}
      {block.type === "image" ? (
        <ImageBlock block={block} onUpdate={onUpdate} props={draftProps} />
      ) : block.type === "divider" ? (
        <div
          aria-orientation="horizontal"
          className="group/divider flex h-7 w-full items-center px-1 outline-none"
          role="separator"
        >
          <span className="h-px w-full rounded-full bg-border transition-colors group-hover/divider:bg-muted-foreground/45" />
        </div>
      ) : block.type === "page_link" ? (
        <PageLinkBlock
          draft={draft}
          draftProps={draftProps}
          linkedPage={linkedPage}
          onKeyDown={onKeyDown}
          onOpenPageLink={onOpenPageLink}
          onRestorePageLink={onRestorePageLink}
        />
      ) : (
        <EditableTextBlock
          block={block}
          checked={checked}
          draft={draft}
          draftProps={draftProps}
          editableRef={editableRef}
          isSelected={isSelected}
          onBeforeInput={onBeforeInput}
          onBlur={onBlur}
          onChange={onChange}
          onDragStart={onDragStart}
          onHistoryInput={onHistoryInput}
          onKeyDown={onKeyDown}
          onPasteMarkdown={onPasteMarkdown}
          onSelectionChange={onSelectionChange}
        />
      )}
    </div>
  );
}

function BulletMarker({ depth }: { depth: number }) {
  if (depth % 3 === 1) {
    return <span className="size-1.5 rounded-[1px] bg-foreground/70" />;
  }

  if (depth % 3 === 2) {
    return <span className="size-1.5 rounded-full border border-foreground/70" />;
  }

  return <span className="size-1.5 rounded-full bg-foreground/70" />;
}

function isToggleOpen(props: Block["props"]) {
  return props.open !== false;
}
