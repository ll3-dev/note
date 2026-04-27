import type { Command, CommandScope } from "./types";

export type CommandRegistry<TContext> = {
  all: () => Command<TContext>[];
  byScope: (scope: CommandScope) => Command<TContext>[];
  get: (id: string) => Command<TContext> | null;
};

export function createCommandRegistry<TContext>(
  commands: Command<TContext>[]
): CommandRegistry<TContext> {
  const commandMap = new Map<string, Command<TContext>>();

  for (const command of commands) {
    if (commandMap.has(command.id)) {
      throw new Error(`Duplicate command id: ${command.id}`);
    }

    commandMap.set(command.id, command);
  }

  return {
    all: () => [...commandMap.values()],
    byScope: (scope) =>
      [...commandMap.values()].filter((command) => command.scope === scope),
    get: (id) => commandMap.get(id) ?? null
  };
}
