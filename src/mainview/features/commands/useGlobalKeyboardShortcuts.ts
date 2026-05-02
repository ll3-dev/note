import { useEffect } from "react";
import { resolveKeybinding } from "./keybindingResolver";
import type {
  Command,
  CommandScope,
  KeybindingConfig
} from "./types";

type UseGlobalKeyboardShortcutsInput<TContext> = {
  activeScopes: CommandScope[];
  commands: Command<TContext>[];
  context: TContext;
  keybindings?: KeybindingConfig[];
};

export function useGlobalKeyboardShortcuts<TContext>({
  activeScopes,
  commands,
  context,
  keybindings
}: UseGlobalKeyboardShortcutsInput<TContext>) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const command = resolveKeybinding({
        activeScopes,
        commands,
        context,
        event,
        keybindings
      });

      if (!command) {
        return;
      }

      event.preventDefault();
      void command.run(context);
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [activeScopes, commands, context, keybindings]);
}
