import { Thread, user, presence, PagePresence } from '@cord-sdk/react';
import React, {
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
import { AnimatedText } from './AnimatedText';

export const LOCATION = { page: 'document' };
const THREADS_GAP = 16;
export type Coordinates = { top: number; left: number };

/**
 * A GDocs clone, powered by Cord.
 */
export function Document() {
  // The comment button is shown after user select some text.
  const [commentButtonCoords, setCommentButtonCoords] = useState<
    Coordinates | undefined
  >();
  // Threads are positioned to the right of the text, just like in GDocs.
  const [threadsPositions, setThreadsPositions] = useState<Coordinates[]>([]);
  // Threads which have been rendered on screen. This is useful because
  // we initially render threads as `hidden`, because we need to know
  // their height to position them correctly.
  const [threadsReady, setThreadsReady] = useState<Set<string>>(new Set());
  const threadsRefs = useRef<(HTMLDivElement | undefined)[] | null>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // NOTE: This is used only for the typing effect in cord.com demos.
  // Feel free to ignore/get rid of this part.
  const [animatingElementIndex, setAnimatingElementIndex] = useState(0);
  const [finishedTextAnimation, setFinishedTextAnimation] = useState(false);
  const handleStartAnimatingNextElement = useCallback(
    () => setAnimatingElementIndex((prev) => prev + 1),
    [],
  );

  // We want the sheet to grow as tall as needed, so
  // that threads can never go outside of it.
  const infiniteScrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const handleUpdateContainerHeight = useCallback(() => {
    const bottomMostThread =
      threadsRefs.current?.[threadsRefs.current?.length - 1];
    setContainerHeight(
      window.scrollY + (bottomMostThread?.getBoundingClientRect()?.bottom ?? 0),
    );
  }, []);
  useEffect(() => {
    window.addEventListener('scroll', handleUpdateContainerHeight);
    return () =>
      window.removeEventListener('scroll', handleUpdateContainerHeight);
  }, [handleUpdateContainerHeight]);

  const userData = user.useViewerData();
  const orgId = userData?.organizationID;
  const { threads, openThread, addThread, removeThread, setOpenThread } =
    useContext(ThreadsContext)!;
  const [isEditing, setIsEditing] = useState(false);

  // Sorted from top to bottom as they should appear on screen.
  const sortedThreads = useMemo(() => {
    // We want to recompute this when the finishedTextAnimation,
    // because the content of the page changes based on that.
    // You can remove the next line.
    finishedTextAnimation;
    return Array.from(threads).sort(
      ([_aId, { metadata: metadataA }], [_bId, { metadata: metadataB }]) =>
        (getRange(metadataA)?.getBoundingClientRect().top ?? 0) -
        (getRange(metadataB)?.getBoundingClientRect().top ?? 0),
    );
  }, [threads, finishedTextAnimation]);

  // If users comment on the same line, multiple threads would have the same
  // y (or top) coordinate. However, we don't want threads to overlap, and so
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
      const threadAboveHeight =
        threadAboveRef?.getBoundingClientRect().height ?? 0;
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

  // Resizing the window should re-adjust the threads' positions
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
      // Only allow selection in the sheet.
      !selection.anchorNode?.parentElement?.closest('#sheet') ||
      !selection.focusNode?.parentElement?.closest('#sheet')
    ) {
      setCommentButtonCoords(undefined);
      return;
    }

    const hasSelectedText = selection.toString().trim().length > 0;
    if (hasSelectedText) {
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
  // We do so by checking the element.id.
  const handleMouseOver = useCallback((e: MouseEvent) => {
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

    void window.CordSDK.presence.setPresent(
      {
        ...LOCATION,
        elementId: toElement.id,
      },
      // This makes a user present only in one place within LOCATION.
      // E.g. when hovering the title, the user will be marked absent
      // everywhere else.
      { exclusive_within: LOCATION },
    );
  }, []);

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
      // For simplicity, we've added an id to our elements. This
      // makes it easy to retrieve the HTMLElement when we need to render
      // the threads on screen.
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

  // Improving the UX: Clicking Escape should close the currently open thread.
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
                onClick={() => {
                  setOpenThread(threadId);
                  // Threads grow vertically. Very long threads might get
                  // far away from the sheet's content, in which case, move them up!
                  const isBottomThreadTooFarDown =
                    threadsPositions[threadsPositions.length - 1].top >
                    window.innerHeight;
                  if (isBottomThreadTooFarDown) {
                    window.scrollTo({ top: 0 });
                  }
                }}
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
                  transition: 'all 0.5s ease 0.1s',
                  transitionProperty: 'top, left',
                  // The first time the thread gets rendered it's `hidden`, but
                  // it has the right height. Once we know its height, we mark it
                  // as ready, and we can correctly compute the position of the  thread
                  //  below it.
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
                  // When editing a message and focusing an open thread,
                  // we don't want the main composer of the thread to
                  // steal the focus from the editing composer.
                  autofocus={isOpenThread && !isEditing}
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
                  onMessageEditStart={() => {
                    setOpenThread(threadId);
                    setIsEditing(true);
                  }}
                  onMessageEditEnd={() => setIsEditing(false)}
                />
              </div>
            </Fragment>
          );
        })}
      </div>
      <div
        className="container"
        ref={infiniteScrollContainerRef}
        style={{ height: containerHeight }}
      >
        <div className="header">
          <FakeMenu />
          <PagePresence location={LOCATION} />
        </div>
        <hr />
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
        {/* The actual contents of the sheet. If you're planning on building your own,
        you can safely remove AnimatedText. The key requirement for every element is to have an ID.
        E.g. <h1 id="title">My Shiny App</h1><p id="content">My Shiny content</p> will work. */}
        <div id="sheet" ref={containerRef}>
          <FloatingPresence presentUsers={presentUsers} />
          <h1 id="title">
            <AnimatedText
              typingUser="Albert"
              animate={!document.hidden && animatingElementIndex === 0}
              text="Looks like Google Docs, right?"
              onComplete={handleStartAnimatingNextElement}
            />
          </h1>
          <p id="p1">
            <AnimatedText
              typingUser="Albert"
              animate={!document.hidden && animatingElementIndex === 1}
              text="We built this commenting experience with Cord's SDK, and you
              can, too 👍"
              onComplete={handleStartAnimatingNextElement}
            />
          </p>
          <p id="p2">
            <AnimatedText
              typingUser="Albert"
              animate={!document.hidden && animatingElementIndex === 2}
              text="Go on, give it a try! Don't worry, your comments won't be visible to anyone else visiting the site."
              onComplete={() => setFinishedTextAnimation(true)}
            />
          </p>
        </div>
      </div>
    </>
  );
}

/**
 * Given ThreadMetadata, build a Range. This is very useful to
 * render the highlight over the text, by leveraging native browser
 * APIs.
 */
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

/**
 * Helper function that adds the window.scrollY, to correctly account for
 * vertical scroll when comparing the y/top coordinate.
 */
function getTopPxFromMetadata(metadata: ThreadMetadata) {
  return (
    (getRange(metadata)?.getBoundingClientRect().top ?? 0) + window.scrollY
  );
}
