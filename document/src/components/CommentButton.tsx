import { AddCommentIcon } from './AddCommentIcon';
import type { Coordinates } from './Document';

const COMMENT_BUTTON_MARGIN_PX = 18;

export function CommentButton({
  coords,
  onClick,
}: {
  coords: Coordinates;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      style={{
        all: 'unset',
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        transform: `translateY(calc(-100% - ${COMMENT_BUTTON_MARGIN_PX}px))`,
        zIndex: '2',
        background: 'black',
        padding: '6px 8px',
        borderRadius: '4px',
        boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.16)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '14px',
        color: 'white',
      }}
      onClick={onClick}
    >
      <AddCommentIcon />
      Add comment
    </button>
  );
}
