import { createRef, useCallback, useContext, useEffect, useState } from 'react';
import cx from 'classnames';
import { Composer, Pin, Thread, ThreadedComments } from '@cord-sdk/react';
import type { Location, MessageInfo } from '@cord-sdk/types';
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
  const { removeThread, openThread, setOpenThread } =
    useContext(ThreadsContext)!;

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
    if (openThread === id) {
      setOpenThread(null);
    } else {
      setOpenThread(id);
      const video = document.querySelector('video');
      if (video instanceof HTMLVideoElement) {
        video.currentTime = metadata.timestamp;
        video.pause();
      }
    }
  }, [id, metadata.timestamp, openThread, setOpenThread]);

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
    >
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
  location,
}: {
  video: string;
  location: Location;
}) {
  const { threads, addThread, setOpenThread, openThread } =
    useContext(ThreadsContext)!;
  const [inThreadCreationMode, setInThreadCreationMode] = useState(false);
  const videoRef = createRef<HTMLVideoElement>();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const onButtonClick = useCallback(() => {
    videoRef.current!.pause();
    setInThreadCreationMode(true);
  }, [videoRef]);

  const onVideoClick = useCallback(
    (e: React.MouseEvent<HTMLVideoElement>) => {
      if (!videoRef.current) {
        return;
      }
      if (!(e.target instanceof HTMLVideoElement)) {
        return;
      }
      if (!inThreadCreationMode) {
        return;
      }
      e.preventDefault();
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const timestamp = videoRef.current.currentTime;
      const threadID = `video-thread-${x}-${y}-${timestamp}`;
      addThread(threadID, {
        xPercent: (x / rect.width) * 100,
        yPercent: (y / rect.height) * 100,
        timestamp,
      });
      setOpenThread(threadID);
      setInThreadCreationMode(false);
    },
    [inThreadCreationMode, videoRef, addThread, setOpenThread],
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
      const threadMetadata = threads.get(mi.threadId);
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

  // Effect to close open thread on ESCAPE key press and also stop thread
  // creation mode
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenThread(null);
        setInThreadCreationMode(false);
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [setInThreadCreationMode, setOpenThread]);

  return (
    <div id="video-player-demo-container">
      <div id="commentableVideo">
        <div
          id="videoWrapper"
          className={cx({ 'in-thread-mode': inThreadCreationMode })}
        >
          <video
            ref={videoRef}
            controls
            disablePictureInPicture
            controlsList="nofullscreen"
            autoPlay
            muted
            onClick={onVideoClick}
            onTimeUpdate={onVideoTimeUpdate}
            src={video}
          />
          {/* Used to catch clicks outside the thread, and close it. */}
          <div
            className="thread-underlay"
            style={{
              display: openThread !== null ? 'block' : 'none',
            }}
            onClick={() => setOpenThread(null)}
          />
          {Array.from(threads).map(([key, value]) => {
            return (
              <VideoPin
                key={key}
                id={key}
                location={location}
                metadata={value}
                currentTime={currentTime}
                duration={duration}
              />
            );
          })}
        </div>
        <div id="commentWrapper">
          <button
            id="add-comment-btn"
            type="button"
            onClick={onButtonClick}
            className={cx({ 'in-thread-mode': inThreadCreationMode })}
          >
            <svg
              width="21"
              height="20"
              viewBox="0 0 21 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3.5 10C3.5 6.13401 6.63401 3 10.5 3C14.366 3 17.5 6.13401 17.5 10C17.5 13.866 14.366 17 10.5 17H4.16667C3.79848 17 3.5 16.7015 3.5 16.3333V10Z"
                fill="currentColor"
              />
            </svg>
            Comment on a frame
          </button>
          <Composer location={location} showExpanded />
        </div>
      </div>
      <ThreadedComments
        location={location}
        composerPosition="none"
        messageOrder="newest_on_top"
        onMessageClick={onMessageClick}
      />
    </div>
  );
}

export function VideoPlayer() {
  return (
    <ThreadsProvider location={LOCATION}>
      <CommentableVideo
        video="https://cdn.cord.com/cord-Meet-the-Team.mp4"
        location={LOCATION}
      />
    </ThreadsProvider>
  );
}
