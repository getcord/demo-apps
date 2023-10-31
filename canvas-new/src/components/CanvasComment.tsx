import type { ThreadReactComponentProps } from '@cord-sdk/react';
import { Thread, Avatar, Message, user } from '@cord-sdk/react';
import type { ThreadInfo } from '@cord-sdk/types';

import cx from 'classnames';

import { useCallback, useContext, useMemo } from 'react';
import { CanvasAndCommentsContext } from '../CanvasAndCommentsContext';
import { EXAMPLE_CORD_LOCATION } from '../canvasUtils/common';
import type { Pin } from '../canvasUtils/common';

type CanvasCommentType = {
  pin: Pin;
};

export function CanvasComment({ pin: { threadID, x, y } }: CanvasCommentType) {
  const userData = user.useViewerData();

  const { isPanningCanvas, openThread, setOpenThread, threads } = useContext(
    CanvasAndCommentsContext,
  )!;

  const threadData = useMemo(() => {
    const thread = threads.get(threadID);
    if (!thread) {
      throw new Error('Thread does not exist');
    }

    return thread;
  }, [threadID, threads]);

  const onThreadInfoChange: ThreadReactComponentProps['onThreadInfoChange'] =
    useCallback(
      (threadInfo: ThreadInfo) => {
        if (threadInfo.messageCount > 0 && openThread?.threadID === threadID) {
          setOpenThread({ threadID: threadID, empty: false });
        }
      },
      [openThread?.threadID, setOpenThread, threadID],
    );

  const onPinClick: React.MouseEventHandler<HTMLDivElement> =
    useCallback(() => {
      if (openThread?.threadID === threadID && !openThread.empty) {
        setOpenThread(null);
        return;
      }
      if (openThread?.threadID !== threadID) {
        setOpenThread({ threadID: threadID, empty: false });
        return;
      }
    }, [openThread, threadID, setOpenThread]);

  if (!userData || !threadData) {
    return null;
  }

  return (
    // Need the canvasComment wrapper so the pin can grow in size from the bottom
    <div
      className="canvasComment"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        // When a user is panning on the canvas we want to make sure they can pan
        // over canvas comments so we set the pointerEvents to none
        pointerEvents: isPanningCanvas ? 'none' : 'auto',
      }}
    >
      <div
        id={threadID}
        className={cx('canvasPin', {
          ['previewMessage']:
            openThread?.threadID !== threadID && threadData.thread.firstMessage,
          ['active']: openThread?.threadID === threadID,
        })}
        onClick={onPinClick}
      >
        <Avatar
          userId={
            // If a thread has no first message, we know it's the user who wants
            // to add a comment so we use their avatar
            threadData.thread.firstMessage
              ? threadData.thread.firstMessage.authorID
              : userData.id
          }
        />
        {threadData.thread.firstMessage && (
          <Message
            threadId={threadID}
            messageId={threadData.thread.firstMessage.id}
          />
        )}
      </div>
      <Thread
        location={EXAMPLE_CORD_LOCATION}
        threadId={threadID}
        metadata={threadData.thread.metadata}
        showHeader={false}
        showPlaceholder={false}
        className={cx({
          ['active']: openThread?.threadID === threadID,
          ['hidden']: openThread?.threadID !== threadID,
        })}
        onThreadInfoChange={onThreadInfoChange}
      />
    </div>
  );
}
