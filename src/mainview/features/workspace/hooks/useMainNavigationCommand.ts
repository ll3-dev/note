import { useEffect } from "react";

type UseMainNavigationCommandOptions = {
  navigateTabHistory: (direction: "back" | "forward") => Promise<void>;
};

export function useMainNavigationCommand({
  navigateTabHistory
}: UseMainNavigationCommandOptions) {
  useEffect(() => {
    function handleNavigationCommand(event: Event) {
      const command = (event as CustomEvent<"back" | "forward">).detail;

      if (command !== "back" && command !== "forward") {
        return;
      }

      void navigateTabHistory(command);
    }

    window.addEventListener("note-navigation-command", handleNavigationCommand);

    return () => {
      window.removeEventListener("note-navigation-command", handleNavigationCommand);
    };
  }, [navigateTabHistory]);
}
