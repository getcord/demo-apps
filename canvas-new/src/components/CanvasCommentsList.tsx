import { useCallback, useContext, useMemo } from 'react';
import { Message } from '@cord-sdk/react';
import cx from 'classnames';
import { CanvasAndCommentsContext } from '../CanvasAndCommentsContext';
import { getPinPositionOnStage, isPinInView } from '../canvasUtils';

// Also a css variable in the index.css
const COMMENTS_LIST_WIDTH = 300;

export function CanvasCommentsList() {
  const {
    threads,
    openThread,
    canvasStageRef,
    setOpenThread,
    recomputePinPositions,
  } = useContext(CanvasAndCommentsContext)!;

  const navigateToPin = useCallback(
    (threadID: string) => {
      const foundPin = threads.get(threadID);

      if (!foundPin) {
        console.warn('Could not find pin on the page');
        return;
      }

      if (!canvasStageRef.current) {
        return;
      }

      const stage = canvasStageRef.current;

      // check if pin is already in view - if so then we open the thread
      if (isPinInView(stage, foundPin)) {
        setOpenThread({ threadID: foundPin.threadID, empty: false });
        return;
      }

      // Pin is not in view so we have to move the stage and pin to show it
      const stageHeight = stage.height();
      const stageWidth = stage.width();

      // Get Shape Position or Stage Position
      const pinPositionOnStage = getPinPositionOnStage(stage, foundPin);

      if (!pinPositionOnStage) {
        return;
      }

      const stageCenter = {
        x: (stageWidth - COMMENTS_LIST_WIDTH) / 2, // Ignore the comments list as well
        y: stageHeight / 2,
      };

      stage.position({
        x: stageCenter.x - pinPositionOnStage.x,
        y: stageCenter.y - pinPositionOnStage.y,
      });
      recomputePinPositions();
      setOpenThread({ threadID: foundPin.threadID, empty: false });
    },
    [canvasStageRef, setOpenThread, threads, recomputePinPositions],
  );

  const threadsInfo = useMemo(() => {
    return Array.from(threads);
  }, [threads]);

  return (
    <>
      {threadsInfo.length === 0 ? (
        <p className="empty">No comments</p>
      ) : (
        threadsInfo.map(([id, cordThread]) => {
          if (cordThread?.thread.firstMessage) {
            const { total, firstMessage } = cordThread.thread;
            return (
              <div
                className={cx('messageContainer', {
                  openThread: openThread?.threadID === id,
                })}
                key={id}
                onClick={() => navigateToPin(id)}
              >
                <Message threadId={id} messageId={firstMessage?.id} />
                {total > 1 && (
                  <div className="commentReplies">
                    {total - 1 === 1 ? '1 reply' : `${total - 1} replies`}
                  </div>
                )}
                <hr />
              </div>
            );
          } else {
            return null;
          }
        })
      )}
    </>
  );
}
