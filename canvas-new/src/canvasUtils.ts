import { v4 as uuid } from 'uuid';
import type { Stage } from 'konva/lib/Stage';
import type { ThreadSummary } from '@cord-sdk/types';

export const EXAMPLE_CORD_LOCATION = {
  page: 'canvas',
};

export type ThreadMetadata = {
  elementName: string;
  relativeX: number;
  relativeY: number;
};

export type CanvasThreadData = Pick<ThreadSummary, 'firstMessage' | 'total'> & {
  metadata: ThreadMetadata;
};

/**
 * x and y help us position the pins on the viewport (so when we pan, zoom, drag
 * shapes etc) where as relativeX and relativeY are purely to know the exact size
 * (at 1:1 scale) of the distance between pin position on the element.
 * That way we can calculate x, y.
 */
export type Pin = {
  threadID: string;
  thread: CanvasThreadData;
  x: number;
  y: number;
};

export type OpenThread = {
  threadID: string;
  empty: boolean;
} | null;

export function getStageData(stage: Stage) {
  const { x, y } = stage.getPosition();
  const scale = stage.scaleX();
  const stagePointerPosition = stage.getPointerPosition() ?? { x: 0, y: 0 };
  return { stageX: x, stageY: y, scale, stagePointerPosition };
}

export function createNewPin({
  threadMetadata,
  x,
  y,
}: {
  threadMetadata: ThreadMetadata;
  x: number;
  y: number;
}): Pin {
  return {
    threadID: uuid(),
    thread: {
      metadata: threadMetadata,
      firstMessage: null,
      total: 0,
    },
    x: roundNumber(x),
    y: roundNumber(y),
  };
}

function roundNumber(number: number) {
  return Number(number.toPrecision(4));
}

export function getPinFromThread(
  stage: Stage,
  thread: ThreadSummary,
): Pin | null {
  const metadata = extractDataFromThreadMetadata(thread.metadata);
  if (!metadata) {
    return null;
  }
  return computePinPosition(stage, thread.id, { ...thread, metadata }, true);
}

function extractDataFromThreadMetadata(
  metadata: ThreadSummary['metadata'],
): ThreadMetadata | null {
  if (
    !('elementName' in metadata) ||
    typeof metadata['elementName'] !== 'string'
  ) {
    return null;
  }

  if (!('relativeX' in metadata) || typeof metadata['relativeX'] !== 'number') {
    return null;
  }

  if (!('relativeY' in metadata) || typeof metadata['relativeY'] !== 'number') {
    return null;
  }

  return {
    elementName: metadata.elementName,
    relativeX: metadata.relativeX,
    relativeY: metadata.relativeY,
  };
}

export function computePinPosition(
  stage: Stage,
  threadID: string,
  thread: CanvasThreadData,
  // Including the stage means we are calculating where the new pin position
  // should be otherwise we are getting the position of the existing pin
  includeStageCoords: boolean,
): Pin | null {
  const { elementName, relativeX, relativeY } = thread.metadata;

  const { stageX, stageY, scale } = getStageData(stage);

  let pinX, pinY: number;

  if (elementName === 'stage') {
    pinX = relativeX * scale;
    pinY = relativeY * scale;
  } else {
    const node = stage.findOne(`.${elementName}`);
    if (!node) {
      return null;
    }

    const elementPosition = node.getPosition();

    pinX = (elementPosition.x + relativeX) * scale;
    pinY = (elementPosition.y + relativeY) * scale;
  }

  if (includeStageCoords) {
    pinX = pinX + stageX;
    pinY = pinY + stageY;
  }
  return {
    threadID,
    thread,
    x: pinX,
    y: pinY,
  };
}

export function updatePinPositionOnStage(stage: Stage, pin: Pin) {
  return computePinPosition(stage, pin.threadID, pin.thread, true);
}

export function getPinPositionOnStage(stage: Stage, pin: Pin) {
  return computePinPosition(stage, pin.threadID, pin.thread, false);
}

// TODO - tweak to avoid header
export function isPinInView(stage: Stage, pin: Pin) {
  const pinElement = document.getElementById(pin.threadID);

  if (!pinElement) {
    throw new Error('Pin does not exist');
  }

  // Gets position relative to the viewport
  const pinRects = pinElement?.getBoundingClientRect();

  if (!pinRects) {
    return false;
  }
  // Buffer of 50px around the left and right edges, and remove additional 300
  // for the comments list
  if (pinRects.x < 50 || pinRects.x > stage.width() - 300 + 50) {
    return false;
  }

  // Buffer of 100px on the top and bottom
  if (pinRects.y < 100 || pinRects.y > stage.height() - 100) {
    return false;
  }

  return true;
}
