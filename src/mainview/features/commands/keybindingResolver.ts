import type {
  Command,
  CommandScope,
  KeyboardEventLike,
  KeyboardPlatform,
  KeybindingConfig
} from "./types";
import {
  eventToKeybinding,
  normalizeKeybinding
} from "./keybindingNormalizer";

export { eventToKeybinding, normalizeKeybinding };

type ResolveKeybindingInput<TContext> = {
  activeScopes: CommandScope[];
  commands: Command<TContext>[];
  context: TContext;
  event: KeyboardEventLike;
  keybindings?: KeybindingConfig[];
  platform?: KeyboardPlatform;
};

export type KeybindingConflict = {
  commandIds: string[];
  key: string;
  scope: CommandScope;
};

export function resolveKeybinding<TContext>({
  activeScopes,
  commands,
  context,
  event,
  keybindings = [],
  platform
}: ResolveKeybindingInput<TContext>): Command<TContext> | null {
  const pressed = eventToKeybinding(event, platform);

  for (const scope of [...activeScopes].reverse()) {
    const command = commands.find((candidate) => {
      if (candidate.scope !== scope) {
        return false;
      }

      const keys = getEffectiveKeybindings(candidate, keybindings);

      return (
        keys.includes(pressed) &&
        (!candidate.canRun || candidate.canRun(context))
      );
    });

    if (command) {
      return command;
    }
  }

  return null;
}

export function findKeybindingConflicts<TContext>(
  commands: Command<TContext>[],
  keybindings: KeybindingConfig[] = []
): KeybindingConflict[] {
  const bindingsByScopeAndKey = new Map<string, KeybindingConflict>();

  for (const command of commands) {
    for (const key of getEffectiveKeybindings(command, keybindings)) {
      const mapKey = `${command.scope}:${key}`;
      const conflict = bindingsByScopeAndKey.get(mapKey);

      if (conflict) {
        conflict.commandIds.push(command.id);
      } else {
        bindingsByScopeAndKey.set(mapKey, {
          commandIds: [command.id],
          key,
          scope: command.scope
        });
      }
    }
  }

  return [...bindingsByScopeAndKey.values()].filter(
    (conflict) => conflict.commandIds.length > 1
  );
}

function getEffectiveKeybindings<TContext>(
  command: Command<TContext>,
  keybindings: KeybindingConfig[]
): string[] {
  const overrides = keybindings.filter((item) => item.commandId === command.id);
  const keys =
    overrides.length > 0
      ? overrides.filter((item) => item.enabled).flatMap((item) => item.keys)
      : (command.defaultKeybindings ?? []);

  return keys.map(normalizeKeybinding);
}
