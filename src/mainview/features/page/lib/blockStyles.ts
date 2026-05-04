import type { BlockType } from "@/shared/contracts";

export function blockShellClass(type: BlockType) {
  if (type === "quote") {
    return "border-l-2 border-border pl-3";
  }

  if (type === "code") {
    return "rounded-md bg-muted px-2";
  }

  return "";
}

export function editableClass(type: BlockType) {
  switch (type) {
    case "heading_1":
      return "text-[30px] font-bold leading-9";
    case "heading_2":
      return "text-[22px] font-semibold leading-8";
    case "heading_3":
      return "text-[18px] font-semibold leading-7";
    case "code":
      return "font-mono text-[14px]";
    case "quote":
      return "text-[17px] italic";
    case "toggle":
      return "font-medium text-[15px]";
    case "callout":
      return "text-[15px]";
    default:
      return "text-[15px]";
  }
}
