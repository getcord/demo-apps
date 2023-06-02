import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import * as React from 'react';
import { useRef, useEffect, useState } from 'react';
import Konva from 'konva';
import type { Shape } from 'konva/lib/Shape';
import type { KonvaEventObject } from 'konva/lib/Node';
import cx from 'classnames';
import {
  ThreadList,
  PagePresence,
  useCordAnnotationCaptureHandler,
  useCordAnnotationTargetRef,
  useCordAnnotationRenderer,
  useCordAnnotationClickHandler,
  beta,
  useCordThreadActivitySummary,
} from '@cord-sdk/react';
import type { HTMLCordFloatingThreadsElement } from '@cord-sdk/types';

import cordLogoSrc from '../images/cord-logo.svg';
import bulletListIconSrc from '../images/bullet-list-icon.svg';
import bulletListIconWhiteSrc from '../images/bullet-list-icon-white.svg';
import annotationPointerIconSrc from '../images/annotation-pointer-icon.svg';
import artboardSrc from '../images/artboard.svg';

export const EXAMPLE_CORD_LOCATION = {
  page: 'canvas',
};

type CanvasAnnotationLocation = {
  page: string;
  x: number;
  y: number;
};

export default function Canvas() {
  const [stage, setStage] = useState<Konva.Stage | null>(null);
  const canvasContainerRef = useCordAnnotationTargetRef<HTMLDivElement>(
    EXAMPLE_CORD_LOCATION,
  );

  useCordAnnotationCaptureHandler<CanvasAnnotationLocation>(
    EXAMPLE_CORD_LOCATION,
    (capturePosition) => {
      if (!stage) {
        console.warn('useCordAnnotationCaptureHandler: stage not initialized');
        return;
      }

      return {
        extraLocation: {
          x: (capturePosition.x - stage.x()) / stage.scaleX(),
          y: (capturePosition.y - stage.y()) / stage.scaleY(),
        },
      };
    },
  );

  useCordAnnotationClickHandler<CanvasAnnotationLocation>(
    EXAMPLE_CORD_LOCATION,
    ({ location: { x, y } }) => {
      if (!stage) {
        console.warn('useCordAnnotationCaptureHandler: stage not initialized');
        return;
      }

      stage.x(stage.width() / 2 - x);
      stage.y(stage.height() / 2 - y);
      stage.scaleX(1);
      stage.scaleY(1);
    },
  );

  const { redrawAnnotations } =
    useCordAnnotationRenderer<CanvasAnnotationLocation>(
      EXAMPLE_CORD_LOCATION,
      ({ location: { x, y } }) => {
        if (!stage) {
          console.warn('useCordAnnotationRenderer: stage not initialized');
          return;
        }

        if (!canvasContainerRef.current) {
          console.warn('useCordAnnotationRenderer: container not present');
          return;
        }

        return {
          element: canvasContainerRef.current,
          coordinates: {
            x: x * stage.scaleX() + stage.x(),
            y: y * stage.scaleY() + stage.y(),
          },
        };
      },
    );

  useEffect(() => {
    if (stage || !canvasContainerRef.current) {
      return;
    }

    const newStage = new Konva.Stage({
      container: canvasContainerRef.current,
      width: canvasContainerRef.current.clientWidth,
      height: canvasContainerRef.current.clientHeight,
      draggable: true,
    });

    const layer = new Konva.Layer();
    newStage.add(layer);

    Konva.Image.fromURL(artboardSrc, (image: Shape) => {
      image.move({
        x: window.innerWidth / 2 - image.width() / 2,
        y: window.innerHeight / 2 - image.height() / 2,
      });
      image.perfectDrawEnabled(false);
      layer.add(image);
    });

    layer.add(
      new Konva.Circle({ fill: '#0ACF83', radius: 403, x: -145, y: -30 }),
    );
    layer.add(
      new Konva.Rect({
        fill: '#FF7262',
        width: 345,
        height: 345,
        x: window.innerWidth - 250,
        y: window.innerHeight - 345,
        rotation: -30,
        cornerRadius: 24,
      }),
    );
    // Not an easter egg
    Konva.Image.fromURL(cordLogoSrc, (image: Shape) => {
      image.move({ x: -10000, y: -7500 });
      image.scale({ x: 20, y: 20 });
      image.perfectDrawEnabled(false);
      layer.add(image);
    });

    setStage(newStage);
  }, [stage, canvasContainerRef]);

  useEffect(() => {
    if (!stage) {
      return;
    }

    stage.on('wheel', ({ evt }: KonvaEventObject<WheelEvent>) => {
      evt.preventDefault();

      const isPinchToZoom = evt.ctrlKey;
      if (isPinchToZoom) {
        const scaleBy = 1.03;

        let direction = evt.deltaY > 0 ? 1 : -1;
        // When we zoom on trackpads,
        // e.evt.ctrlKey is true so in that case let's revert direction.
        if (evt.ctrlKey) {
          direction = -direction;
        }

        const oldScale = stage.scaleX();
        const newScale =
          direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

        const pointer = stage.getPointerPosition() ?? { x: 0, y: 0 };
        const mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale,
        };

        stage.scale({ x: newScale, y: newScale });
        stage.position({
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        });
      } else {
        // Just panning the canvas
        const { deltaX, deltaY } = evt;
        const { x, y } = stage.getPosition();
        stage.position({ x: x - deltaX, y: y - deltaY });
      }
    });

    stage.on('xChange yChange', () => {
      redrawAnnotations();
    });
  }, [stage, redrawAnnotations]);

  useEffect(() => {
    if (!stage) {
      return;
    }

    const preventBrowserNavigation = (e: WheelEvent) => {
      if (e.target instanceof HTMLCanvasElement) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', preventBrowserNavigation, {
      passive: false,
    });

    const resizeCanvas = () => {
      if (!canvasContainerRef.current) {
        return;
      }

      stage.size({
        width: canvasContainerRef.current.clientWidth,
        height: canvasContainerRef.current.clientHeight,
      });
    };
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('wheel', preventBrowserNavigation);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [stage, canvasContainerRef]);

  const floatingThreadsElementRef =
    useRef<HTMLCordFloatingThreadsElement | null>(null);

  return (
    <>
      <div ref={canvasContainerRef} className={'konvaCanvas'} />

      <FloatingMenu>
        <AddAnnotationButton
          setIsAnnotating={() =>
            floatingThreadsElementRef.current?.createThread()
          }
          isAnnotating={false}
        />
        <InboxButton
          onThreadClick={(threadID) => {
            floatingThreadsElementRef.current?.openThread(threadID);
          }}
        />
        <PagePresence orientation="vertical" />
      </FloatingMenu>

      <beta.FloatingThreads
        ref={floatingThreadsElementRef}
        showButton={false}
        location={EXAMPLE_CORD_LOCATION}
      />
    </>
  );
}

function InboxButton({
  onThreadClick,
}: {
  onThreadClick: (threadId: string) => void;
}) {
  const [showInbox, setShowInbox] = useState(false);
  const [hover, setHover] = useState(false);

  const activity = useCordThreadActivitySummary(EXAMPLE_CORD_LOCATION);

  const active = showInbox || hover;

  return (
    <>
      {showInbox && (
        <ThreadList
          location={EXAMPLE_CORD_LOCATION}
          onThreadClick={onThreadClick}
          className="threadListContainer"
        />
      )}

      <Button
        isActive={showInbox}
        onClick={() => setShowInbox(!showInbox)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        badgeCount={activity ? activity.total - activity.resolved : 0}
        hasUnreadThreads={activity ? activity.unread > 0 : false}
      >
        <img src={active ? bulletListIconWhiteSrc : bulletListIconSrc} />
      </Button>
    </>
  );
}

function Button({
  children,
  isActive,
  badgeCount = 0,
  hasUnreadThreads = false,
  extraStyle,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: React.PropsWithChildren<{
  isActive: boolean;
  badgeCount?: number;
  hasUnreadThreads?: boolean;
  extraStyle?: CSSProperties;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}>) {
  return (
    <div
      className="btn-wrapper"
      onClick={() => onClick()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {badgeCount > 0 && (
        <div
          className={cx({
            'btn-badge': true,
            'btn-badge-attention': hasUnreadThreads,
          })}
        >
          {badgeCount}
        </div>
      )}
      <div
        className={cx('btn', {
          'btn-active': isActive,
          'btn-inactive': !isActive,
        })}
        style={{
          ...extraStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function FloatingMenu(props: React.PropsWithChildren<unknown>) {
  return <div className="floatingMenu">{props.children}</div>;
}

function AddAnnotationButton({
  isAnnotating,
  setIsAnnotating,
}: {
  isAnnotating: boolean;
  setIsAnnotating: Dispatch<SetStateAction<boolean>>;
}) {
  const [hover, setHover] = useState(false);

  return (
    <Button
      onClick={() => setIsAnnotating(true)}
      isActive={isAnnotating}
      extraStyle={{
        backgroundColor: '#a259ff',
        borderRadius: '64px',
        opacity: hover ? '60%' : '100%',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <img src={annotationPointerIconSrc} />
    </Button>
  );
}
