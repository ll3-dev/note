import type { BlockType } from "../../../../shared/contracts";

export function blockShellClass(type: BlockType) {
  if (type === "quote") {
    return "border-l-2 border-border pl-3";
  }

  if (type === "code") {
    return "rounded-md bg-muted px-2";
  }

  return "";
}

export function textareaClass(type: BlockType) {
  switch (type) {
    case "heading_1":
      return "text-[30px] font-bold leading-9";
    case "heading_2":
      return "text-[22px] font-semibold leading-8";
    case "code":
      return "font-mono text-[14px]";
    case "quote":
      return "text-[17px] italic";
    default:
      return "text-[15px]";
  }
}
