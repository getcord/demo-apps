import cx from 'classnames';
import { Thread } from '@cord-sdk/react';
import type { FlatJsonObject } from '@cord-sdk/types';
import { useState, useEffect, useContext } from 'react';
import type { ThreadMetadata } from '../ThreadsContext';
import { ThreadsContext } from '../ThreadsContext';

type ThreadWrapperProps = {
  forwardRef?: React.RefObject<HTMLElement | null>;
  location: FlatJsonObject;
  threadId: string;
  metadata: ThreadMetadata;
  style?: React.CSSProperties;
};

// A wrapper over cord-thread that removes itself if empty when closed
export function ThreadWrapper({
  forwardRef,
  location,
  threadId,
  metadata,
  style,
}: ThreadWrapperProps) {
  const { openThread, removeThread, setOpenThread } =
    useContext(ThreadsContext)!;
  const [numberOfMessages, setNumberOfMessages] = useState<number | undefined>(
    undefined,
  );
  const [rendered, setRendered] = useState(false);

  // Effect that removes this thread if it has no messages at the time it is closed
  useEffect(() => {
    return () => {
      if (
        rendered &&
        (numberOfMessages === undefined || numberOfMessages <= 0)
      ) {
        removeThread(threadId);
      }
    };
  }, [rendered, numberOfMessages, openThread, removeThread, threadId]);

  return (
    <Thread
      forwardRef={forwardRef}
      location={location}
      threadId={threadId}
      metadata={metadata}
      autofocus={openThread === threadId}
      className={cx({ ['open-thread']: openThread === threadId })}
      style={{
        width: '300px',
        maxHeight: '400px',
        ...style,
      }}
      onThreadInfoChange={(info) => {
        setNumberOfMessages(info.messageCount);
      }}
      onRender={() => {
        setRendered(true);
      }}
      onClose={() => setOpenThread(null)}
    />
  );
}
