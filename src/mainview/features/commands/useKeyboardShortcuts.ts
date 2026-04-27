import type { KeyboardEvent } from "react";
import { resolveKeybinding } from "./keybindingResolver";
import type {
  Command,
  CommandScope,
  KeybindingConfig
} from "./types";

type ShortcutContext<TContext> = TContext & {
  event: KeyboardEvent<HTMLElement>;
};

type UseKeyboardShortcutsInput<TContext> = {
  activeScopes: CommandScope[];
  commands: Command<ShortcutContext<TContext>>[];
  context: TContext;
  keybindings?: KeybindingConfig[];
};

export function useKeyboardShortcuts<TContext>({
  activeScopes,
  commands,
  context,
  keybindings
}: UseKeyboardShortcutsInput<TContext>) {
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const command = resolveKeybinding({
      activeScopes,
      commands,
      context: { ...context, event },
      event,
      keybindings
    });

    if (!command) {
      return;
    }

    event.preventDefault();
    void command.run({ ...context, event });
  }

  return { handleKeyDown };
}
