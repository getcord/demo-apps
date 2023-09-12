import { createRef, useCallback, useContext, useEffect, useState } from 'react';
import cx from 'classnames';
import {
  Pin,
  Thread,
  ThreadedComments,
  thread,
  PagePresence,
  NotificationListLauncher,
} from '@cord-sdk/react';
import type { Location, MessageInfo, Point2D } from '@cord-sdk/types';
import type { ThreadMetadata } from '../ThreadsContext';
import { ThreadsProvider, ThreadsContext } from '../ThreadsContext';

const LOCATION = { page: 'video' };

function VideoPin({
  id,
  metadata,
  location,
  currentTime,
  duration,
}: {
  id: string;
  metadata: ThreadMetadata;
  location: Location;
  currentTime: number;
  duration: number;
}) {
  const { threads, removeThread, openThread, setOpenThread } =
    useContext(ThreadsContext)!;

  const [showThreadPreviewBubble, setThreadShowPreviewBubble] = useState(false);

  const displayOnControls = useCallback(
    (threadMetadata: ThreadMetadata) => {
      return (
        Math.abs(threadMetadata.timestamp - currentTime) > 1.5 &&
        openThread !== id
      );
    },
    [currentTime, openThread, id],
  );

  const onPinClick = useCallback(() => {
    const isOpenThreadEmpty =
      openThread && threads.get(openThread)?.totalMessages === 0;

    if (isOpenThreadEmpty) {
      removeThread(openThread);
    }

    // Clicking on the openThread's pin will close the thread.
    if (openThread === id) {
      setOpenThread(null);
      return;
    }

    setOpenThread(id);
    const video = document.querySelector('video');
    if (video instanceof HTMLVideoElement) {
      video.currentTime = metadata.timestamp;
      video.pause();
    }
  }, [
    id,
    metadata.timestamp,
    openThread,
    removeThread,
    setOpenThread,
    threads,
  ]);

  const getPinCSSVariables = useCallback(
    (threadMetadata: ThreadMetadata): React.CSSProperties | undefined => {
      if (!duration) {
        return undefined;
      }
      return {
        '--pin-x-percent': `${threadMetadata.xPercent}%`,
        '--pin-y-percent': `${threadMetadata.yPercent}%`,
        '--pin-time-ratio': `${threadMetadata.timestamp / duration}`,
      } as React.CSSProperties;
    },
    [duration],
  );

  /**
   * NOTE: useThreadData creates a thread if one doesn't already exists.
   * For this reason, we are passing the same `location` to it.
   * Failing to do so might result in the thread being created at the
   * default location (the current window URL)
   */
  const { firstMessage } = thread.useThreadData(id, { location });

  return (
    <Pin
      location={location}
      threadId={id}
      style={getPinCSSVariables(metadata)}
      className={cx(
        displayOnControls(metadata) ? 'pin-on-control' : 'pin-on-video',
        // Position thread based on which half of the video the pin sits in
        { ['invert-thread-position']: metadata.xPercent > 50 },
      )}
      onClick={onPinClick}
      onMouseEnter={() => setThreadShowPreviewBubble(true)}
      onMouseLeave={() => setThreadShowPreviewBubble(false)}
    >
      {showThreadPreviewBubble &&
        displayOnControls(metadata) &&
        firstMessage?.plaintext && (
          <div className="thread-preview-bubble-container">
            <p className="thread-preview-bubble">{firstMessage.plaintext}</p>
          </div>
        )}
      <Thread
        threadId={id}
        metadata={metadata}
        location={location}
        onResolved={() => removeThread(id)}
        showPlaceholder={false}
        autofocus={openThread === id}
        style={{
          display: openThread === id ? 'block' : 'none',
        }}
      />
    </Pin>
  );
}

function CommentableVideo({
  video,
  videoSubs,
  location,
}: {
  video: string;
  videoSubs: string;
  location: Location;
}) {
  const { threads, addThread, removeThread, setOpenThread, openThread } =
    useContext(ThreadsContext)!;
  const videoRef = createRef<HTMLVideoElement>();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [cursorTooltipPosition, setCursorTooltipPosition] =
    useState<Point2D | null>(null);
  const [tooltipCursorText, setTooltipCursorText] = useState<
    'Click to comment' | 'Click to resume'
  >('Click to comment');

  const handleCloseThread = useCallback(() => {
    if (!openThread) {
      return;
    }

    if (threads.get(openThread)?.totalMessages === 0) {
      removeThread(openThread);
    }
    setOpenThread(null);
  }, [openThread, removeThread, setOpenThread, threads]);

  const onVideoClick = useCallback(
    (e: React.MouseEvent<HTMLVideoElement>) => {
      if (!videoRef.current) {
        return;
      }
      if (!(e.target instanceof HTMLVideoElement)) {
        return;
      }

      if (videoRef.current.paused) {
        void videoRef.current.play();
      } else {
        videoRef.current.pause();
      }

      if (openThread) {
        handleCloseThread();
        return;
      }

      videoRef.current.pause();

      e.preventDefault();
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const timestamp = videoRef.current.currentTime;
      const threadID = `video-thread-${x}-${y}-${timestamp}`;
      addThread(
        threadID,
        {
          xPercent: (x / rect.width) * 100,
          yPercent: (y / rect.height) * 100,
          timestamp,
        },
        0,
      );
      setOpenThread(threadID);
    },
    [videoRef, openThread, addThread, setOpenThread, handleCloseThread],
  );

  const onVideoTimeUpdate = useCallback(() => {
    if (!videoRef.current) {
      return;
    }
    setCurrentTime(videoRef.current.currentTime);
    setDuration(videoRef.current.duration);
  }, [videoRef]);

  const onMessageClick = useCallback(
    (mi: MessageInfo) => {
      if (!videoRef.current) {
        return;
      }
      const threadMetadata = threads.get(mi.threadId)?.metadata;
      if (!threadMetadata) {
        console.log(`Thread ${mi.threadId} not found`);
        return;
      }

      videoRef.current.currentTime = threadMetadata.timestamp;
      videoRef.current.pause();
      window.scroll({ top: 0, behavior: 'smooth' });
      setOpenThread(mi.threadId);
    },
    [videoRef, setOpenThread, threads],
  );

  const handlePressEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseThread();
      }
    },
    [handleCloseThread],
  );

  const onVideoPlay = useCallback(() => {
    setTooltipCursorText('Click to comment');
    handleCloseThread();
  }, [handleCloseThread]);

  const onVideoPause = useCallback(() => {
    setTooltipCursorText('Click to resume');
  }, []);

  // Close open thread when users press ESCAPE
  useEffect(() => {
    document.addEventListener('keydown', handlePressEscape);
    return () => document.removeEventListener('keydown', handlePressEscape);
  }, [handlePressEscape]);

  const handleMouseMoveOnCommentableElement = useCallback(
    ({ clientX: x, clientY: y }: React.MouseEvent<HTMLVideoElement>) => {
      setCursorTooltipPosition({ x, y });
    },
    [],
  );
  const handleLeaveCommentableElement = useCallback(
    () => setCursorTooltipPosition(null),
    [],
  );

  return (
    <>
      <div id="video-player-demo-container">
        <div id="top-bar">
          <PagePresence location={location} />
          <NotificationListLauncher label="Notifications" />
        </div>
        <div id="content">
          {/* Used to catch clicks outside the thread, and close it. */}
          <div
            className="thread-underlay"
            style={{
              display: openThread !== null ? 'block' : 'none',
            }}
            onClick={handleCloseThread}
          />
          <div id="commentableVideo">
            <div id="videoWrapper">
              <video
                ref={videoRef}
                controls
                disablePictureInPicture
                controlsList="nofullscreen"
                autoPlay
                muted
                onClick={onVideoClick}
                onTimeUpdate={onVideoTimeUpdate}
                onCanPlay={onVideoTimeUpdate}
                src={video}
                onMouseMove={handleMouseMoveOnCommentableElement}
                onMouseLeave={handleLeaveCommentableElement}
                crossOrigin="anonymous"
                onPause={onVideoPause}
                onPlay={onVideoPlay}
              >
                <source src={video} type="video/mp4" />
                <track
                  default
                  kind="captions"
                  label="English captions"
                  srcLang="en"
                  src={videoSubs}
                />
              </video>
              {Array.from(threads).map(([key, { metadata }]) => {
                return (
                  <VideoPin
                    key={key}
                    id={key}
                    location={location}
                    metadata={metadata}
                    currentTime={currentTime}
                    duration={duration}
                  />
                );
              })}
            </div>
          </div>
          <ThreadedComments
            location={location}
            composerPosition="none"
            messageOrder="newest_on_top"
            onMessageClick={onMessageClick}
            highlightThreadId={openThread ?? undefined}
          />
        </div>
      </div>
      {cursorTooltipPosition && (
        <div
          className="cursor-tooltip"
          style={{
            left: `calc(16px + ${cursorTooltipPosition.x}px)`,
            top: `calc(20px + ${cursorTooltipPosition.y}px)`,
          }}
        >
          {tooltipCursorText}
        </div>
      )}
    </>
  );
}

export function VideoPlayer({
  video,
  videoSubs,
}: {
  video: string;
  videoSubs: string;
}) {
  return (
    <ThreadsProvider location={LOCATION}>
      <CommentableVideo
        video={video}
        videoSubs={videoSubs}
        location={LOCATION}
      />
    </ThreadsProvider>
  );
}
