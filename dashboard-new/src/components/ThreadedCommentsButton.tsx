import { useCallback, useContext } from 'react';
import { ThreadedComments } from '@cord-sdk/react';
import cx from 'classnames';

import { autoUpdate, flip, shift, useFloating } from '@floating-ui/react';
import { ThreadsContext } from '../ThreadsContext';
import { LOCATION } from './Dashboard';
import { CommentsIcon } from './CommentsIcon';

type Props = {
  open: boolean;
  setOpen: (f: (v: boolean) => boolean) => void;
};
export function ThreadedCommentsButton({ open, setOpen }: Props) {
  const { openThread, setRequestToOpenThread, threads } =
    useContext(ThreadsContext)!;

  const { refs, floatingStyles } = useFloating({
    whileElementsMounted: autoUpdate,
    placement: 'bottom',
    transform: false,
    middleware: [
      shift({
        padding: 2,
      }),
      flip(),
    ],
  });

  const toggleThreadedComments = useCallback(() => {
    setOpen((prev) => !prev);
  }, [setOpen]);

  const handleClickMessage = useCallback(
    ({ threadId }: { threadId: string | null; messageId: string | null }) => {
      setRequestToOpenThread(threadId);
    },
    [setRequestToOpenThread],
  );

  return (
    <>
      <button
        className={cx('action-button', { ['disabled']: threads.size === 0 })}
        style={open ? { backgroundColor: '#6a6b6c' } : undefined}
        ref={refs.setReference}
        onClick={toggleThreadedComments}
        type="button"
      >
        <CommentsIcon />
        All comments
      </button>
      {open && (
        <div
          className="threadlist-container"
          ref={refs.setFloating}
          style={floatingStyles}
        >
          <ThreadedComments
            location={LOCATION}
            onMessageClick={handleClickMessage}
            composerPosition="none"
            highlightThreadId={openThread ?? undefined}
          />
        </div>
      )}
    </>
  );
}
