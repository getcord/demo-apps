import { useCallback, useContext } from 'react';
import { ThreadList } from '@cord-sdk/react';
import { autoUpdate, flip, shift, useFloating } from '@floating-ui/react';
import { ThreadsContext } from '../ThreadsContext';
import { LOCATION } from './Dashboard';
import { InboxIcon } from './InboxIcon';

type Props = {
  open: boolean;
  setOpen: (f: (v: boolean) => boolean) => void;
};
export function ThreadListButton({ open, setOpen }: Props) {
  const { openThread, setRequestToOpenThread } = useContext(ThreadsContext)!;

  const { refs, floatingStyles } = useFloating({
    whileElementsMounted: autoUpdate,
    placement: 'bottom',
    middleware: [
      shift({
        padding: 2,
      }),
      flip(),
    ],
  });

  const toggleThreadList = useCallback(() => {
    setOpen((prev) => !prev);
  }, [setOpen]);

  return (
    <>
      <button
        className="action-button"
        style={
          open ? { color: '#f8f9fa', backgroundColor: '#476b9b' } : undefined
        }
        ref={refs.setReference}
        onClick={toggleThreadList}
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
          <ThreadList
            location={LOCATION}
            onThreadClick={setRequestToOpenThread}
            style={{ maxHeight: '400px' }}
            highlightThreadId={openThread ?? undefined}
          />
        </div>
      )}
    </>
  );
}
