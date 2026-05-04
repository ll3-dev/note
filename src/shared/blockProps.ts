import type { BlockProps } from "./contracts";

export function areBlockPropsEqual(
  left: BlockProps | undefined,
  right: BlockProps | undefined
) {
  const leftProps = left ?? {};
  const rightProps = right ?? {};
  const leftKeys = Object.keys(leftProps);
  const rightKeys = Object.keys(rightProps);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(rightProps, key)) {
      return false;
    }

    if (!areBlockPropValuesEqual(leftProps[key], rightProps[key])) {
      return false;
    }
  }

  return true;
}

function areBlockPropValuesEqual(left: unknown, right: unknown) {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return areInlineMarkArraysEqual(left, right);
  }

  return false;
}

function areInlineMarkArraysEqual(left: unknown[], right: unknown[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((leftMark, index) =>
    areInlineMarksEqual(leftMark, right[index])
  );
}

function areInlineMarksEqual(left: unknown, right: unknown) {
  if (!left || !right || typeof left !== "object" || typeof right !== "object") {
    return false;
  }

  const leftMark = left as Record<string, unknown>;
  const rightMark = right as Record<string, unknown>;

  return (
    leftMark.start === rightMark.start &&
    leftMark.end === rightMark.end &&
    leftMark.type === rightMark.type &&
    leftMark.href === rightMark.href &&
    leftMark.pageId === rightMark.pageId
  );
}
