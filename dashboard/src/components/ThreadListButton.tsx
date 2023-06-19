import { autoUpdate, flip, shift, useFloating } from '@floating-ui/react';
import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { HTMLCordFloatingThreadsElement } from '@cord-sdk/types';
import { ThreadList } from '@cord-sdk/react';
import { InboxIcon } from './InboxIcon';
import { LOCATION } from './Dashboard';

export function ThreadListButton({
  floatingThreadsRef,
}: {
  floatingThreadsRef: MutableRefObject<HTMLCordFloatingThreadsElement | null>;
}) {
  const [threadListOpen, setThreadListOpen] = useState(false);

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

  const handleOpenThread = useCallback(
    (threadID: string) => {
      floatingThreadsRef.current?.openThread(threadID);
    },
    [floatingThreadsRef],
  );

  return (
    <>
      <button
        className="threadlist-button"
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
          <ThreadList location={LOCATION} onThreadClick={handleOpenThread} />
        </div>
      )}
    </>
  );
}
