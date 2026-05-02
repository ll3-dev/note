export type NavigationDirection = "back" | "forward";

const BACK_MOUSE_BUTTON_MASK = 1n << 3n;
const FORWARD_MOUSE_BUTTON_MASK = 1n << 4n;

export function getNavigationDirectionFromMouseButtons(
  previousButtons: bigint,
  currentButtons: bigint
): NavigationDirection | null {
  if (isNewlyPressed(previousButtons, currentButtons, BACK_MOUSE_BUTTON_MASK)) {
    return "back";
  }

  if (isNewlyPressed(previousButtons, currentButtons, FORWARD_MOUSE_BUTTON_MASK)) {
    return "forward";
  }

  return null;
}

function isNewlyPressed(
  previousButtons: bigint,
  currentButtons: bigint,
  mask: bigint
) {
  return (previousButtons & mask) === 0n && (currentButtons & mask) !== 0n;
}
