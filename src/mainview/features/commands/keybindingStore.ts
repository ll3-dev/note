import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeKeybinding } from "./keybindingResolver";
import type { KeybindingConfig } from "./types";

type KeybindingState = {
  keybindings: KeybindingConfig[];
  disableCommandKeybindings: (commandId: string) => void;
  resetCommandKeybindings: (commandId: string) => void;
  setCommandKeybindings: (commandId: string, keys: string[]) => void;
};

export const useKeybindingStore = create<KeybindingState>()(
  persist(
    (set) => ({
      keybindings: [],
      disableCommandKeybindings: (commandId) =>
        set((state) => ({
          keybindings: [
            ...state.keybindings.filter((item) => item.commandId !== commandId),
            {
              commandId,
              enabled: false,
              keys: [],
              source: "user"
            }
          ]
        })),
      resetCommandKeybindings: (commandId) =>
        set((state) => ({
          keybindings: state.keybindings.filter(
            (item) => item.commandId !== commandId
          )
        })),
      setCommandKeybindings: (commandId, keys) =>
        set((state) => ({
          keybindings: [
            ...state.keybindings.filter((item) => item.commandId !== commandId),
            {
              commandId,
              enabled: true,
              keys: keys.map(normalizeKeybinding),
              source: "user"
            }
          ]
        }))
    }),
    {
      name: "note-keybindings"
    }
  )
);
