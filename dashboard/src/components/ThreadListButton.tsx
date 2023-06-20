import { useState, useCallback, useContext } from 'react';
import { ThreadList } from '@cord-sdk/react';
import { autoUpdate, flip, shift, useFloating } from '@floating-ui/react';
import { ThreadsContext } from '../ThreadsContext';
import { LOCATION } from './Dashboard';
import { InboxIcon } from './InboxIcon';

type Props = {
  goToThread: (threadId: string) => void;
};
export function ThreadListButton({ goToThread }: Props) {
  const [threadListOpen, setThreadListOpen] = useState(false);
  const { openThread } = useContext(ThreadsContext)!;

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
    setThreadListOpen((prev) => !prev);
  }, []);

  return (
    <>
      <button
        className="action-button"
        style={
          threadListOpen
            ? { color: '#f8f9fa', backgroundColor: '#476b9b' }
            : undefined
        }
        ref={refs.setReference}
        onClick={toggleThreadList}
      >
        <InboxIcon />
        All comments
      </button>
      {threadListOpen && (
        <div
          className="threadlist-container"
          ref={refs.setFloating}
          style={floatingStyles}
        >
          <ThreadList
            location={LOCATION}
            onThreadClick={goToThread}
            style={{ maxHeight: '400px' }}
            highlightThreadId={openThread ?? undefined}
          />
        </div>
      )}
    </>
  );
}
