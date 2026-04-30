import { htmlToMarkdown } from "./htmlMarkdown";

const MARKDOWN_FILE_EXTENSIONS = [".md", ".markdown"];
const MARKDOWN_MIME_TYPES = new Set([
  "text/markdown",
  "text/x-markdown"
]);

export function isMarkdownClipboardFile(file: Pick<File, "name" | "type">) {
  const filename = file.name.toLowerCase();

  return (
    MARKDOWN_MIME_TYPES.has(file.type) ||
    MARKDOWN_FILE_EXTENSIONS.some((extension) => filename.endsWith(extension))
  );
}

export function getMarkdownClipboardFile(files: FileList | File[]) {
  return Array.from(files).find(isMarkdownClipboardFile) ?? null;
}

export async function readMarkdownFromDataTransfer(
  dataTransfer: DataTransfer
) {
  const markdownText = dataTransfer.getData("text/markdown");

  if (markdownText) {
    return markdownText;
  }

  const markdownFile = getMarkdownClipboardFile(dataTransfer.files);

  if (markdownFile) {
    return await markdownFile.text();
  }

  const html = dataTransfer.getData("text/html");

  if (html) {
    const markdown = htmlToMarkdown(html);

    if (markdown) {
      return markdown;
    }
  }

  return dataTransfer.getData("text/plain");
}
