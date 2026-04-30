import { type RefObject, useLayoutEffect, useRef } from "react";
import type { BlockCommand } from "@/mainview/features/page/lib/blockCommands";
import { useFloatingCommandMenuStyle } from "@/mainview/features/page/hooks/useFloatingCommandMenuStyle";

type BlockCommandMenuProps = {
  activeIndex: number;
  anchorRef: RefObject<HTMLElement | null>;
  commands: BlockCommand[];
  onActiveIndexChange: (index: number) => void;
  onSelect: (command: BlockCommand) => Promise<void> | void;
};

export function BlockCommandMenu({
  activeIndex,
  anchorRef,
  commands,
  onActiveIndexChange,
  onSelect
}: BlockCommandMenuProps) {
  const commandRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuStyle = useFloatingCommandMenuStyle({ anchorRef });

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
        Blocks and actions
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
              key={command.id}
              onMouseDown={(event) => {
                event.preventDefault();
                void onSelect(command);
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
