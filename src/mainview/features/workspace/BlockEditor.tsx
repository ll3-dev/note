import { Trash2 } from "lucide-react";
import { Button } from "@/mainview/components/ui/button";
import { Textarea } from "@/mainview/components/ui/textarea";
import type { Block } from "../../../shared/contracts";

type BlockEditorProps = {
  block: Block;
  isDeleting: boolean;
  onDelete: (block: Block) => void;
  onUpdate: (block: Block, text: string) => void;
};

export function BlockEditor({
  block,
  isDeleting,
  onDelete,
  onUpdate
}: BlockEditorProps) {
  return (
    <div className="group grid grid-cols-[28px_minmax(0,1fr)_32px] items-start gap-1 rounded-md px-1 py-0.5 hover:bg-muted/60">
      <div className="flex h-9 items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        <span className="text-lg leading-none">+</span>
      </div>
      <Textarea
        aria-label={`${block.type} block`}
        className="min-h-9 resize-none border-0 bg-transparent px-1 py-2 text-[15px] leading-6 shadow-none focus-visible:ring-0"
        defaultValue={block.text}
        onBlur={(event) => {
          const text = event.currentTarget.value;

          if (text !== block.text) {
            onUpdate(block, text);
          }
        }}
        placeholder="Type '/' for commands"
        rows={1}
      />
      <Button
        aria-label="block 삭제"
        className="opacity-0 transition-opacity group-hover:opacity-100"
        disabled={isDeleting}
        onClick={() => onDelete(block)}
        size="icon-sm"
        variant="ghost"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
