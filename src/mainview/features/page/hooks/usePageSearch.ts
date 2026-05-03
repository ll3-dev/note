import { useState, useCallback } from "react";
import type { Block } from "@/shared/contracts";
import { findInBlocks, type SearchResult } from "../lib/pageSearch";

type PageSearchState = {
  active: boolean;
  activeIndex: number;
  matches: SearchResult[];
  query: string;
  replaceQuery: string;
  showReplace: boolean;
};

export function usePageSearch() {
  const [state, setState] = useState<PageSearchState>({
    active: false,
    activeIndex: 0,
    matches: [],
    query: "",
    replaceQuery: "",
    showReplace: false
  });

  const openSearch = useCallback(() => {
    setState((prev) => ({ ...prev, active: true }));
  }, []);

  const closeSearch = useCallback(() => {
    setState({
      active: false,
      activeIndex: 0,
      matches: [],
      query: "",
      replaceQuery: "",
      showReplace: false
    });
  }, []);

  const setQuery = useCallback((query: string, blocks?: Block[]) => {
    setState((prev) => {
      const matches = blocks ? findInBlocks(blocks, query) : prev.matches;
      return { ...prev, activeIndex: 0, matches, query };
    });
  }, []);

  const setReplaceQuery = useCallback((replaceQuery: string) => {
    setState((prev) => ({ ...prev, replaceQuery }));
  }, []);

  const toggleReplace = useCallback(() => {
    setState((prev) => ({ ...prev, showReplace: !prev.showReplace }));
  }, []);

  const goNext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeIndex: (prev.activeIndex + 1) % Math.max(prev.matches.length, 1)
    }));
  }, []);

  const goPrevious = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeIndex:
        (prev.activeIndex - 1 + prev.matches.length) %
        Math.max(prev.matches.length, 1)
    }));
  }, []);

  return {
    ...state,
    closeSearch,
    goNext,
    goPrevious,
    openSearch,
    setQuery,
    setReplaceQuery,
    toggleReplace
  };
}
