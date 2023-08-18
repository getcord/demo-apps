import { Thread, user } from '@cord-sdk/react';
import type { CSSProperties } from 'react';
import {
  useMemo,
  useRef,
  useCallback,
  useContext,
  useEffect,
  useState,
  Fragment,
} from 'react';
import type { ThreadMetadata } from '../ThreadsContext';
import { ThreadsContext } from '../ThreadsContext';

export const LOCATION = { page: 'document' };
const COMMENT_BUTTON_MARGIN_PX = 18;
const THREADS_GAP = 16;
type Coordinates = { top: number; left: number };

export function Document() {
  // The comment button is shown after user select some text.
  const [commentButtonCoords, setCommentButtonCoords] = useState<
    Coordinates | undefined
  >();
  const [threadsPositions, setThreadsPositions] = useState<Coordinates[]>([]);
  // Threads which have been rendered on screen. This is useful because
  // we initially render threads as `hidden`, because we need to know
  // their height to position them correctly.
  const [threadsReady, setThreadsReady] = useState<Set<string>>(new Set());
  const threadsRefs = useRef<HTMLDivElement[] | null>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const orgId = user.useViewerData()?.organizationID;
  const { threads, openThread, addThread, removeThread, setOpenThread } =
    useContext(ThreadsContext)!;

  // Sorted from top to bottom as they should appear on screen.
  const sortedThreads = useMemo(() => {
    return Array.from(threads).sort(
      ([_aId, { topPx: aTopPx }], [_bId, { topPx: bTopPx }]) => aTopPx - bTopPx,
    );
  }, [threads]);

  // If users comment on the same line, multiple threads would have the same
  // y (or top) coordinate. However, don't want threads to overlap, and so
  // we have to manually calculate the positions.
  // Each thread only cares about the thread above itself. And so, if
  // the above thread (top coordinate + height) is over the current thread,
  // we shift the current thread down just enough to not overlap.
  const getThreadsPositions = useCallback(() => {
    if (
      !threadsRefs.current?.length ||
      !sortedThreads.length ||
      threadsReady.size !== sortedThreads.length
    ) {
      return;
    }

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) {
      return;
    }

    const [_topThreadId, { topPx }] = sortedThreads[0];
    const newThreadPositions: Coordinates[] = [
      {
        top: topPx,
        left: containerRect.right + THREADS_GAP,
      },
    ];
    for (let i = 1; i < sortedThreads.length; i++) {
      const threadAboveIdx = i - 1;
      const threadAboveTopPx = newThreadPositions[threadAboveIdx].top;
      const threadAboveRef = threadsRefs.current[threadAboveIdx];
      const threadAboveHeight = threadAboveRef.getBoundingClientRect().height;
      const [_threadId, { topPx: currentThreadTopPx }] = sortedThreads[i];

      const shouldShiftThreadDown =
        newThreadPositions[threadAboveIdx].top +
          threadAboveHeight +
          THREADS_GAP >
        currentThreadTopPx;

      newThreadPositions[i] = {
        top: shouldShiftThreadDown
          ? threadAboveTopPx + threadAboveHeight + THREADS_GAP
          : currentThreadTopPx,
        left: containerRect.right + THREADS_GAP,
      };
    }
    return newThreadPositions;
  }, [sortedThreads, threadsReady]);

  const handleUpdateThreadPositions = useCallback(() => {
    setThreadsPositions((prev) => {
      const newPositions = getThreadsPositions();
      if (newPositions) {
        return newPositions;
      } else {
        return prev;
      }
    });
  }, [getThreadsPositions]);

  // We wil observe each thread's dimension, because if their height
  // changes, we'll want to recompute the thread positions to avoid overlapping.
  const observer = useMemo(() => {
    return new ResizeObserver(handleUpdateThreadPositions);
  }, [handleUpdateThreadPositions]);
  useEffect(() => {
    const threadPos = getThreadsPositions();
    if (threadPos) {
      setThreadsPositions(threadPos);
    }

    return () => observer.disconnect();
  }, [getThreadsPositions, observer, sortedThreads, threadsReady]);

  useEffect(() => {
    window.addEventListener('resize', handleUpdateThreadPositions);

    return () => {
      window.removeEventListener('resize', handleUpdateThreadPositions);
    };
  }, [handleUpdateThreadPositions]);

  // When users select text within the page, we want to show a
  // comment button.
  const handleSelection = useCallback(() => {
    const selection = document.getSelection();
    if (
      !selection ||
      selection.isCollapsed ||
      // Only allow selection in the document.
      !selection.anchorNode?.parentElement?.closest('#sheet') ||
      !selection.focusNode?.parentElement?.closest('#sheet')
    ) {
      setCommentButtonCoords(undefined);
      return;
    }

    if (selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const { top, left } = range.getClientRects()[0];
      setCommentButtonCoords({
        top: top + window.scrollY,
        left: left + window.scrollX,
      });
    }
  }, []);
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection);

    return () => {
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, [handleSelection]);

  // When adding a comment, we want to save enough metadata to be able to
  // then recreate a `Range`. We can leverage the `Range` to draw highlights
  // over the text, and have the browser compute their position for us.
  const addComment = useCallback(() => {
    if (!orgId) {
      throw new Error('org information not ready');
    }
    const range = window.getSelection()?.getRangeAt(0);
    if (!range) {
      return;
    }
    const { startContainer, endContainer, startOffset, endOffset } = range;
    const startElement =
      startContainer instanceof HTMLElement
        ? startContainer
        : startContainer.parentElement;
    const endElement =
      endContainer instanceof HTMLElement
        ? endContainer
        : endContainer.parentElement;

    if (!startElement || !endElement) {
      console.warn(`Couldn't add a comment: missing start and end element.`);
      return;
    }

    const metadata = {
      startNodeId: startElement.id,
      endNodeId: endElement.id,
      startOffset,
      endOffset,
      topPx: startElement.getClientRects()[0].top,
    } as const;
    const threadId = crypto.randomUUID();
    addThread(threadId, metadata);
    setOpenThread(threadId);
  }, [addThread, orgId, setOpenThread]);

  const handleRemoveThread = useCallback(
    (threadId: string) => {
      setThreadsReady((prev) => {
        const newThreads = new Set([...prev]);
        newThreads.delete(threadId);
        return newThreads;
      });
      removeThread(threadId);
      setOpenThread(null);
    },
    [removeThread, setOpenThread],
  );

  return (
    <>
      {commentButtonCoords && (
        <CommentButton coords={commentButtonCoords} onClick={addComment} />
      )}
      {/* Used to catch clicks outside the thread, and close it. */}
      <div
        className="thread-underlay"
        style={{
          display: openThread ? 'block' : 'none',
        }}
        onClick={() => setOpenThread(null)}
      />
      <div>
        {sortedThreads.map(([threadId, metadata], threadIdx) => {
          const range = getRange(metadata);
          if (!range) {
            return;
          }
          const selectionRects = [...range.getClientRects()];
          const isOpenThread = openThread === threadId;

          return (
            <Fragment key={threadId}>
              {selectionRects.map((rect, idx) => {
                const rectPosition = {
                  width: rect.width,
                  height: rect.height,
                  top: rect.top + window.scrollY,
                  left: rect.left + window.scrollX,
                  position: 'absolute',
                } as CSSProperties;
                return (
                  <Fragment key={idx}>
                    <div
                      style={{
                        ...rectPosition,
                        background: isOpenThread ? '#F5BE4D' : '#E9E469',
                        opacity: 0.6,
                        zIndex: -1,
                      }}
                    />
                    <div
                      style={{
                        ...rectPosition,
                        zIndex: 2,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        if (!isOpenThread) {
                          setOpenThread(threadId);
                        }
                      }}
                    />
                  </Fragment>
                );
              })}
              <div
                ref={(el: HTMLDivElement) => {
                  if (threadsRefs?.current && el) {
                    threadsRefs.current[threadIdx] = el;
                    observer.observe(el);
                  }
                }}
                className={isOpenThread ? 'open-thread' : undefined}
                style={{
                  position: 'absolute',
                  left:
                    (threadsPositions[threadIdx]?.left ?? 0) +
                    (isOpenThread ? -THREADS_GAP * 2 : THREADS_GAP),
                  top: (threadsPositions[threadIdx]?.top ?? 0) + window.scrollY,
                  transition: 'all 0.25s ease 0.1s',
                  transitionProperty: 'top, left',
                  visibility:
                    threadsReady.has(threadId) && threadsPositions[threadIdx]
                      ? 'visible'
                      : 'hidden',
                }}
              >
                <Thread
                  location={LOCATION}
                  threadId={threadId}
                  metadata={metadata}
                  showPlaceholder={false}
                  composerExpanded={isOpenThread}
                  autofocus={isOpenThread}
                  onFocusComposer={() => setOpenThread(threadId)}
                  onRender={() =>
                    setThreadsReady((prev) => new Set([...prev, threadId]))
                  }
                  onResolved={() => {
                    handleRemoveThread(threadId);
                  }}
                  onClose={() => {
                    setOpenThread(null);
                  }}
                  onThreadInfoChange={({ messageCount }) => {
                    if (messageCount === 0 && threadsReady.has(threadId)) {
                      handleRemoveThread(threadId);
                    }
                  }}
                />
              </div>
            </Fragment>
          );
        })}
      </div>
      <div id="sheet" ref={containerRef}>
        <h1 id="title">What can you build with Cord?</h1>
        <ul>
          <li id="item-1">
            Team chat experiences in your product -- letting your users talk to
            each other (this is absurdly easy to build with Cord)
          </li>
          <li id="item-2">AI chatbot powered by ChatGPT and other LLMs</li>
          <li id="item-3">
            Tasks integrations (for things like Jira or Asana)
          </li>
          <li id="item-4">Integrations with your existing notifications</li>
          <li id="item-5">
            Customer support UIs baked right into your own products
          </li>
          <p id="body">
            And so much more. Cord is about to launch its general availability,
            open signup in the next few weeks. We&apos;re super excited to see
            what collaborative experiences people create. 🌟🌟
          </p>
        </ul>
      </div>
    </>
  );
}

function getRange(metadata: ThreadMetadata) {
  const startElement = document.getElementById(metadata.startNodeId);
  const endElement = document.getElementById(metadata.endNodeId);

  if (!startElement || !endElement) {
    return;
  }
  const startNode = startElement.firstChild;
  const endNode = endElement.firstChild;
  if (!startNode || !endNode) {
    return;
  }
  const range = document.createRange();

  try {
    range.setStart(startNode, metadata.startOffset);
    range.setEnd(endNode, metadata.endOffset);
  } catch (error) {
    // setEnd throws if we pass an offset greater than the node length.
    // E.g. user selects 100 chars, text gets edited to only have 50 chars.
    return null;
  }

  return range;
}

function AddCommentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 2C7.79954 1.99932 5.60254 2.17455 3.43 2.524C1.993 2.756 1 4.013 1 5.426V10.573C1 11.986 1.993 13.244 3.43 13.477C4.28298 13.614 5.14007 13.7241 6 13.807V17.25C5.99993 17.3983 6.04385 17.5433 6.12619 17.6667C6.20854 17.7901 6.32561 17.8863 6.46261 17.9431C6.59962 17.9999 6.7504 18.0149 6.89589 17.986C7.04138 17.9572 7.17505 17.8858 7.28 17.781L10.859 14.201C11.0002 14.062 11.1889 13.9819 11.387 13.977C13.1235 13.9195 14.8546 13.7521 16.57 13.476C18.007 13.244 19 11.987 19 10.574V5.426C19 4.014 18.007 2.755 16.57 2.524C14.43 2.18 12.236 2 10 2ZM9.25 7.25V5H10.75V7.25H13V8.75H10.75V11H9.25V8.75H7V7.25H9.25Z"
        fill="white"
      />
    </svg>
  );
}

function CommentButton({
  coords,
  onClick,
}: {
  coords: Coordinates;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      style={{
        all: 'unset',
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        transform: `translateY(calc(-100% - ${COMMENT_BUTTON_MARGIN_PX}px))`,
        zIndex: '2',
        background: 'black',
        padding: '6px 8px',
        borderRadius: '4px',
        boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.16)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '14px',
        color: 'white',
      }}
      onClick={onClick}
    >
      <AddCommentIcon />
      Add comment
    </button>
  );
}
