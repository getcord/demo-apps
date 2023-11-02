import { useCallback, useContext } from 'react';
import { ThreadedComments } from '@cord-sdk/react';
import type { MessageInfo } from '@cord-sdk/types';
import { CanvasAndCommentsContext } from '../CanvasAndCommentsContext';
import { getPinPositionOnStage, isPinInView } from '../canvasUtils/pin';
import { EXAMPLE_CORD_LOCATION } from '../canvasUtils/common';

export function CanvasCommentsList() {
  const {
    threads,
    canvasStageRef,
    setOpenThread,
    recomputePinPositions,
    openThread,
  } = useContext(CanvasAndCommentsContext)!;

  const navigateToPin = useCallback(
    (messageInfo: MessageInfo) => {
      const foundPin = threads.get(messageInfo.threadId);
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
        x: stageWidth / 2,
        y: stageHeight / 2,
      };

      stage.position({
        x: stageCenter.x - pinPositionOnStage.x,
        y: stageCenter.y - pinPositionOnStage.y,
      });
      recomputePinPositions();
      setOpenThread({ threadID: foundPin.threadID, empty: false });
    },
    [threads, canvasStageRef, recomputePinPositions, setOpenThread],
  );

  return (
    <ThreadedComments
      location={EXAMPLE_CORD_LOCATION}
      composerPosition="none"
      onMessageClick={navigateToPin}
      showReplies="alwaysCollapsed"
      highlightThreadId={openThread?.threadID}
      messageOrder="newest_on_top"
    />
  );
}
