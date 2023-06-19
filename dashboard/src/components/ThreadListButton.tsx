import {
  autoUpdate,
  flip,
  offset as offsetMiddleware,
  shift,
  useFloating,
} from '@floating-ui/react-dom';
import { useCallback, useMemo, useState } from 'react';
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

  const {
    x,
    y,
    strategy,
    reference: setReferenceElement,
    floating: setPopperElement,
  } = useFloating({
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    placement: 'bottom',
    middleware: [
      offsetMiddleware(0),
      shift({
        padding: 2,
      }),
      flip(),
    ],
  });

  const popperStyles = useMemo(
    () => ({
      position: strategy,
      top: y ?? '',
      left: x ?? '',
    }),
    [strategy, x, y],
  );

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
        ref={setReferenceElement}
        onClick={toggleThreadList}
      >
        <InboxIcon />
        All comments
      </button>
      {threadListOpen && (
        <div
          className="threadlist-container"
          ref={setPopperElement}
          style={popperStyles}
        >
          <ThreadList location={LOCATION} onThreadClick={handleOpenThread} />
        </div>
      )}
    </>
  );
}
