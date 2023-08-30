import type { CSSProperties } from 'react';

export function TextHighlight({
  rect,
  isOpenThread,
  onClick,
}: {
  rect: DOMRect;
  isOpenThread: boolean;
  onClick: () => void;
}) {
  const rectPosition = {
    width: rect.width,
    height: rect.height,
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    position: 'absolute',
  } as CSSProperties;
  return (
    <>
      <div
        style={{
          ...rectPosition,
          background: isOpenThread ? '#F5BE4D' : '#FDF2D7',
        }}
      />
      <div
        style={{
          ...rectPosition,
          zIndex: 2,
          cursor: 'pointer',
        }}
        onClick={onClick}
      />
    </>
  );
}
