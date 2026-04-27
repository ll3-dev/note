type BlockDropIndicatorProps = {
  isDropAfter: boolean;
  isDropBefore: boolean;
};

export function BlockDropIndicator({
  isDropAfter,
  isDropBefore
}: BlockDropIndicatorProps) {
  return (
    <>
      {isDropBefore ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-full bg-foreground" />
      ) : null}
      {isDropAfter ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-foreground" />
      ) : null}
    </>
  );
}
