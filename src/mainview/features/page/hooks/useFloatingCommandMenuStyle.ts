import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type RefObject
} from "react";
import { useViewportGeometrySync } from "./useViewportGeometrySync";

type MenuStyle = Pick<CSSProperties, "left" | "maxHeight" | "top">;

type UseFloatingCommandMenuStyleOptions = {
  anchorRef: RefObject<HTMLElement | null>;
};

export function useFloatingCommandMenuStyle({
  anchorRef
}: UseFloatingCommandMenuStyleOptions) {
  const lastMenuStyleRef = useRef<MenuStyle | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const syncMenuStyle = useCallback(() => {
    const anchor = anchorRef.current;
    const nextMenuStyle = anchor ? getMenuStyle(anchor) : null;

    if (
      !nextMenuStyle ||
      areMenuStylesEqual(lastMenuStyleRef.current, nextMenuStyle)
    ) {
      return;
    }

    lastMenuStyleRef.current = nextMenuStyle;
    setMenuStyle(nextMenuStyle);
  }, [anchorRef]);

  useViewportGeometrySync({
    enabled: Boolean(anchorRef.current),
    observeRef: anchorRef,
    onSync: syncMenuStyle
  });

  return menuStyle;
}

function getMenuStyle(anchor: HTMLElement): MenuStyle {
  const rect = anchor.getBoundingClientRect();
  const viewportPadding = 16;
  const menuGap = 8;
  const menuWidth = 320;
  const preferredMaxHeight = 448;
  const minimumMaxHeight = 220;
  const belowTop = rect.bottom + menuGap;
  const availableBelow = window.innerHeight - belowTop - viewportPadding;
  const availableAbove = rect.top - menuGap - viewportPadding;
  const placeAbove =
    availableBelow < minimumMaxHeight && availableAbove > availableBelow;
  const availableHeight = placeAbove ? availableAbove : availableBelow;
  const viewportMaxHeight = Math.max(96, window.innerHeight - viewportPadding * 2);
  const maxHeight = Math.min(
    preferredMaxHeight,
    viewportMaxHeight,
    Math.max(minimumMaxHeight, availableHeight)
  );
  const left = Math.min(
    Math.max(rect.left + 32, viewportPadding),
    window.innerWidth - menuWidth - viewportPadding
  );
  const preferredTop = placeAbove ? rect.top - menuGap - maxHeight : belowTop;
  const top = Math.min(
    Math.max(preferredTop, viewportPadding),
    window.innerHeight - maxHeight - viewportPadding
  );

  return { left, maxHeight, top };
}

function areMenuStylesEqual(left: MenuStyle | null, right: MenuStyle) {
  if (!left) {
    return false;
  }

  return (
    left.left === right.left &&
    left.maxHeight === right.maxHeight &&
    left.top === right.top
  );
}
