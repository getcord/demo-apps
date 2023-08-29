import { Stage, Layer, Rect, Circle, RegularPolygon } from 'react-konva';
import type { Stage as StageType } from 'konva/lib/Stage';

import { useCallback, useEffect, useRef } from 'react';

export const EXAMPLE_CORD_LOCATION = {
  page: 'canvas',
};

export default function Canvas() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasStageRef = useRef<StageType>(null);

  const updateCanvasSize = useCallback(() => {
    const stage = canvasStageRef.current;
    if (!canvasContainerRef.current || !stage) {
      return;
    }
    stage.size({
      width: canvasContainerRef.current.clientWidth,
      height: canvasContainerRef.current.clientHeight,
    });
  }, []);

  useEffect(() => {
    // Sets the canvas stage initially
    updateCanvasSize();
  }, [updateCanvasSize]);

  useEffect(() => {
    // When window resizes, resize canvas
    window.addEventListener('resize', updateCanvasSize);
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [updateCanvasSize]);

  useEffect(() => {
    const preventBrowserNavigation = (e: WheelEvent) => {
      if (e.target instanceof HTMLCanvasElement) {
        e.preventDefault();
      }
    };
    window.addEventListener('wheel', preventBrowserNavigation, {
      passive: false,
    });
    return window.removeEventListener('wheel', preventBrowserNavigation);
  }, []);

  return (
    <div
      className="canvasAndCordContainer"
      ref={canvasContainerRef}
      style={{ height: '100vh' }}
    >
      <Stage
        id="stage"
        ref={canvasStageRef}
        className="canvasContainer"
        name="stage"
      >
        <Layer>
          <Circle radius={60} fill="#0ACF83" x={380} y={410} name="circle" />
          <Rect
            fill={'#1ABCFE'}
            width={120}
            height={120}
            x={180}
            y={200}
            name="square"
          />
          <RegularPolygon
            sides={4}
            fill={'#FF7262'}
            radius={85}
            x={480}
            y={100}
            name="diamond"
          />
        </Layer>
      </Stage>
    </div>
  );
}
