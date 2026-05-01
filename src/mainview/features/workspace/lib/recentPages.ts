import type { Page } from "@/shared/contracts";

export function getRecentPages(pages: Page[], limit: number) {
  return [...pages]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit);
}
