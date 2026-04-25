export function EmptyEditorState({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {isLoading ? "Loading workspace..." : "Select or create a page."}
    </div>
  );
}
