import type {
  KeyboardEventLike,
  KeyboardPlatform
} from "./types";

const MODIFIER_ORDER = ["Mod", "Ctrl", "Alt", "Shift"] as const;

const KEY_ALIASES: Record<string, string> = {
  " ": "Space",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  arrowup: "ArrowUp",
  backspace: "Backspace",
  delete: "Delete",
  enter: "Enter",
  escape: "Escape",
  esc: "Escape",
  tab: "Tab"
};

export function eventToKeybinding(
  event: KeyboardEventLike,
  platform: KeyboardPlatform = detectKeyboardPlatform()
): string {
  const modifiers: string[] = [];

  if (event.metaKey && platform === "mac") {
    modifiers.push("Mod");
  } else if (event.metaKey) {
    modifiers.push("Meta");
  }

  if (event.ctrlKey && platform !== "mac") {
    modifiers.push("Mod");
  } else if (event.ctrlKey) {
    modifiers.push("Ctrl");
  }

  if (event.altKey) {
    modifiers.push("Alt");
  }

  if (event.shiftKey) {
    modifiers.push("Shift");
  }

  return normalizeKeybinding([...modifiers, event.key].join("+"));
}

export function normalizeKeybinding(value: string): string {
  const parts = value
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  const modifierSet = new Set<string>();
  const keyParts: string[] = [];

  for (const part of parts) {
    const normalized = normalizeKeyPart(part);

    if (isModifier(normalized)) {
      modifierSet.add(normalized);
    } else {
      keyParts.push(normalized);
    }
  }

  const modifiers = MODIFIER_ORDER.filter((modifier) =>
    modifierSet.has(modifier)
  );

  return [...modifiers, ...keyParts].join("+");
}

function normalizeKeyPart(value: string): string {
  const lower = value.toLowerCase();

  if (lower === "cmd" || lower === "command" || lower === "meta") {
    return "Mod";
  }

  if (lower === "mod") {
    return "Mod";
  }

  if (lower === "control" || lower === "ctrl") {
    return "Ctrl";
  }

  if (lower === "option" || lower === "alt") {
    return "Alt";
  }

  if (lower === "shift") {
    return "Shift";
  }

  if (KEY_ALIASES[lower]) {
    return KEY_ALIASES[lower];
  }

  return value.length === 1 ? value.toUpperCase() : value;
}

function isModifier(value: string): boolean {
  return (
    value === "Mod" ||
    value === "Ctrl" ||
    value === "Alt" ||
    value === "Shift"
  );
}

function detectKeyboardPlatform(): KeyboardPlatform {
  if (typeof navigator === "undefined") {
    return "mac";
  }

  const platform = navigator.platform.toLowerCase();

  if (platform.includes("mac")) {
    return "mac";
  }

  if (platform.includes("win")) {
    return "windows";
  }

  return "linux";
}
