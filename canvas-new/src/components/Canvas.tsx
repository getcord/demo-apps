import { Stage, Layer, Rect, Circle, RegularPolygon } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import cx from 'classnames';
import { useCallback, useContext, useEffect } from 'react';
import { Pin, Thread } from '@cord-sdk/react';
import type { ThreadMetadata } from '../canvasUtils';
import {
  createNewPin,
  getStageData,
  EXAMPLE_CORD_LOCATION,
} from '../canvasUtils';
import { CanvasAndCommentsContext } from '../CanvasAndCommentsContext';

export default function Canvas() {
  const {
    threads,
    canvasStageRef,
    canvasContainerRef,
    openThread,
    setOpenThread,
    inThreadCreationMode,
    setInThreadCreationMode,
    removeThreadIfEmpty,
    addThread,
  } = useContext(CanvasAndCommentsContext)!;
  const updateCanvasSize = useCallback(() => {
    const stage = canvasStageRef.current;
    if (!canvasContainerRef.current || !stage) {
      return;
    }
    stage.size({
      width: canvasContainerRef.current.clientWidth,
      height: canvasContainerRef.current.clientHeight,
    });
  }, [canvasContainerRef, canvasStageRef]);

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

  const onStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      removeThreadIfEmpty(openThread);
      setOpenThread(null);
      if (!inThreadCreationMode) {
        return;
      }
      e.evt.preventDefault();
      e.evt.stopPropagation();

      if (!canvasStageRef.current) {
        return;
      }
      const { x: relativeX, y: relativeY } =
        e.target.getRelativePointerPosition();

      const elementPosition = e.target.getPosition();

      const { stageX, stageY, scale, stagePointerPosition } = getStageData(
        canvasStageRef.current,
      );

      const elementName = e.target.attrs.name;

      if (
        elementName !== 'circle' &&
        elementName !== 'square' &&
        elementName !== 'diamond' &&
        elementName !== 'stage'
      ) {
        return;
      }

      e.target.stopDrag();

      let x, y: number;
      if (elementName === 'stage') {
        x = stagePointerPosition.x;
        y = stagePointerPosition.y;
      } else {
        x = stageX + (elementPosition.x + relativeX) * scale;
        y = stageY + (elementPosition.y + relativeY) * scale;
      }

      const threadMetadata: ThreadMetadata = {
        relativeX,
        relativeY,
        elementName,
      };

      const pin = createNewPin({
        threadMetadata,
        x,
        y,
      });

      addThread(pin.threadID, pin);

      setOpenThread({ threadID: pin.threadID, empty: true });
      setInThreadCreationMode(false);
    },
    [
      addThread,
      canvasStageRef,
      inThreadCreationMode,
      openThread,
      removeThreadIfEmpty,
      setInThreadCreationMode,
      setOpenThread,
    ],
  );

  const onEscapePress = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInThreadCreationMode(false);
        removeThreadIfEmpty(openThread);
        setOpenThread(null);
      }
    },
    [openThread, removeThreadIfEmpty, setInThreadCreationMode, setOpenThread],
  );

  useEffect(() => {
    window.addEventListener('keydown', onEscapePress);
    return () => window.removeEventListener('keydown', onEscapePress);
  }, [onEscapePress]);

  return (
    <div
      className="canvasAndCordContainer"
      ref={canvasContainerRef}
      style={{ height: '100vh' }}
    >
      <Stage
        id="stage"
        ref={canvasStageRef}
        className={cx('canvasContainer', {
          commentingModeCursor: inThreadCreationMode,
        })}
        name="stage"
        onClick={onStageClick}
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
      <div className="canvasButtonGroup">
        <button
          type="button"
          onClick={() => {
            setInThreadCreationMode((prev) => !prev);
            removeThreadIfEmpty(openThread);
          }}
        >
          <img src={'/images/Pin.png'} alt="Chat bubble" />
          <span>{inThreadCreationMode ? 'Cancel' : 'Add Comment'}</span>
        </button>
        {/* TODO : Add comment list button */}
      </div>
      {Array.from(threads).map(([id, pin]) => (
        <Pin
          key={id}
          location={EXAMPLE_CORD_LOCATION}
          threadId={pin.threadID}
          style={{
            left: pin.x,
            top: pin.y,
            zIndex: openThread?.threadID === pin.threadID ? 1 : 0,
          }}
          onClick={() => {
            if (openThread?.threadID === pin.threadID && !openThread.empty) {
              setOpenThread(null);
              return;
            }
            if (openThread?.threadID !== pin.threadID) {
              setOpenThread({ threadID: pin.threadID, empty: false });
              removeThreadIfEmpty(openThread);
              return;
            }
          }}
        >
          <Thread
            location={EXAMPLE_CORD_LOCATION}
            threadId={pin.threadID}
            metadata={pin.threadMetadata}
            style={{
              visibility:
                openThread?.threadID === pin.threadID ? 'visible' : 'hidden',
            }}
            showHeader={false}
            showPlaceholder={false}
            onThreadInfoChange={(threadInfo) => {
              if (
                threadInfo.messageCount > 0 &&
                openThread?.threadID === pin.threadID
              ) {
                setOpenThread({ threadID: pin.threadID, empty: false });
              }
            }}
          />
        </Pin>
      ))}
    </div>
  );
}
