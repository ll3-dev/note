import { useState, type FormEvent } from "react";
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

  const left = Math.max(8, rect.left + rect.width / 2);
  const top = Math.max(8, rect.top - 42);

  function handleLinkSubmit(event: FormEvent<HTMLFormElement>) {
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
      className="fixed z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-border bg-popover p-1 text-popover-foreground"
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
      <span className="mx-1 h-4 w-px bg-border" />
      {isLinkEditing ? (
        <form className="flex items-center gap-1" onSubmit={handleLinkSubmit}>
          <input
            aria-label="Link URL"
            autoFocus
            className="h-7 w-48 rounded-sm border border-border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) => setLinkHref(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setIsLinkEditing(false);
                setLinkHref("");
              }
            }}
            placeholder="https://example.com"
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
  "flex size-7 items-center justify-center rounded-sm text-muted-foreground",
  "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
);
