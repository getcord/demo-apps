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

/**
 * x and y help us position the pins on the viewport (so when we pan, zoom, drag
 * shapes etc) where as relativeX and relativeY are purely to know the exact size
 * (at 1:1 scale) of the distance between pin position on the element.
 * That way we can calculate x, y.
 */
export type Pin = {
  threadID: string;
  threadMetadata: ThreadMetadata;
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
    threadMetadata,
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
  return computePinPosition(stage, thread.id, metadata);
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
  metadata: ThreadMetadata,
): Pin | null {
  const { elementName, relativeX, relativeY } = metadata;

  const { stageX, stageY, scale } = getStageData(stage);

  if (elementName === 'stage') {
    return {
      threadID,
      threadMetadata: metadata,
      x: stageX + relativeX * scale,
      y: stageY + relativeY * scale,
    };
  } else {
    const node = stage.findOne(`.${elementName}`);
    if (!node) {
      return null;
    }

    const elementPosition = node.getPosition();

    return {
      threadID,
      threadMetadata: metadata,
      x: stageX + (elementPosition.x + relativeX) * scale,
      y: stageY + (elementPosition.y + relativeY) * scale,
    };
  }
}
