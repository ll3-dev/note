export function normalizeLinkHref(href: string) {
  const normalized = href.trim().slice(0, 2048);

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("mailto:") ||
    normalized.startsWith("/") ||
    normalized.startsWith("#")
  ) {
    return normalized;
  }

  return "";
}
