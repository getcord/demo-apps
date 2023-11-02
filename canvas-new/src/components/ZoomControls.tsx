import { useCallback, useContext } from 'react';
import { CanvasAndCommentsContext } from '../CanvasAndCommentsContext';

export function ZoomControls() {
  const { canvasStageRef, recomputePinPositions, changeScale, scale } =
    useContext(CanvasAndCommentsContext)!;

  const zoom = useCallback(
    (type: 'in' | 'out') => {
      if (!canvasStageRef.current) {
        return;
      }

      const scaleBy = 1.03;
      const newScale = type === 'in' ? scale * scaleBy : scale / scaleBy;

      changeScale(newScale);
      recomputePinPositions();
    },
    [canvasStageRef, changeScale, recomputePinPositions, scale],
  );

  const zoomIn = useCallback(() => {
    zoom('in');
  }, [zoom]);
  const zoomOut = useCallback(() => {
    zoom('out');
  }, [zoom]);

  return (
    <div className="zoomControls">
      <button type="button" onClick={zoomOut}>
        -
      </button>
      <p className="scale">{(scale * 100).toFixed(0)}%</p>
      <button type="button" onClick={zoomIn}>
        +
      </button>
    </div>
  );
}
