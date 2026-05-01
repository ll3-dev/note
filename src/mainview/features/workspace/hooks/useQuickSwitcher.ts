import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SearchWorkspaceResult } from "@/shared/contracts";
import { noteApi } from "@/mainview/lib/rpc";
import { queryKeys } from "@/mainview/lib/queryClient";

export function useQuickSwitcher({
  onSelectResult
}: {
  onSelectResult: (result: SearchWorkspaceResult) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const searchQuery = useQuery({
    enabled: isOpen && query.trim().length > 0,
    queryKey: queryKeys.workspaceSearch(query.trim()),
    queryFn: () => noteApi.searchWorkspace({ query, limit: 12 })
  });

  const results = searchQuery.data ?? [];

  function openQuickSwitcher() {
    setIsOpen(true);
    setActiveIndex(0);
  }

  function closeQuickSwitcher() {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setActiveIndex(0);
  }

  function selectResult(result: SearchWorkspaceResult) {
    onSelectResult(result);
    closeQuickSwitcher();
  }

  return {
    activeIndex,
    closeQuickSwitcher,
    isOpen,
    openQuickSwitcher,
    query,
    results,
    selectResult,
    setActiveIndex,
    updateQuery
  };
}
