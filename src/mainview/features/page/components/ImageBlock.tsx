import type { Block } from "@/shared/contracts";
import type { BlockEditorUpdate } from "@/mainview/features/page/types/blockEditorTypes";

type ImageBlockProps = {
  block: Block;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
  props: Block["props"];
};

export function ImageBlock({ block, onUpdate, props }: ImageBlockProps) {
  const src = getString(props.src);
  const caption = getString(props.caption) ?? block.text;

  if (!src) {
    return (
      <input
        aria-label="Image URL"
        className="h-8 w-full rounded-sm border border-border/80 bg-background px-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onBlur={(event) => {
          const value = event.currentTarget.value.trim();

          if (value) {
            onUpdate(block, {
              props: { ...props, src: value },
              text: caption
            });
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        placeholder="Paste image URL"
      />
    );
  }

  return (
    <figure className="grid gap-1 px-1 py-1">
      <img
        alt={getString(props.alt) ?? caption ?? ""}
        className="max-h-[520px] w-full rounded-md border border-border/70 object-contain"
        src={src}
      />
      <input
        aria-label="Image caption"
        className="h-7 bg-transparent text-center text-xs text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onBlur={(event) => {
          onUpdate(block, {
            props: { ...props, caption: event.currentTarget.value },
            text: event.currentTarget.value
          });
        }}
        placeholder="Add a caption"
        defaultValue={caption ?? ""}
      />
    </figure>
  );
}

function getString(value: unknown) {
  return typeof value === "string" ? value : null;
}
