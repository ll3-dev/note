export type CommandScope =
  | "global"
  | "workspace"
  | "editor"
  | "block"
  | "commandMenu"
  | "input";

export type KeyboardPlatform = "mac" | "windows" | "linux";

export type KeyboardEventLike = {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
};

export type Command<TContext> = {
  id: string;
  title: string;
  scope: CommandScope;
  defaultKeybindings?: string[];
  canRun?: (context: TContext) => boolean;
  run: (context: TContext) => void | Promise<void>;
};

export type KeybindingConfig = {
  commandId: string;
  enabled: boolean;
  keys: string[];
  source: "default" | "user";
};
