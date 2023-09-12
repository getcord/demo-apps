import { Thread, user, presence, PagePresence } from '@cord-sdk/react';
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
import { CommentButton } from './CommentButton';
import { FakeMenu } from './FakeMenuIcon';
import { FloatingPresence } from './FloatingPresence';
import { TextHighlight } from './TextHighlight';

export const LOCATION = { page: 'document' };
const THREADS_GAP = 16;
export type Coordinates = { top: number; left: number };

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

  const userData = user.useViewerData();
  const orgId = userData?.organizationID;
  const userId = userData?.id;
  const { threads, openThread, addThread, removeThread, setOpenThread } =
    useContext(ThreadsContext)!;

  // Sorted from top to bottom as they should appear on screen.
  const sortedThreads = useMemo(() => {
    return Array.from(threads).sort(
      ([_aId, { metadata: metadataA }], [_bId, { metadata: metadataB }]) =>
        (getRange(metadataA)?.getBoundingClientRect().top ?? 0) -
        (getRange(metadataB)?.getBoundingClientRect().top ?? 0),
    );
  }, [threads]);

  // If users comment on the same line, multiple threads would have the same
  // y (or top) coordinate. However, don't want threads to overlap, and so
  // we have to manually calculate the positions.
  // Each thread only cares about the thread above itself. And so, if
  // the above thread (top coordinate + height) is over the current thread,
  // we shift the current thread down just enough to not overlap.
  const getThreadsPositions = useCallback(() => {
    if (!threadsRefs.current?.length || !sortedThreads.length) {
      return;
    }

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) {
      return;
    }

    const [_topThreadId, { metadata }] = sortedThreads[0];
    const newThreadPositions: Coordinates[] = [
      {
        top: getTopPxFromMetadata(metadata),
        left: containerRect.right + THREADS_GAP,
      },
    ];
    for (let i = 1; i < sortedThreads.length; i++) {
      const threadAboveIdx = i - 1;
      const threadAboveTopPx = newThreadPositions[threadAboveIdx].top;
      const threadAboveRef = threadsRefs.current[threadAboveIdx];
      const threadAboveHeight = threadAboveRef.getBoundingClientRect().height;
      const [_threadId, { metadata: currentThreadMetadata }] = sortedThreads[i];

      const currentThreadTopPx = getTopPxFromMetadata(currentThreadMetadata);

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

    // When users open a thread, scroll all the threads upwards,
    // such that the open thread sits next to the commented line.
    if (openThread) {
      const openThreadIdx = sortedThreads.findIndex(
        ([threadId]) => threadId === openThread,
      )!;
      const openThreadInitialTopPx = getTopPxFromMetadata(
        sortedThreads[openThreadIdx][1].metadata,
      );
      const openThreadShiftedTopPx = newThreadPositions[openThreadIdx].top;

      if (openThreadInitialTopPx - openThreadShiftedTopPx < 0) {
        const amountShifted = openThreadInitialTopPx - openThreadShiftedTopPx;

        for (const threadPosition of newThreadPositions) {
          threadPosition.top += amountShifted;
        }
      }
    }

    return newThreadPositions;
  }, [openThread, sortedThreads]);

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
        top: top,
        left: left,
      });
    }
  }, []);
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection);

    return () => {
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, [handleSelection]);

  const presentUsers = presence.useLocationData(LOCATION, {
    partial_match: true,
    exclude_durable: true,
  });

  // When users hover on an element, we mark them as present
  // on that element, and mark them as absent from everywhere else.
  const handleMouseOver = useCallback(
    (e: MouseEvent) => {
      if (!window.CordSDK) {
        return;
      }

      const toElement = e.target;
      if (
        !toElement ||
        !(toElement instanceof HTMLElement) ||
        !toElement.id.length ||
        toElement.id === 'sheet'
      ) {
        return;
      }

      void window.CordSDK.presence.setPresent({
        ...LOCATION,
        elementId: toElement.id,
      });

      const currUserPresence = presentUsers?.find((u) => u.id === userId);
      if (currUserPresence?.ephemeral.locations.length) {
        for (const location of currUserPresence.ephemeral.locations) {
          if (location.elementId === toElement.id) {
            continue;
          }
          void window.CordSDK.presence.setPresent(
            {
              ...LOCATION,
              elementId: location.elementId,
            },
            { absent: true },
          );
        }
      }
    },
    [presentUsers, userId],
  );

  useEffect(() => {
    const { current: sheet } = containerRef;
    if (!sheet) {
      return;
    }

    sheet.addEventListener('mouseover', handleMouseOver);

    return () => {
      sheet.removeEventListener('mouseover', handleMouseOver);
    };
  }, [handleMouseOver]);

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
    } as const;
    const threadId = crypto.randomUUID();
    addThread(threadId, metadata, 0);
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

  const handleClickEsc = useCallback(
    (e: KeyboardEvent) => {
      if (!openThread || e.key !== 'Escape') {
        return;
      }

      if (openThread && threads.get(openThread)?.totalMessages === 0) {
        handleRemoveThread(openThread);
      } else {
        setOpenThread(null);
      }
    },
    [handleRemoveThread, openThread, setOpenThread, threads],
  );
  useEffect(() => {
    document.addEventListener('keydown', handleClickEsc);

    return () => {
      document.removeEventListener('keydown', handleClickEsc);
    };
  }, [handleClickEsc]);

  return (
    <>
      {commentButtonCoords && (
        <CommentButton coords={commentButtonCoords} onClick={addComment} />
      )}
      <div>
        {sortedThreads.map(([threadId, { metadata }], threadIdx) => {
          const range = getRange(metadata);
          if (!range) {
            return;
          }
          const selectionRects = [...range.getClientRects()];
          const isOpenThread = openThread === threadId;

          return (
            <Fragment key={threadId}>
              {selectionRects.map((rect, idx) => (
                <TextHighlight
                  rect={rect}
                  key={idx}
                  isOpenThread={isOpenThread}
                  onClick={() => {
                    if (!isOpenThread) {
                      setOpenThread(threadId);
                    }
                  }}
                />
              ))}
              <div
                ref={(el: HTMLDivElement) => {
                  if (threadsRefs?.current && el) {
                    threadsRefs.current[threadIdx] = el;
                    observer.observe(el);
                  }
                }}
                onClick={() => setOpenThread(threadId)}
                style={{
                  position: 'absolute',
                  left:
                    (threadsPositions[threadIdx]?.left ??
                      // Make threads slide in from the right
                      containerRef.current?.getBoundingClientRect().right ??
                      0) + (isOpenThread ? -THREADS_GAP * 2 : THREADS_GAP),
                  top:
                    threadsPositions[threadIdx]?.top ??
                    getTopPxFromMetadata(metadata),
                  transition: 'all 0.25s ease 0.1s',
                  transitionProperty: 'top, left',
                  visibility: threadsReady.has(threadId) ? 'visible' : 'hidden',
                }}
              >
                <Thread
                  location={LOCATION}
                  threadId={threadId}
                  metadata={metadata}
                  className={isOpenThread ? 'open-thread' : undefined}
                  showPlaceholder={false}
                  composerExpanded={isOpenThread}
                  autofocus={isOpenThread}
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
                    const userDeletedLastMessage =
                      messageCount === 0 && threadsReady.has(threadId);
                    if (userDeletedLastMessage) {
                      handleRemoveThread(threadId);
                    }
                  }}
                />
              </div>
            </Fragment>
          );
        })}
      </div>
      <div className="container">
        <div className="header">
          <FakeMenu />
          <PagePresence />
        </div>
        <hr />
        <div id="sheet" ref={containerRef}>
          <FloatingPresence presentUsers={presentUsers} />
          <h1 id="title">Nope, this isn&apos;t Google Docs.</h1>
          <p id="body">
            This was built with Cord, and you can add a commenting experience
            like this to your product, too.
          </p>
        </div>
      </div>
      {/* Used to catch clicks outside the thread, and close it. */}
      <div
        className="thread-underlay"
        style={{
          display: openThread ? 'block' : 'none',
        }}
        onClick={() => {
          if (openThread && threads.get(openThread)?.totalMessages === 0) {
            handleRemoveThread(openThread);
          } else {
            setOpenThread(null);
          }
        }}
      />
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

function getTopPxFromMetadata(metadata: ThreadMetadata) {
  return (
    (getRange(metadata)?.getBoundingClientRect().top ?? 0) + window.scrollY
  );
}
