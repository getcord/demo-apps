import { v4 as uuid } from 'uuid';
import type { Stage } from 'konva/lib/Stage';

export const EXAMPLE_CORD_LOCATION = {
  page: 'canvas',
};

export type Pin = {
  threadID: string;
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

export function generatePinThreadID(
  elementName: string,
  relativeX: number,
  relativeY: number,
) {
  return `${elementName}_${roundNumber(relativeX)}_${roundNumber(
    relativeY,
  )}_${uuid()}`;
}

export function createNewPin({
  threadID,
  x,
  y,
}: {
  threadID: string;
  x: number;
  y: number;
}): Pin {
  return {
    threadID,
    x: roundNumber(x),
    y: roundNumber(y),
  };
}

function roundNumber(number: number) {
  return Number(number.toPrecision(4));
}
