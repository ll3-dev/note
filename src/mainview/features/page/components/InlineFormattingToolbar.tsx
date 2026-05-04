import { useState, type SubmitEvent as ReactSubmitEvent } from "react";
import { Bold, Code, Italic, Link } from "lucide-react";
import { cn } from "@/mainview/lib/utils";

type InlineFormattingToolbarProps = {
  onFormat: (commandId: string) => void;
  onLink: (href: string) => void;
  rect: DOMRect | null;
};

const FORMAT_ACTIONS = [
  {
    commandId: "format-bold",
    icon: Bold,
    label: "Bold"
  },
  {
    commandId: "format-italic",
    icon: Italic,
    label: "Italic"
  },
  {
    commandId: "format-inline-code",
    icon: Code,
    label: "Code"
  }
];

export function InlineFormattingToolbar({
  onFormat,
  onLink,
  rect
}: InlineFormattingToolbarProps) {
  const [isLinkEditing, setIsLinkEditing] = useState(false);
  const [linkHref, setLinkHref] = useState("");

  if (!rect) {
    return null;
  }

  const left = Math.max(12, rect.left + rect.width / 2);
  const top = rect.bottom + 8;

  function handleLinkSubmit(event: ReactSubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const href = linkHref.trim();

    if (!href) {
      return;
    }

    onLink(href);
    setIsLinkEditing(false);
    setLinkHref("");
  }

  return (
    <div
      className={cn(
        "fixed z-30 flex -translate-x-1/2 items-center gap-px rounded-md border border-border/80",
        "bg-popover/95 px-1 py-0.5 text-popover-foreground backdrop-blur-sm"
      )}
      role="toolbar"
      style={{ left, top }}
    >
      {FORMAT_ACTIONS.map((action) => {
        const Icon = action.icon;

        return (
          <button
            aria-label={action.label}
            className={toolbarButtonClassName}
            key={action.commandId}
            onMouseDown={(event) => {
              event.preventDefault();
              onFormat(action.commandId);
            }}
            title={action.label}
            type="button"
          >
            <Icon className="size-4" />
          </button>
        );
      })}
      <span className="mx-0.5 h-4 w-px bg-border/80" />
      {isLinkEditing ? (
        <form className="flex items-center gap-0.5" onSubmit={handleLinkSubmit}>
          <input
            aria-label="Link URL"
            className="h-6 w-44 rounded-sm border border-border/80 bg-background px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onChange={(event) => setLinkHref(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setIsLinkEditing(false);
                setLinkHref("");
              }
            }}
            placeholder="https://example.com"
            ref={(element) => element?.focus()}
            value={linkHref}
          />
          <button className={toolbarButtonClassName} type="submit">
            <Link className="size-4" />
          </button>
        </form>
      ) : (
        <button
          aria-label="Link"
          className={toolbarButtonClassName}
          onMouseDown={(event) => {
            event.preventDefault();
            setIsLinkEditing(true);
          }}
          title="Link"
          type="button"
        >
          <Link className="size-4" />
        </button>
      )}
    </div>
  );
}

const toolbarButtonClassName = cn(
  "flex size-6 items-center justify-center rounded-sm text-muted-foreground",
  "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
);
