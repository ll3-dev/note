import { useEffect, useReducer } from "react";
import type { WorkspaceTab } from "@/mainview/store/useWorkspaceStore";
import {
  getTabDropPlacement,
  type TabDropTarget
} from "@/mainview/features/workspace/lib/tabDrag";

const TAB_DRAG_START_DISTANCE = 4;

type TabDragPreview = {
  id: string;
  title: string;
  x: number;
  y: number;
};

type TabDragState =
  | { status: "idle" }
  | { originX: number; originY: number; tab: WorkspaceTab; status: "pending" }
  | { dropTarget: TabDropTarget | null; preview: TabDragPreview; status: "dragging" };

type TabDragAction =
  | { point: { x: number; y: number }; tab: WorkspaceTab; type: "press" }
  | { point: { x: number; y: number }; type: "move" }
  | { dropTarget: TabDropTarget | null; type: "target" }
  | { type: "stop" };

type UseTabDragOptions = {
  onDropTab: (sourceTabId: string, target: TabDropTarget) => void;
};

export function useTabDrag({ onDropTab }: UseTabDragOptions) {
  const [state, dispatch] = useReducer(tabDragReducer, { status: "idle" });
  const preview = state.status === "dragging" ? state.preview : null;
  const draggedTabId =
    state.status === "dragging"
      ? state.preview.id
      : state.status === "pending"
        ? state.tab.id
        : null;
  const dropTarget = state.status === "dragging" ? state.dropTarget : null;

  useEffect(() => {
    if (state.status === "idle") {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();
      dispatch({
        point: { x: event.clientX, y: event.clientY },
        type: "move"
      });

      if (state.status === "dragging") {
        dispatch({
          dropTarget: getTabDropTargetAtPoint(
            event.clientX,
            event.clientY,
            state.preview.id
          ),
          type: "target"
        });
      }
    }

    function handlePointerUp() {
      if (state.status === "dragging" && state.dropTarget) {
        onDropTab(state.preview.id, state.dropTarget);
      }

      dispatch({ type: "stop" });
    }

    function preventTextSelection(event: Event) {
      event.preventDefault();
    }

    document.body.dataset.tabDragging = "true";
    window.getSelection()?.removeAllRanges();
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    document.addEventListener("selectstart", preventTextSelection);

    return () => {
      delete document.body.dataset.tabDragging;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.removeEventListener("selectstart", preventTextSelection);
    };
  }, [onDropTab, state]);

  return {
    draggedTabId,
    dropTarget,
    preview,
    pressTab(tab: WorkspaceTab, point: { x: number; y: number }) {
      dispatch({ point, tab, type: "press" });
    },
    stopTabDrag() {
      dispatch({ type: "stop" });
    }
  };
}

function tabDragReducer(
  state: TabDragState,
  action: TabDragAction
): TabDragState {
  switch (action.type) {
    case "press":
      return {
        originX: action.point.x,
        originY: action.point.y,
        status: "pending",
        tab: action.tab
      };
    case "move":
      if (state.status === "dragging") {
        return {
          ...state,
          preview: {
            ...state.preview,
            x: action.point.x,
            y: action.point.y
          }
        };
      }

      if (state.status !== "pending") {
        return state;
      }

      if (!hasExceededDragStartDistance(state, action.point)) {
        return state;
      }

      return {
        dropTarget: null,
        preview: {
          id: state.tab.id,
          title: state.tab.title,
          x: action.point.x,
          y: action.point.y
        },
        status: "dragging"
      };
    case "target":
      return state.status === "dragging"
        ? { ...state, dropTarget: action.dropTarget }
        : state;
    case "stop":
      return { status: "idle" };
  }
}

function getTabDropTargetAtPoint(
  clientX: number,
  clientY: number,
  draggedTabId: string
) {
  const element = document
    .elementsFromPoint(clientX, clientY)
    .map((item) => item.closest<HTMLElement>("[data-workspace-tab-id]"))
    .find((item): item is HTMLElement => Boolean(item));

  if (!element || element.dataset.workspaceTabId === draggedTabId) {
    return null;
  }

  const tabId = element.dataset.workspaceTabId;

  if (!tabId) {
    return null;
  }

  return {
    placement: getTabDropPlacement(clientX, element),
    tabId
  } satisfies TabDropTarget;
}

function hasExceededDragStartDistance(
  origin: { originX: number; originY: number },
  point: { x: number; y: number }
) {
  return (
    Math.abs(point.x - origin.originX) >= TAB_DRAG_START_DISTANCE ||
    Math.abs(point.y - origin.originY) >= TAB_DRAG_START_DISTANCE
  );
}
