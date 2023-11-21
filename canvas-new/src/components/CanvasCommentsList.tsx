import { useCallback, useContext } from 'react';
import { ThreadedComments } from '@cord-sdk/react';
import type { MessageInfo } from '@cord-sdk/types';
import type { Stage } from 'konva/lib/Stage';
import { CanvasAndCommentsContext } from '../CanvasAndCommentsContext';
import {
  getPinElementOnStage,
  getPinPositionOnStage,
  isPinInView,
} from '../canvasUtils/pin';
import {
  EXAMPLE_CORD_LOCATION,
  GROUPED_PINS_CLASS_NAME,
} from '../canvasUtils/common';
import { expandGroupedPins } from '../canvasUtils/groupedPins';

function getStageCenter(stage: Stage) {
  return {
    x: stage.width() / 2,
    y: stage.height() / 2,
  };
}

export function CanvasCommentsList() {
  const {
    threads,
    canvasStageRef,
    setOpenThread,
    recomputePinPositions,
    openThread,
    zoomAndCenter,
  } = useContext(CanvasAndCommentsContext)!;

  const navigateToGroupPin = useCallback(
    (pinElement: Element, stage: Stage) => {
      const groupedPinsThreadIDs = pinElement.id.split('/');

      const pinsInGroup = Array.from(threads)
        .filter(([id]) => groupedPinsThreadIDs.includes(id))
        .map(([_, pinThread]) => pinThread);
      const { newStagePosition, newScale } = expandGroupedPins(
        stage,
        pinsInGroup,
        getStageCenter(stage),
      );
      zoomAndCenter(newScale, newStagePosition, true);
    },
    [threads, zoomAndCenter],
  );

  const navigateToPin = useCallback(
    (messageInfo: MessageInfo) => {
      const stage = canvasStageRef.current;
      if (!stage) {
        return;
      }

      const foundPin = threads.get(messageInfo.threadId);
      if (!foundPin) {
        console.warn('Could not find pin on the page');
        return;
      }

      const pinElement = getPinElementOnStage(messageInfo.threadId);
      if (!pinElement) {
        console.warn('Could not find pin on the page');
        return;
      }
      const isGroupPin = pinElement?.classList.contains(
        GROUPED_PINS_CLASS_NAME,
      );

      // check if pin is already in view - if so then we open the thread
      if (isPinInView(stage, pinElement) && !isGroupPin) {
        setOpenThread({ threadID: messageInfo.threadId, empty: false });
        return;
      }

      if (isGroupPin) {
        navigateToGroupPin(pinElement, stage);
      } else {
        const pinPositionOnStage = getPinPositionOnStage(stage, foundPin);

        if (!pinPositionOnStage) {
          return;
        }

        const stageCenter = getStageCenter(stage);
        canvasStageRef.current.to({
          x: stageCenter.x - pinPositionOnStage.x,
          y: stageCenter.y - pinPositionOnStage.y,
          duration: 0.2,
          onUpdate: () => {
            recomputePinPositions();
          },
          onFinish: () => {
            setOpenThread({ threadID: foundPin.threadID, empty: false });
          },
        });
      }
    },
    [
      threads,
      canvasStageRef,
      recomputePinPositions,
      setOpenThread,
      navigateToGroupPin,
    ],
  );

  return (
    <ThreadedComments
      location={EXAMPLE_CORD_LOCATION}
      composerPosition="none"
      onMessageClick={navigateToPin}
      showReplies="alwaysCollapsed"
      highlightThreadId={openThread?.threadID}
      messageOrder="newest_on_top"
      displayResolved="tabbed"
    />
  );
}
