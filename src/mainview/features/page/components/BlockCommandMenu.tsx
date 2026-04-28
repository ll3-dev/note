import {
  type CSSProperties,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import type { BlockCommand } from "../lib/blockCommands";

type BlockCommandMenuProps = {
  activeIndex: number;
  anchorRef: RefObject<HTMLElement | null>;
  commands: BlockCommand[];
  onActiveIndexChange: (index: number) => void;
  onSelect: (command: BlockCommand) => void;
};

type MenuStyle = Pick<CSSProperties, "left" | "maxHeight" | "top">;

export function BlockCommandMenu({
  activeIndex,
  anchorRef,
  commands,
  onActiveIndexChange,
  onSelect
}: BlockCommandMenuProps) {
  const commandRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lastMenuStyleRef = useRef<MenuStyle | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!anchorRef.current) {
      return;
    }

    function updateMenuStyle(): MenuStyle | null {
      const anchor = anchorRef.current;

      if (!anchor) {
        return null;
      }

      const rect = anchor.getBoundingClientRect();
      const viewportPadding = 16;
      const menuGap = 8;
      const menuWidth = 320;
      const preferredMaxHeight = 448;
      const minimumMaxHeight = 220;
      const belowTop = rect.bottom + menuGap;
      const availableBelow = window.innerHeight - belowTop - viewportPadding;
      const availableAbove = rect.top - menuGap - viewportPadding;
      const placeAbove =
        availableBelow < minimumMaxHeight && availableAbove > availableBelow;
      const availableHeight = placeAbove ? availableAbove : availableBelow;
      const viewportMaxHeight = Math.max(
        96,
        window.innerHeight - viewportPadding * 2
      );
      const maxHeight = Math.min(
        preferredMaxHeight,
        viewportMaxHeight,
        Math.max(minimumMaxHeight, availableHeight)
      );
      const left = Math.min(
        Math.max(rect.left + 32, viewportPadding),
        window.innerWidth - menuWidth - viewportPadding
      );
      const preferredTop = placeAbove
        ? rect.top - menuGap - maxHeight
        : belowTop;
      const top = Math.min(
        Math.max(preferredTop, viewportPadding),
        window.innerHeight - maxHeight - viewportPadding
      );

      return {
        left,
        maxHeight,
        top
      };
    }

    function syncMenuStyle() {
      const nextMenuStyle = updateMenuStyle();

      if (!nextMenuStyle) {
        return;
      }

      const previousMenuStyle = lastMenuStyleRef.current;

      if (
        previousMenuStyle &&
        previousMenuStyle.left === nextMenuStyle.left &&
        previousMenuStyle.maxHeight === nextMenuStyle.maxHeight &&
        previousMenuStyle.top === nextMenuStyle.top
      ) {
        return;
      }

      lastMenuStyleRef.current = nextMenuStyle;
      setMenuStyle(nextMenuStyle);
    }

    let animationFrameId = 0;

    function trackAnchorPosition() {
      syncMenuStyle();
      animationFrameId = window.requestAnimationFrame(trackAnchorPosition);
    }

    trackAnchorPosition();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [anchorRef]);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const activeCommand = commandRefs.current[activeIndex];

    if (!menu || !activeCommand) {
      return;
    }

    if (activeIndex === 0) {
      menu.scrollTop = 0;
      return;
    }

    const menuTop = menu.getBoundingClientRect().top;
    const commandTop = activeCommand.getBoundingClientRect().top;
    const offsetTop = commandTop - menuTop + menu.scrollTop;

    menu.scrollTop = offsetTop;
  }, [activeIndex, commands.length]);

  return (
    <div
      className="fixed z-20 w-80 overflow-y-auto overflow-x-hidden rounded-md border border-border bg-popover p-1"
      ref={menuRef}
      role="listbox"
      style={menuStyle ?? undefined}
    >
      <div className="px-2 pb-1 pt-1.5 text-[11px] font-medium text-muted-foreground">
        Basic blocks
      </div>
      {commands.length === 0 ? (
        <div className="px-2 py-2 text-sm text-muted-foreground">
          No matching blocks
        </div>
      ) : (
        commands.map((command, index) => {
          const Icon = command.icon;
          const isActive = index === activeIndex;

          return (
            <button
              aria-selected={isActive}
              className={`flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left text-sm transition-colors ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-popover-foreground hover:bg-accent/70"
              }`}
              key={command.type}
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(command);
              }}
              onMouseEnter={() => onActiveIndexChange(index)}
              ref={(element) => {
                commandRefs.current[index] = element;
              }}
              role="option"
              type="button"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-muted-foreground">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium leading-5">
                  {command.label}
                </span>
                <span className="block truncate text-xs leading-4 text-muted-foreground">
                  {command.description}
                </span>
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
