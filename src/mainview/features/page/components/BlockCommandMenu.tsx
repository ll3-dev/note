import type { BlockCommand } from "../lib/blockCommands";

type BlockCommandMenuProps = {
  activeIndex: number;
  commands: BlockCommand[];
  onActiveIndexChange: (index: number) => void;
  onSelect: (command: BlockCommand) => void;
};

export function BlockCommandMenu({
  activeIndex,
  commands,
  onActiveIndexChange,
  onSelect
}: BlockCommandMenuProps) {
  return (
    <div
      className="absolute left-8 top-10 z-20 w-65 rounded-md border border-border bg-popover p-1"
      role="listbox"
    >
      {commands.length === 0 ? (
        <div className="px-2 py-2 text-sm text-muted-foreground">
          No blocks found
        </div>
      ) : (
        commands.map((command, index) => {
          const Icon = command.icon;

          return (
            <button
              aria-selected={index === activeIndex}
              className={
                index === activeIndex
                  ? "flex w-full items-center gap-2 rounded-sm bg-accent px-2 py-1.5 text-left text-sm"
                  : "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              }
              key={command.type}
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(command);
              }}
              onMouseEnter={() => onActiveIndexChange(index)}
              role="option"
              type="button"
            >
              <Icon className="size-4 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{command.label}</span>
                <span className="block truncate text-xs text-muted-foreground">
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
