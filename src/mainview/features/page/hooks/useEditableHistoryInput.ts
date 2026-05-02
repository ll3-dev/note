import { useEffect, type RefObject } from "react";

type HistoryInputType = "historyRedo" | "historyUndo";

type UseEditableHistoryInputOptions = {
  editableRef: RefObject<HTMLElement | null>;
  onHistoryInput: (inputType: HistoryInputType) => void;
};

export function useEditableHistoryInput({
  editableRef,
  onHistoryInput
}: UseEditableHistoryInputOptions) {
  useEffect(() => {
    const editable = editableRef.current;

    if (!editable) {
      return;
    }

    function handleNativeBeforeInput(event: InputEvent) {
      if (event.inputType !== "historyUndo" && event.inputType !== "historyRedo") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onHistoryInput(event.inputType);
    }

    function handleNativeKeyDown(event: globalThis.KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") {
        return;
      }

      if (document.activeElement !== editable) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      onHistoryInput(event.shiftKey ? "historyRedo" : "historyUndo");
    }

    function handleMenuHistoryCommand(event: Event) {
      if (document.activeElement !== editable) {
        return;
      }

      const command = (event as CustomEvent<"redo" | "undo">).detail;

      if (command !== "undo" && command !== "redo") {
        return;
      }

      onHistoryInput(command === "undo" ? "historyUndo" : "historyRedo");
    }

    window.addEventListener("note-history-command", handleMenuHistoryCommand);
    window.addEventListener("keydown", handleNativeKeyDown, { capture: true });
    editable.addEventListener("keydown", handleNativeKeyDown, { capture: true });
    editable.addEventListener("beforeinput", handleNativeBeforeInput, {
      capture: true
    });

    return () => {
      window.removeEventListener("note-history-command", handleMenuHistoryCommand);
      window.removeEventListener("keydown", handleNativeKeyDown, {
        capture: true
      });
      editable.removeEventListener("keydown", handleNativeKeyDown, {
        capture: true
      });
      editable.removeEventListener("beforeinput", handleNativeBeforeInput, {
        capture: true
      });
    };
  }, [editableRef, onHistoryInput]);
}
