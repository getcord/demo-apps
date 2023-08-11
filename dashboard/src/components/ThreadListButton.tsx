import { useCallback, useContext } from 'react';
import { ThreadedComments } from '@cord-sdk/react';
import { autoUpdate, flip, shift, useFloating } from '@floating-ui/react';
import { ThreadsContext } from '../ThreadsContext';
import { LOCATION } from './Dashboard';
import { InboxIcon } from './InboxIcon';

type Props = {
  open: boolean;
  setOpen: (f: (v: boolean) => boolean) => void;
};
export function ThreadedCommentsButton({ open, setOpen }: Props) {
  const { openThread, setRequestToOpenThread } = useContext(ThreadsContext)!;

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
        className="action-button"
        style={
          open ? { color: '#f8f9fa', backgroundColor: '#476b9b' } : undefined
        }
        ref={refs.setReference}
        onClick={toggleThreadedComments}
        type="button"
      >
        <InboxIcon />
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
