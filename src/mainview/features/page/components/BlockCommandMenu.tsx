import type { BlockCommand } from "../lib/blockCommands";

type BlockCommandMenuProps = {
  commands: BlockCommand[];
  onSelect: (command: BlockCommand) => void;
};

export function BlockCommandMenu({
  commands,
  onSelect
}: BlockCommandMenuProps) {
  return (
    <div className="absolute left-8 top-10 z-20 w-65 rounded-md border border-border bg-popover p-1">
      {commands.length === 0 ? (
        <div className="px-2 py-2 text-sm text-muted-foreground">
          No blocks found
        </div>
      ) : (
        commands.map((command) => {
          const Icon = command.icon;

          return (
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              key={command.type}
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(command);
              }}
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
