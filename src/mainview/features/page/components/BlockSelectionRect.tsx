type BlockSelectionRectProps = {
  box: {
    height: number;
    left: number;
    top: number;
    width: number;
  } | null;
};

export function BlockSelectionRect({ box }: BlockSelectionRectProps) {
  if (!box) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed z-10 border border-transparent bg-transparent"
      style={{
        height: box.height,
        left: box.left,
        top: box.top,
        width: box.width
      }}
    />
  );
}
