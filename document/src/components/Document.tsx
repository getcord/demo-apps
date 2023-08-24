import { Thread, user, presence, Avatar } from '@cord-sdk/react';
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
const AVATARS_GAP = 12;
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

  const userData = user.useViewerData();
  const orgId = userData?.organizationID;
  const userId = userData?.id;
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
                        background: isOpenThread ? '#F5BE4D' : '#FDF2D7',
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
                  top: threadsPositions[threadIdx]?.top ?? 0,
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
      <div className="container">
        <FakeMenu />
        <hr />
        <div id="sheet" ref={containerRef}>
          {presentUsers?.map((u, idx) => {
            const { locations } = u.ephemeral;
            // We made it so user can only be at one location at a time.
            const elementId = (locations?.[0]?.elementId ?? '') as string;
            return (
              <Avatar
                key={u.id}
                userId={u.id}
                style={{
                  position: 'absolute',
                  top: document
                    .getElementById(elementId)
                    ?.getBoundingClientRect().top,
                  left: `${
                    (document.getElementById(elementId)?.getBoundingClientRect()
                      .left ?? 0) -
                    AVATARS_GAP * 2 - // Move it to the left of the text
                    idx * AVATARS_GAP // Move each avatar a bit more to the left
                  }px`,
                  zIndex: 1,
                  transition: 'top  0.25s ease 0.1s',
                  visibility:
                    !elementId || locations.length <= 0 ? 'hidden' : 'visible',
                }}
              />
            );
          })}
          <h1 id="title">What can you build with Cord?</h1>
          <ul>
            <li id="item-1">
              Team chat experiences in your product -- letting your users talk
              to each other (this is absurdly easy to build with Cord)
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
              And so much more. Cord is about to launch its general
              availability, open signup in the next few weeks. We&apos;re super
              excited to see what collaborative experiences people create. 🌟🌟
            </p>
          </ul>
        </div>
      </div>
      {/* Used to catch clicks outside the thread, and close it. */}
      <div
        className="thread-underlay"
        style={{
          display: openThread ? 'block' : 'none',
        }}
        onClick={() => setOpenThread(null)}
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

function FakeMenu() {
  return (
    <svg width="446" height="43" fill="none" xmlns="http://www.w3.org/2000/svg">
      <mask
        id="a"
        mask="mask-type:alpha"
        maskUnits="userSpaceOnUse"
        x="0"
        y="4"
        width="24"
        height="35"
      >
        <path
          d="M0 6.5a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v30a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-30Z"
          fill="#2684FC"
        />
      </mask>
      <g mask="url(#a)">
        <path d="M0 4.5h15L19.5 9l4.5 4.5v25H0v-34Z" fill="#2684FC" />
      </g>
      <path fill="#fff" d="M5 17.5h14v2H5zM5 22.5h14v2H5zM5 27.5h10v2H5z" />
      <path d="M15 4.5 19.5 9l4.5 4.5h-9v-9Z" fill="#005FCC" />
      <path
        d="M43.948 16h-2.672l.018-1.38h2.654c.914 0 1.676-.19 2.285-.571a3.57 3.57 0 0 0 1.372-1.617c.31-.698.465-1.512.465-2.444v-.782c0-.732-.088-1.383-.263-1.951-.176-.574-.434-1.058-.774-1.45-.34-.399-.756-.7-1.248-.906-.486-.205-1.046-.307-1.679-.307h-2.882V3.203h2.882c.838 0 1.603.14 2.294.422a4.932 4.932 0 0 1 1.785 1.204c.503.522.89 1.154 1.16 1.899.27.738.404 1.57.404 2.496v.764c0 .926-.135 1.761-.404 2.505a5.228 5.228 0 0 1-1.17 1.89 5.102 5.102 0 0 1-1.827 1.204c-.71.275-1.51.413-2.4.413ZM42.182 3.203V16h-1.697V3.203h1.697Zm9.44 8.148v-.203c0-.685.099-1.32.298-1.907.2-.592.486-1.104.861-1.538.375-.44.83-.78 1.363-1.02.533-.245 1.13-.369 1.793-.369.668 0 1.268.123 1.801.37.54.24.996.58 1.371 1.02.381.433.671.945.87 1.537.2.586.3 1.222.3 1.907v.203c0 .685-.1 1.32-.3 1.907-.199.586-.489 1.098-.87 1.538-.375.434-.829.773-1.362 1.02-.527.24-1.125.36-1.793.36-.668 0-1.269-.12-1.802-.36a4.077 4.077 0 0 1-1.37-1.02 4.645 4.645 0 0 1-.862-1.538 5.89 5.89 0 0 1-.299-1.907Zm1.625-.203v.203c0 .474.056.922.167 1.344.111.416.278.785.501 1.108.229.322.513.577.853.764.34.182.735.273 1.186.273.445 0 .835-.091 1.169-.273.34-.187.621-.442.844-.764a3.54 3.54 0 0 0 .5-1.108c.118-.422.177-.87.177-1.344v-.203c0-.468-.059-.91-.176-1.327a3.42 3.42 0 0 0-.51-1.116 2.422 2.422 0 0 0-.844-.773c-.334-.188-.726-.282-1.177-.282-.446 0-.838.094-1.178.282a2.53 2.53 0 0 0-.844.773 3.53 3.53 0 0 0-.5 1.116 5.112 5.112 0 0 0-.168 1.327Zm12.876 3.692c.387 0 .744-.08 1.072-.238.328-.158.598-.375.809-.65.21-.281.331-.6.36-.958h1.547a2.9 2.9 0 0 1-.571 1.573 3.9 3.9 0 0 1-1.362 1.17c-.563.292-1.181.439-1.855.439-.715 0-1.339-.126-1.872-.378a3.71 3.71 0 0 1-1.318-1.037 4.633 4.633 0 0 1-.783-1.512 6.38 6.38 0 0 1-.255-1.82v-.369c0-.638.085-1.242.255-1.81a4.62 4.62 0 0 1 .783-1.52 3.71 3.71 0 0 1 1.318-1.038c.533-.252 1.157-.378 1.872-.378.744 0 1.395.153 1.951.457.557.3.993.71 1.31 1.231.322.516.498 1.102.527 1.758h-1.547a2.343 2.343 0 0 0-.334-1.064 2.082 2.082 0 0 0-.773-.756c-.322-.193-.7-.29-1.134-.29-.498 0-.917.1-1.257.3-.334.193-.6.456-.8.79a3.692 3.692 0 0 0-.422 1.099 6.044 6.044 0 0 0-.122 1.221v.37c0 .416.04.826.123 1.23.082.405.22.77.413 1.099.199.328.465.592.8.79.34.194.761.29 1.265.29Zm11.153-1.363a1.37 1.37 0 0 0-.158-.65c-.1-.205-.307-.39-.624-.554-.31-.17-.78-.316-1.406-.439a11.138 11.138 0 0 1-1.433-.396 4.346 4.346 0 0 1-1.08-.553 2.322 2.322 0 0 1-.678-.765 2.132 2.132 0 0 1-.237-1.028c0-.375.082-.73.246-1.064.17-.334.407-.63.712-.887a3.46 3.46 0 0 1 1.116-.607c.434-.146.917-.22 1.45-.22.762 0 1.413.135 1.952.405.539.27.952.63 1.239 1.08.287.446.43.941.43 1.486H77.18c0-.264-.08-.518-.238-.764a1.751 1.751 0 0 0-.676-.625c-.293-.164-.654-.246-1.081-.246-.452 0-.818.07-1.1.211-.274.135-.477.308-.605.519a1.305 1.305 0 0 0-.097 1.142c.064.135.176.261.334.378.158.112.38.217.668.317.287.1.653.199 1.098.299.78.175 1.421.386 1.925.632.504.247.88.548 1.125.906.246.357.37.79.37 1.3a2.534 2.534 0 0 1-1.01 2.04c-.324.246-.71.439-1.162.58a5.18 5.18 0 0 1-1.502.202c-.838 0-1.547-.15-2.127-.448-.58-.3-1.02-.686-1.319-1.16a2.776 2.776 0 0 1-.448-1.503h1.635c.023.445.152.8.386 1.063.235.258.522.442.862.554.34.105.676.158 1.01.158.446 0 .818-.059 1.117-.176.304-.117.536-.278.694-.483a1.12 1.12 0 0 0 .237-.704Zm13.764 0c0-.234-.053-.45-.158-.65-.1-.205-.308-.39-.624-.554-.31-.17-.78-.316-1.406-.439a11.144 11.144 0 0 1-1.433-.396 4.347 4.347 0 0 1-1.081-.553 2.322 2.322 0 0 1-.677-.765 2.132 2.132 0 0 1-.237-1.028c0-.375.082-.73.246-1.064.17-.334.407-.63.712-.887.31-.258.682-.46 1.116-.607.434-.146.917-.22 1.45-.22.762 0 1.412.135 1.951.405.54.27.953.63 1.24 1.08.287.446.43.941.43 1.486h-1.626c0-.264-.079-.518-.237-.764a1.752 1.752 0 0 0-.677-.625c-.293-.164-.653-.246-1.08-.246-.452 0-.818.07-1.1.211-.275.135-.477.308-.606.519a1.305 1.305 0 0 0-.096 1.142c.064.135.175.261.334.378.158.112.38.217.667.317.288.1.654.199 1.1.299.778.175 1.42.386 1.924.632.504.247.879.548 1.125.906.246.357.369.79.369 1.3a2.534 2.534 0 0 1-1.01 2.04c-.323.246-.71.439-1.16.58a5.181 5.181 0 0 1-1.504.202c-.838 0-1.547-.15-2.127-.448-.58-.3-1.02-.686-1.318-1.16a2.775 2.775 0 0 1-.448-1.503h1.634c.024.445.153.8.387 1.063.234.258.522.442.861.554.34.105.677.158 1.011.158.445 0 .818-.059 1.116-.176.305-.117.536-.278.695-.483a1.12 1.12 0 0 0 .237-.704Zm7.743-6.987v1.248h-5.141V6.49h5.141ZM95.382 4.18h1.626v9.466c0 .322.05.565.15.729.099.164.228.272.386.325a1.6 1.6 0 0 0 .51.08c.135 0 .275-.012.422-.036.152-.03.266-.053.342-.07l.01 1.327c-.13.041-.3.08-.51.114a3.878 3.878 0 0 1-.748.062c-.398 0-.764-.08-1.098-.237-.334-.159-.6-.422-.8-.791-.194-.375-.29-.88-.29-1.512V4.179Zm7.98 10.837 2.646-8.526h1.74l-3.814 10.978a5.991 5.991 0 0 1-.352.756 3.62 3.62 0 0 1-.545.782 2.6 2.6 0 0 1-.808.598c-.311.158-.683.237-1.117.237-.129 0-.293-.018-.492-.053a4.827 4.827 0 0 1-.422-.088l-.009-1.318c.047.006.121.012.22.017.106.012.179.018.22.018.369 0 .683-.05.94-.15.258-.093.475-.254.651-.483.181-.223.337-.53.466-.923l.676-1.845ZM101.42 6.49l2.47 7.383.422 1.714-1.169.598-3.499-9.695h1.776Zm9.562-3.99V16h-1.634V2.5h1.634Zm6.557 13.676a4.678 4.678 0 0 1-1.802-.334 4.09 4.09 0 0 1-1.38-.958 4.272 4.272 0 0 1-.878-1.46 5.33 5.33 0 0 1-.308-1.845v-.369c0-.774.114-1.462.343-2.065a4.62 4.62 0 0 1 .931-1.547 3.996 3.996 0 0 1 1.336-.958 3.838 3.838 0 0 1 1.547-.326c.68 0 1.266.118 1.758.352a3.21 3.21 0 0 1 1.222.984c.316.416.55.909.703 1.477.152.562.228 1.178.228 1.846v.73h-7.101v-1.328h5.475v-.123a4.052 4.052 0 0 0-.263-1.23 2.212 2.212 0 0 0-.704-.985c-.322-.258-.761-.387-1.318-.387a2.21 2.21 0 0 0-1.819.923 3.444 3.444 0 0 0-.519 1.116 5.66 5.66 0 0 0-.184 1.521v.37c0 .45.061.875.184 1.274.129.392.314.738.554 1.037.246.299.542.533.888.703.351.17.75.255 1.195.255.574 0 1.061-.118 1.459-.352a3.621 3.621 0 0 0 1.046-.94l.984.782c-.205.31-.466.606-.782.888-.316.28-.706.51-1.169.685-.457.176-.999.264-1.626.264Zm13.869-1.336c.387 0 .744-.08 1.072-.238.329-.158.598-.375.809-.65.211-.281.331-.6.36-.958h1.547a2.894 2.894 0 0 1-.571 1.573c-.346.48-.8.87-1.362 1.17a3.956 3.956 0 0 1-1.855.439c-.715 0-1.339-.126-1.872-.378a3.708 3.708 0 0 1-1.318-1.037 4.611 4.611 0 0 1-.782-1.512 6.376 6.376 0 0 1-.255-1.82v-.369c0-.638.085-1.242.255-1.81a4.599 4.599 0 0 1 .782-1.52c.351-.44.791-.786 1.318-1.038.533-.252 1.157-.378 1.872-.378.744 0 1.395.153 1.951.457a3.35 3.35 0 0 1 1.31 1.231c.322.516.498 1.102.527 1.758h-1.547a2.331 2.331 0 0 0-.334-1.064 2.078 2.078 0 0 0-.773-.756c-.322-.193-.7-.29-1.134-.29-.498 0-.917.1-1.257.3-.334.193-.6.456-.799.79a3.679 3.679 0 0 0-.422 1.099 6.044 6.044 0 0 0-.123 1.221v.37c0 .416.041.826.123 1.23.082.405.219.77.413 1.099.199.328.466.592.8.79.339.194.761.29 1.265.29Zm5.186-3.49v-.202c0-.685.099-1.32.299-1.907a4.528 4.528 0 0 1 .861-1.538c.375-.44.829-.78 1.362-1.02.533-.245 1.131-.369 1.793-.369.668 0 1.269.123 1.802.37.539.24.996.58 1.371 1.02.381.433.671.945.87 1.537.199.586.299 1.222.299 1.907v.203c0 .685-.1 1.32-.299 1.907a4.557 4.557 0 0 1-.87 1.538 3.987 3.987 0 0 1-1.362 1.02c-.528.24-1.125.36-1.793.36-.668 0-1.269-.12-1.802-.36a4.08 4.08 0 0 1-1.371-1.02 4.641 4.641 0 0 1-.861-1.538 5.868 5.868 0 0 1-.299-1.907Zm1.626-.202v.203c0 .474.055.922.167 1.344.111.416.278.785.501 1.108.228.322.512.577.852.764.34.182.736.273 1.187.273.445 0 .835-.091 1.169-.273.34-.187.621-.442.843-.764.223-.323.39-.692.501-1.108.118-.422.176-.87.176-1.344v-.203c0-.468-.058-.91-.176-1.327a3.42 3.42 0 0 0-.509-1.116 2.425 2.425 0 0 0-.844-.773c-.334-.188-.727-.282-1.178-.282a2.4 2.4 0 0 0-1.178.282 2.522 2.522 0 0 0-.843.773c-.223.322-.39.694-.501 1.116a5.087 5.087 0 0 0-.167 1.327Zm10.687-2.768V16h-1.635V6.49h1.547l.088 1.89Zm-.334 2.505-.756-.027c.006-.65.091-1.25.255-1.801.164-.557.407-1.04.73-1.45.322-.41.723-.727 1.204-.95.48-.228 1.037-.343 1.67-.343.445 0 .855.065 1.23.194.375.123.7.32.976.589.275.27.489.615.641 1.037.153.422.229.931.229 1.53V16h-1.626V9.742c0-.498-.085-.896-.255-1.195a1.455 1.455 0 0 0-.703-.65 2.537 2.537 0 0 0-1.072-.211c-.481 0-.882.085-1.204.254-.323.17-.58.405-.774.704a3.178 3.178 0 0 0-.422 1.028c-.082.38-.123.785-.123 1.213Zm6.161-.897-1.089.334c.005-.521.09-1.022.254-1.503.17-.48.413-.908.73-1.283.322-.375.718-.67 1.186-.888.469-.222 1.005-.334 1.609-.334.51 0 .961.068 1.353.203.399.134.733.342 1.002.624a2.6 2.6 0 0 1 .624 1.063c.141.434.211.95.211 1.547V16h-1.635V9.733c0-.533-.084-.946-.254-1.239a1.328 1.328 0 0 0-.704-.624c-.298-.123-.656-.184-1.072-.184-.357 0-.674.061-.949.184a1.96 1.96 0 0 0-.694.51c-.188.21-.331.454-.431.73a2.702 2.702 0 0 0-.141.878Zm9.958-1.608V16h-1.634V6.49h1.546l.088 1.89Zm-.334 2.505-.755-.027c.005-.65.09-1.25.254-1.801a4.28 4.28 0 0 1 .73-1.45c.322-.41.724-.727 1.204-.95.48-.228 1.037-.343 1.67-.343.445 0 .855.065 1.23.194.375.123.701.32.976.589.275.27.489.615.642 1.037.152.422.228.931.228 1.53V16h-1.626V9.742c0-.498-.085-.896-.255-1.195a1.455 1.455 0 0 0-.703-.65 2.537 2.537 0 0 0-1.072-.211c-.481 0-.882.085-1.204.254-.323.17-.58.405-.774.704a3.178 3.178 0 0 0-.422 1.028c-.082.38-.123.785-.123 1.213Zm6.162-.897-1.09.334a4.793 4.793 0 0 1 .255-1.503c.169-.48.413-.908.729-1.283a3.45 3.45 0 0 1 1.187-.888c.468-.222 1.004-.334 1.608-.334.51 0 .961.068 1.353.203.399.134.733.342 1.002.624a2.6 2.6 0 0 1 .624 1.063c.141.434.211.95.211 1.547V16h-1.634V9.733c0-.533-.085-.946-.255-1.239a1.33 1.33 0 0 0-.703-.624c-.299-.123-.657-.184-1.073-.184-.357 0-.673.061-.949.184a1.96 1.96 0 0 0-.694.51c-.188.21-.331.454-.431.73-.094.275-.14.568-.14.878Zm12.287 6.188a4.678 4.678 0 0 1-1.802-.334 4.09 4.09 0 0 1-1.38-.958 4.259 4.259 0 0 1-.879-1.46 5.353 5.353 0 0 1-.308-1.845v-.369c0-.774.115-1.462.343-2.065.229-.61.539-1.125.932-1.547a3.986 3.986 0 0 1 1.336-.958 3.835 3.835 0 0 1 1.547-.326c.679 0 1.265.118 1.758.352a3.2 3.2 0 0 1 1.221.984c.317.416.551.909.703 1.477.153.562.229 1.178.229 1.846v.73h-7.102v-1.328h5.476v-.123a4.053 4.053 0 0 0-.264-1.23 2.21 2.21 0 0 0-.703-.985c-.322-.258-.762-.387-1.318-.387a2.217 2.217 0 0 0-1.82.923 3.464 3.464 0 0 0-.518 1.116c-.123.44-.185.947-.185 1.521v.37c0 .45.062.875.185 1.274.129.392.313.738.554 1.037.246.299.542.533.887.703.352.17.75.255 1.196.255.574 0 1.06-.118 1.459-.352a3.605 3.605 0 0 0 1.045-.94l.985.782c-.205.31-.466.606-.782.888a3.74 3.74 0 0 1-1.169.685c-.457.176-.999.264-1.626.264Zm7.224-7.655V16h-1.626V6.49h1.538l.088 2.03Zm-.386 2.364-.677-.027a5.71 5.71 0 0 1 .29-1.801c.187-.557.451-1.04.791-1.45a3.524 3.524 0 0 1 2.786-1.293c.469 0 .891.065 1.266.194.375.123.694.322.958.597.269.276.474.633.615 1.073.14.433.211.964.211 1.59V16h-1.635V9.751c0-.498-.073-.897-.22-1.195a1.349 1.349 0 0 0-.641-.66c-.282-.14-.627-.21-1.037-.21-.405 0-.774.085-1.108.254-.328.17-.612.405-.852.704a3.529 3.529 0 0 0-.554 1.028c-.129.38-.193.785-.193 1.213Zm12.691-4.395v1.248h-5.142V6.49h5.142Zm-3.401-2.311h1.626v9.466c0 .322.049.565.149.729.1.164.228.272.387.325.158.053.328.08.509.08.135 0 .276-.012.422-.036.153-.03.267-.053.343-.07L202.38 16c-.129.041-.299.08-.51.114a3.876 3.876 0 0 1-.747.062c-.398 0-.765-.08-1.099-.237-.334-.159-.6-.422-.799-.791-.194-.375-.29-.88-.29-1.512V4.179Zm7.075 2.311V16h-1.635V6.49h1.635Zm-1.758-2.522c0-.264.079-.487.237-.668.164-.182.405-.273.721-.273.311 0 .548.091.712.273.17.181.255.404.255.668a.919.919 0 0 1-.255.65c-.164.176-.401.264-.712.264-.316 0-.557-.088-.721-.264a.958.958 0 0 1-.237-.65Zm5.994 4.553V16h-1.626V6.49h1.538l.088 2.03Zm-.387 2.364-.676-.027c.005-.65.102-1.25.29-1.801.187-.557.451-1.04.791-1.45a3.524 3.524 0 0 1 2.786-1.293c.469 0 .89.065 1.265.194.375.123.695.322.958.597.27.276.475.633.616 1.073.14.433.211.964.211 1.59V16h-1.635V9.751c0-.498-.073-.897-.22-1.195a1.349 1.349 0 0 0-.641-.66c-.282-.14-.627-.21-1.038-.21-.404 0-.773.085-1.107.254a2.66 2.66 0 0 0-.853.704 3.55 3.55 0 0 0-.553 1.028c-.129.38-.194.785-.194 1.213ZM224.73 6.49h1.477v9.308c0 .838-.17 1.553-.51 2.144a3.318 3.318 0 0 1-1.424 1.345c-.603.31-1.3.466-2.091.466-.328 0-.715-.053-1.161-.158a4.67 4.67 0 0 1-1.3-.519 3.25 3.25 0 0 1-1.064-.975l.853-.967c.398.48.814.814 1.248 1.002.439.187.873.281 1.301.281.515 0 .961-.097 1.336-.29.375-.193.665-.48.87-.861.211-.375.316-.838.316-1.389V8.582l.149-2.092Zm-6.547 4.86v-.184c0-.726.085-1.386.255-1.978.175-.597.424-1.11.747-1.538a3.35 3.35 0 0 1 1.186-.984 3.414 3.414 0 0 1 1.565-.352c.597 0 1.119.106 1.564.317.451.205.832.507 1.143.905.316.393.565.867.747 1.424.181.557.307 1.186.378 1.89v.808a8.34 8.34 0 0 1-.378 1.881 4.453 4.453 0 0 1-.747 1.424 3.134 3.134 0 0 1-1.143.905c-.451.205-.979.308-1.582.308-.568 0-1.084-.12-1.547-.36a3.522 3.522 0 0 1-1.178-1.011 4.773 4.773 0 0 1-.755-1.53 6.948 6.948 0 0 1-.255-1.924Zm1.626-.184v.185c0 .474.046.92.14 1.335.1.416.249.783.448 1.1.206.316.466.565.783.746.316.176.694.264 1.133.264.54 0 .985-.114 1.336-.343.352-.228.63-.53.835-.905.211-.375.375-.782.493-1.222v-2.118a4.393 4.393 0 0 0-.299-.932 2.87 2.87 0 0 0-.51-.808c-.205-.24-.46-.43-.765-.572-.304-.14-.662-.21-1.072-.21-.445 0-.829.093-1.151.28a2.248 2.248 0 0 0-.783.757 3.642 3.642 0 0 0-.448 1.107c-.094.416-.14.861-.14 1.336Zm19.327 2.988V2.5h1.635V16h-1.495l-.14-1.846Zm-6.399-2.803v-.185c0-.726.088-1.386.264-1.978.182-.597.437-1.11.765-1.538a3.458 3.458 0 0 1 1.186-.984 3.377 3.377 0 0 1 1.547-.352c.598 0 1.119.106 1.564.317a3 3 0 0 1 1.143.905c.316.393.565.867.747 1.424a8.94 8.94 0 0 1 .378 1.89v.808a8.231 8.231 0 0 1-.378 1.881 4.453 4.453 0 0 1-.747 1.424c-.31.393-.691.694-1.143.905-.451.205-.978.308-1.582.308a3.27 3.27 0 0 1-1.529-.36 3.608 3.608 0 0 1-1.186-1.011 4.938 4.938 0 0 1-.765-1.53 6.726 6.726 0 0 1-.264-1.924Zm1.635-.185v.185c0 .474.047.92.141 1.335.099.416.252.783.457 1.1.205.316.466.565.782.746.316.176.694.264 1.134.264.539 0 .981-.114 1.327-.343.351-.228.633-.53.844-.905.211-.375.375-.782.492-1.222v-2.118a4.66 4.66 0 0 0-.308-.932 2.87 2.87 0 0 0-.51-.808c-.205-.24-.46-.43-.764-.572-.299-.14-.654-.21-1.064-.21-.445 0-.829.093-1.151.28a2.245 2.245 0 0 0-.782.757 3.483 3.483 0 0 0-.457 1.107 6.052 6.052 0 0 0-.141 1.336Zm12.876 5.01a4.678 4.678 0 0 1-1.802-.334 4.09 4.09 0 0 1-1.38-.958 4.272 4.272 0 0 1-.878-1.46 5.33 5.33 0 0 1-.308-1.845v-.369c0-.774.114-1.462.343-2.065a4.62 4.62 0 0 1 .931-1.547 3.996 3.996 0 0 1 1.336-.958 3.838 3.838 0 0 1 1.547-.326c.68 0 1.266.118 1.758.352a3.21 3.21 0 0 1 1.222.984c.316.416.55.909.703 1.477.152.562.228 1.178.228 1.846v.73h-7.101v-1.328h5.475v-.123a4.052 4.052 0 0 0-.263-1.23 2.212 2.212 0 0 0-.704-.985c-.322-.258-.761-.387-1.318-.387a2.21 2.21 0 0 0-1.819.923 3.444 3.444 0 0 0-.519 1.116 5.66 5.66 0 0 0-.184 1.521v.37c0 .45.061.875.184 1.274.129.392.314.738.554 1.037.246.299.542.533.888.703.351.17.75.255 1.195.255.574 0 1.06-.118 1.459-.352a3.621 3.621 0 0 0 1.046-.94l.984.782c-.205.31-.466.606-.782.888-.316.28-.706.51-1.169.685-.457.176-.999.264-1.626.264Zm7.216-7.796V16h-1.635V6.49h1.547l.088 1.89Zm-.334 2.505-.756-.027c.006-.65.091-1.25.255-1.801.164-.557.407-1.04.729-1.45.323-.41.724-.727 1.204-.95.481-.228 1.038-.343 1.67-.343.446 0 .856.065 1.231.194.375.123.7.32.975.589.276.27.49.615.642 1.037.152.422.229.931.229 1.53V16h-1.626V9.742c0-.498-.085-.896-.255-1.195a1.46 1.46 0 0 0-.703-.65 2.542 2.542 0 0 0-1.073-.211c-.48 0-.881.085-1.204.254-.322.17-.58.405-.773.704a3.156 3.156 0 0 0-.422 1.028c-.082.38-.123.785-.123 1.213Zm6.161-.897-1.09.334a4.793 4.793 0 0 1 .255-1.503c.17-.48.413-.908.73-1.283.322-.375.717-.67 1.186-.888.469-.222 1.005-.334 1.608-.334.51 0 .961.068 1.354.203.398.134.732.342 1.002.624.275.275.483.63.624 1.063.141.434.211.95.211 1.547V16h-1.635V9.733c0-.533-.085-.946-.255-1.239a1.326 1.326 0 0 0-.703-.624c-.299-.123-.656-.184-1.072-.184-.358 0-.674.061-.949.184a1.964 1.964 0 0 0-.695.51c-.187.21-.331.454-.43.73a2.702 2.702 0 0 0-.141.878Zm7.91 1.363v-.203c0-.685.1-1.32.299-1.907a4.528 4.528 0 0 1 .861-1.538c.375-.44.829-.78 1.363-1.02.533-.245 1.13-.369 1.793-.369.668 0 1.268.123 1.801.37.539.24.996.58 1.371 1.02.381.433.671.945.871 1.537.199.586.298 1.222.298 1.907v.203c0 .685-.099 1.32-.298 1.907-.2.586-.49 1.098-.871 1.538a3.987 3.987 0 0 1-1.362 1.02c-.527.24-1.125.36-1.793.36-.668 0-1.268-.12-1.802-.36a4.08 4.08 0 0 1-1.371-1.02 4.641 4.641 0 0 1-.861-1.538 5.895 5.895 0 0 1-.299-1.907Zm1.626-.203v.203c0 .474.056.922.167 1.344.111.416.278.785.501 1.108.229.322.513.577.853.764.34.182.735.273 1.186.273.445 0 .835-.091 1.169-.273.34-.187.621-.442.844-.764.223-.323.39-.692.501-1.108.117-.422.176-.87.176-1.344v-.203c0-.468-.059-.91-.176-1.327a3.401 3.401 0 0 0-.51-1.116 2.425 2.425 0 0 0-.844-.773c-.334-.188-.726-.282-1.177-.282-.446 0-.838.094-1.178.282a2.534 2.534 0 0 0-.844.773c-.223.322-.39.694-.501 1.116a5.13 5.13 0 0 0-.167 1.327ZM41.475 28.047V38h-1.32v-9.953h1.32Zm4.17 4.477v1.08h-4.458v-1.08h4.458Zm.676-4.477v1.08h-5.133v-1.08h5.133Zm2.755 2.556V38h-1.271v-7.396h1.271Zm-1.367-1.961c0-.206.061-.379.185-.52.127-.141.314-.212.56-.212.242 0 .426.07.554.212a.732.732 0 0 1 .198.52.715.715 0 0 1-.198.506c-.128.136-.312.204-.554.204-.246 0-.433-.068-.56-.204a.744.744 0 0 1-.185-.506ZM52.48 27.5V38H51.21V27.5h1.271Zm5.1 10.637a3.64 3.64 0 0 1-1.401-.26 3.178 3.178 0 0 1-1.074-.745 3.313 3.313 0 0 1-.683-1.135 4.162 4.162 0 0 1-.24-1.435v-.288c0-.601.09-1.137.267-1.606.178-.474.42-.875.725-1.203a3.104 3.104 0 0 1 1.039-.745 2.985 2.985 0 0 1 1.203-.253c.529 0 .984.09 1.367.273.388.183.704.438.95.766.247.323.429.706.547 1.148.119.438.178.916.178 1.436v.567h-5.523v-1.032h4.258v-.096a3.156 3.156 0 0 0-.205-.957 1.721 1.721 0 0 0-.547-.765c-.25-.2-.592-.301-1.025-.301a1.722 1.722 0 0 0-1.415.718 2.685 2.685 0 0 0-.403.868 4.4 4.4 0 0 0-.144 1.182v.288c0 .35.048.68.144.99.1.306.244.575.43.807.192.233.422.415.69.547.274.132.584.199.93.199.447 0 .825-.092 1.135-.274a2.81 2.81 0 0 0 .814-.731l.765.608c-.16.242-.362.472-.608.69-.246.22-.55.397-.91.534-.355.136-.776.205-1.264.205ZM85.478 36.927V38h-5.27v-1.073h5.27Zm-5.003-8.88V38h-1.32v-9.953h1.32Zm4.306 4.28v1.072h-4.573v-1.073h4.573Zm.63-4.28v1.08h-5.203v-1.08h5.202Zm6.035 8.518V27.5h1.272V38h-1.162l-.11-1.435Zm-4.976-2.181v-.144c0-.565.068-1.078.205-1.538.141-.465.34-.863.594-1.196.26-.333.568-.588.923-.766.36-.182.762-.273 1.204-.273.464 0 .87.082 1.216.246.351.16.647.394.889.704.246.305.44.675.581 1.107.141.433.24.923.294 1.47v.629a6.44 6.44 0 0 1-.294 1.463 3.45 3.45 0 0 1-.581 1.107c-.242.306-.538.54-.889.705-.35.159-.76.239-1.23.239-.433 0-.83-.094-1.19-.28a2.806 2.806 0 0 1-.922-.787 3.831 3.831 0 0 1-.595-1.19 5.238 5.238 0 0 1-.205-1.496Zm1.271-.144v.144c0 .369.037.715.11 1.039.077.323.195.608.355.854.16.246.362.44.608.581.247.137.54.206.882.206.42 0 .764-.09 1.032-.267.274-.178.493-.413.657-.704.164-.292.291-.609.383-.95v-1.648a3.653 3.653 0 0 0-.24-.724 2.229 2.229 0 0 0-.396-.63 1.713 1.713 0 0 0-.595-.444 1.926 1.926 0 0 0-.827-.164 1.75 1.75 0 0 0-.895.219 1.744 1.744 0 0 0-.609.588c-.16.246-.278.533-.355.861a4.72 4.72 0 0 0-.11 1.04Zm8.32-3.637V38h-1.272v-7.396h1.272Zm-1.368-1.961c0-.206.062-.379.185-.52.127-.141.314-.212.56-.212.242 0 .427.07.554.212a.732.732 0 0 1 .198.52.715.715 0 0 1-.198.506c-.127.136-.312.204-.553.204-.247 0-.433-.068-.561-.204a.745.745 0 0 1-.185-.506Zm6.495 1.962v.97h-4v-.97h4Zm-2.646-1.798h1.265v7.362c0 .25.038.44.116.567a.555.555 0 0 0 .301.253c.123.041.255.062.396.062.105 0 .214-.01.328-.027.119-.023.208-.042.267-.055l.007 1.032a3.004 3.004 0 0 1-.397.089 3.01 3.01 0 0 1-.581.048 1.97 1.97 0 0 1-.854-.185 1.374 1.374 0 0 1-.622-.615c-.15-.292-.226-.684-.226-1.176v-7.355ZM123.368 36.49l2.933-8.443h1.428L124.045 38h-1.019l.342-1.51Zm-2.741-8.443 2.905 8.442.363 1.511h-1.019l-3.678-9.953h1.429Zm9.625 2.556V38h-1.272v-7.396h1.272Zm-1.367-1.961c0-.206.061-.379.184-.52.128-.141.315-.212.561-.212.241 0 .426.07.554.212a.732.732 0 0 1 .198.52.715.715 0 0 1-.198.506c-.128.136-.313.204-.554.204-.246 0-.433-.068-.561-.204a.744.744 0 0 1-.184-.506Zm6.467 9.495c-.515 0-.983-.087-1.402-.26a3.177 3.177 0 0 1-1.073-.745 3.326 3.326 0 0 1-.684-1.135 4.174 4.174 0 0 1-.239-1.435v-.288c0-.601.089-1.137.267-1.606.177-.474.419-.875.724-1.203a3.114 3.114 0 0 1 1.039-.745 2.99 2.99 0 0 1 1.204-.253c.528 0 .984.09 1.367.273.387.183.704.438.95.766.246.323.428.706.547 1.148.118.438.177.916.177 1.436v.567h-5.523v-1.032h4.259v-.096a3.162 3.162 0 0 0-.205-.957 1.72 1.72 0 0 0-.547-.765c-.251-.2-.593-.301-1.025-.301a1.718 1.718 0 0 0-1.416.718 2.695 2.695 0 0 0-.403.868 4.39 4.39 0 0 0-.143 1.182v.288c0 .35.047.68.143.99.1.306.244.575.431.807.191.233.421.415.69.547.274.132.584.199.93.199.447 0 .825-.092 1.135-.274.31-.182.581-.426.813-.731l.766.608c-.16.242-.363.472-.609.69a2.9 2.9 0 0 1-.909.534c-.355.136-.777.205-1.264.205Zm6.227-1.45 1.9-6.083h.834l-.164 1.21L142.215 38h-.814l.178-1.313Zm-1.278-6.083 1.62 6.152.116 1.244h-.854l-2.147-7.396h1.265Zm5.831 6.104 1.545-6.104h1.258L146.788 38h-.848l.192-1.292Zm-1.634-6.104 1.859 5.981.212 1.415h-.806l-1.99-6.2-.164-1.197h.889ZM169.57 28.047V38h-1.319v-9.953h1.319Zm3.473 4.136V38h-1.265v-7.396h1.197l.068 1.579Zm-.301 1.839-.526-.021c.004-.506.08-.973.225-1.401a3.49 3.49 0 0 1 .616-1.128c.264-.32.578-.565.943-.739a2.784 2.784 0 0 1 1.224-.266c.364 0 .692.05.984.15.292.096.54.25.745.465.21.214.369.492.479.834.109.337.164.75.164 1.237V38h-1.272v-4.86c0-.388-.057-.698-.171-.93a1.05 1.05 0 0 0-.499-.513c-.218-.11-.487-.164-.806-.164-.315 0-.602.066-.862.198a2.065 2.065 0 0 0-.663.547 2.737 2.737 0 0 0-.43.8c-.101.296-.151.61-.151.944Zm11.081 2.016c0-.182-.041-.35-.123-.506-.077-.16-.239-.303-.485-.43-.242-.133-.606-.246-1.094-.342a8.681 8.681 0 0 1-1.114-.308 3.373 3.373 0 0 1-.841-.43 1.804 1.804 0 0 1-.526-.595 1.66 1.66 0 0 1-.185-.8c0-.292.064-.567.191-.827.133-.26.317-.49.554-.69.242-.201.531-.358.868-.472.338-.114.714-.171 1.128-.171.593 0 1.099.105 1.518.314.419.21.74.49.964.841.223.346.335.731.335 1.155h-1.265c0-.205-.061-.403-.185-.594a1.354 1.354 0 0 0-.526-.486c-.228-.127-.508-.191-.841-.191-.351 0-.635.055-.854.164-.214.105-.372.24-.472.403a1.012 1.012 0 0 0-.143.52c0 .136.022.26.068.369.05.105.137.203.26.294.123.086.296.169.519.246.224.077.508.155.855.232.606.137 1.105.301 1.497.493.392.191.683.426.875.704.191.278.287.615.287 1.011a1.97 1.97 0 0 1-.786 1.586 2.895 2.895 0 0 1-.903.452 4.03 4.03 0 0 1-1.169.157c-.651 0-1.203-.117-1.654-.349-.451-.232-.793-.533-1.025-.902a2.154 2.154 0 0 1-.349-1.17h1.272c.018.347.118.623.3.828.183.2.406.344.67.43.265.083.527.124.786.124.347 0 .636-.046.869-.137.237-.091.417-.216.54-.376a.871.871 0 0 0 .184-.547Zm5.995 2.099c-.515 0-.982-.087-1.401-.26a3.177 3.177 0 0 1-1.073-.745 3.326 3.326 0 0 1-.684-1.135 4.174 4.174 0 0 1-.239-1.435v-.288c0-.601.089-1.137.267-1.606.177-.474.419-.875.724-1.203a3.104 3.104 0 0 1 1.039-.745 2.989 2.989 0 0 1 1.203-.253c.529 0 .985.09 1.367.273.388.183.705.438.951.766.246.323.428.706.547 1.148.118.438.177.916.177 1.436v.567h-5.523v-1.032h4.259v-.096a3.192 3.192 0 0 0-.205-.957 1.727 1.727 0 0 0-.547-.765c-.251-.2-.593-.301-1.026-.301a1.724 1.724 0 0 0-1.415.718 2.695 2.695 0 0 0-.403.868 4.388 4.388 0 0 0-.144 1.182v.288c0 .35.048.68.144.99.1.306.244.575.431.807.191.233.421.415.69.547.273.132.583.199.93.199.446 0 .825-.092 1.134-.274.31-.182.582-.426.814-.731l.766.608c-.16.242-.363.472-.609.69a2.9 2.9 0 0 1-.909.534c-.355.136-.777.205-1.265.205Zm5.62-6.371V38h-1.265v-7.396h1.23l.035 1.162Zm2.31-1.203-.007 1.175a1.82 1.82 0 0 0-.301-.04 3.196 3.196 0 0 0-.314-.014c-.292 0-.549.045-.772.136a1.599 1.599 0 0 0-.568.383 1.84 1.84 0 0 0-.369.588c-.087.223-.144.47-.171.738l-.355.205c0-.446.043-.866.13-1.257.091-.392.23-.739.417-1.04.186-.305.423-.542.71-.71.292-.174.638-.26 1.04-.26.091 0 .195.011.314.034.118.018.2.039.246.061Zm4.607.04v.971h-3.999v-.97h3.999Zm-2.645-1.797h1.265v7.362c0 .25.038.44.116.567a.554.554 0 0 0 .301.253c.123.041.255.062.396.062.105 0 .214-.01.328-.027.119-.023.208-.042.267-.055L202.39 38a3.004 3.004 0 0 1-.397.089 3.01 3.01 0 0 1-.581.048c-.31 0-.595-.062-.854-.185a1.369 1.369 0 0 1-.622-.615c-.151-.292-.226-.684-.226-1.176v-7.355ZM222.475 28.047V38h-1.32v-9.953h1.32Zm4.17 4.477v1.08h-4.457v-1.08h4.457Zm.676-4.477v1.08h-5.133v-1.08h5.133Zm.896 6.337v-.157c0-.534.077-1.028.232-1.484.155-.46.378-.859.67-1.196a2.992 2.992 0 0 1 1.06-.793 3.285 3.285 0 0 1 1.394-.287c.52 0 .987.096 1.402.287.419.187.774.451 1.066.793.296.337.522.736.677 1.196.155.456.232.95.232 1.484v.157c0 .533-.077 1.027-.232 1.483a3.555 3.555 0 0 1-.677 1.197 3.103 3.103 0 0 1-1.06.792c-.41.187-.875.28-1.394.28-.52 0-.987-.093-1.401-.28a3.168 3.168 0 0 1-1.067-.793 3.609 3.609 0 0 1-.67-1.196 4.579 4.579 0 0 1-.232-1.483Zm1.264-.157v.157c0 .369.044.718.13 1.046.087.323.217.61.39.861.178.25.399.449.663.595.264.141.572.212.923.212.346 0 .649-.071.909-.212.264-.146.483-.344.656-.595.174-.25.303-.538.39-.861.091-.328.137-.677.137-1.046v-.157c0-.365-.046-.71-.137-1.033a2.68 2.68 0 0 0-.396-.868 1.888 1.888 0 0 0-.657-.601 1.841 1.841 0 0 0-.916-.22c-.346 0-.651.074-.916.22-.26.145-.478.346-.656.601-.173.25-.303.54-.39.868-.086.324-.13.668-.13 1.033Zm8.32-2.461V38h-1.265v-7.396h1.231l.034 1.162Zm2.31-1.203-.007 1.175a1.809 1.809 0 0 0-.3-.04 3.203 3.203 0 0 0-.315-.014c-.291 0-.549.045-.772.136a1.599 1.599 0 0 0-.568.383 1.84 1.84 0 0 0-.369.588c-.086.223-.143.47-.171.738l-.355.205c0-.446.043-.866.13-1.257.091-.392.23-.739.417-1.04.187-.305.424-.542.711-.71.291-.174.638-.26 1.039-.26.091 0 .196.011.314.034a.92.92 0 0 1 .246.061Zm2.427 1.51V38h-1.271v-7.396h1.203l.068 1.47Zm-.26 1.949L241.69 34c.005-.506.071-.973.199-1.401.127-.433.316-.81.567-1.128.251-.32.563-.565.937-.739.373-.177.806-.266 1.298-.266.347 0 .666.05.957.15.292.096.545.249.759.458.214.21.381.479.499.807.119.328.178.724.178 1.19V38h-1.265v-4.867c0-.388-.066-.698-.198-.93a1.135 1.135 0 0 0-.547-.506 1.973 1.973 0 0 0-.834-.164c-.373 0-.686.066-.936.198a1.586 1.586 0 0 0-.602.547c-.15.233-.26.5-.328.8a4.46 4.46 0 0 0-.096.944Zm4.792-.698-.847.26c.004-.406.07-.795.198-1.169.132-.374.321-.706.567-.998.251-.292.559-.522.923-.69.365-.174.782-.26 1.251-.26.397 0 .748.052 1.053.157.31.105.57.267.779.485.214.215.376.49.485.827.11.338.165.739.165 1.204V38h-1.272v-4.874c0-.415-.066-.736-.198-.964a1.034 1.034 0 0 0-.547-.485 2.183 2.183 0 0 0-.834-.144c-.278 0-.524.048-.738.144a1.511 1.511 0 0 0-.54.396 1.72 1.72 0 0 0-.335.568c-.073.214-.11.442-.11.683Zm10.849 3.411v-3.807c0-.292-.059-.545-.178-.76a1.165 1.165 0 0 0-.519-.505c-.233-.118-.52-.178-.862-.178-.319 0-.599.055-.84.164-.237.11-.424.253-.561.431a.944.944 0 0 0-.198.574h-1.265c0-.264.068-.526.205-.786.137-.26.333-.494.588-.704.26-.214.57-.383.93-.506.364-.127.77-.191 1.217-.191.537 0 1.011.09 1.421.273.415.183.739.458.971.827.237.365.356.823.356 1.374v3.446c0 .246.02.508.061.786.046.278.112.517.198.718V38h-1.319a2.334 2.334 0 0 1-.15-.581 4.613 4.613 0 0 1-.055-.684Zm.219-3.22.013.89h-1.278c-.36 0-.681.029-.964.088a2.216 2.216 0 0 0-.711.253 1.135 1.135 0 0 0-.588 1.025c0 .233.053.445.158.636.104.192.262.344.471.458.214.11.476.164.786.164.388 0 .73-.082 1.026-.246.296-.164.531-.364.704-.601.178-.237.273-.468.287-.69l.54.608a1.826 1.826 0 0 1-.26.635 3.079 3.079 0 0 1-1.401 1.196 2.715 2.715 0 0 1-1.08.206c-.501 0-.941-.098-1.32-.294a2.263 2.263 0 0 1-.875-.786 2.08 2.08 0 0 1-.307-1.115c0-.396.077-.745.232-1.045.155-.306.379-.559.67-.76.292-.204.643-.36 1.053-.464.41-.105.868-.157 1.374-.157h1.47Zm6.132-2.912v.971h-3.999v-.97h3.999Zm-2.646-1.797h1.265v7.362c0 .25.038.44.116.567a.554.554 0 0 0 .301.253c.123.041.255.062.396.062.105 0 .214-.01.328-.027.119-.023.208-.042.267-.055l.007 1.032a3.004 3.004 0 0 1-.397.089 3.01 3.01 0 0 1-.581.048c-.31 0-.595-.062-.854-.185a1.373 1.373 0 0 1-.622-.615c-.151-.292-.226-.684-.226-1.176v-7.355ZM286.833 28.047V38h-1.299v-9.953h1.299Zm3.199 0v1.08h-7.69v-1.08h7.69Zm.267 6.337v-.157c0-.534.077-1.028.232-1.484.155-.46.379-.859.67-1.196a2.992 2.992 0 0 1 1.06-.793 3.285 3.285 0 0 1 1.394-.287c.52 0 .987.096 1.402.287.419.187.774.451 1.066.793.296.337.522.736.677 1.196.155.456.232.95.232 1.484v.157c0 .533-.077 1.027-.232 1.483a3.555 3.555 0 0 1-.677 1.197 3.103 3.103 0 0 1-1.06.792c-.41.187-.875.28-1.394.28-.52 0-.987-.093-1.401-.28a3.168 3.168 0 0 1-1.067-.793 3.627 3.627 0 0 1-.67-1.196 4.579 4.579 0 0 1-.232-1.483Zm1.264-.157v.157c0 .369.044.718.13 1.046.087.323.217.61.39.861.178.25.399.449.663.595.264.141.572.212.923.212.346 0 .649-.071.909-.212.264-.146.483-.344.656-.595.174-.25.303-.538.39-.861.091-.328.137-.677.137-1.046v-.157c0-.365-.046-.71-.137-1.033a2.68 2.68 0 0 0-.396-.868 1.888 1.888 0 0 0-.657-.601 1.839 1.839 0 0 0-.916-.22c-.346 0-.651.074-.916.22-.26.145-.478.346-.656.601-.173.25-.303.54-.39.868-.086.324-.13.668-.13 1.033Zm6.72.157v-.157c0-.534.078-1.028.233-1.484.155-.46.378-.859.67-1.196a2.98 2.98 0 0 1 1.059-.793c.415-.192.88-.287 1.395-.287.519 0 .986.096 1.401.287a2.97 2.97 0 0 1 1.066.793c.297.337.522.736.677 1.196.155.456.233.95.233 1.484v.157c0 .533-.078 1.027-.233 1.483-.155.456-.38.855-.677 1.197a3.09 3.09 0 0 1-1.059.792c-.41.187-.875.28-1.395.28-.519 0-.986-.093-1.401-.28a3.165 3.165 0 0 1-1.066-.793 3.609 3.609 0 0 1-.67-1.196 4.579 4.579 0 0 1-.233-1.483Zm1.265-.157v.157c0 .369.043.718.13 1.046.086.323.216.61.389.861.178.25.399.449.663.595.265.141.572.212.923.212.347 0 .65-.071.909-.212.265-.146.484-.344.657-.595.173-.25.303-.538.389-.861.092-.328.137-.677.137-1.046v-.157c0-.365-.045-.71-.137-1.033a2.64 2.64 0 0 0-.396-.868 1.885 1.885 0 0 0-.656-.601 1.841 1.841 0 0 0-.916-.22c-.347 0-.652.074-.916.22a1.97 1.97 0 0 0-.657.601c-.173.25-.303.54-.389.868-.087.324-.13.668-.13 1.033Zm8.429-6.727V38h-1.272V27.5h1.272Zm6.336 8.538c0-.182-.041-.35-.123-.506-.077-.16-.239-.303-.485-.43-.241-.133-.606-.246-1.094-.342a8.681 8.681 0 0 1-1.114-.308 3.39 3.39 0 0 1-.841-.43 1.804 1.804 0 0 1-.526-.595 1.66 1.66 0 0 1-.185-.8c0-.292.064-.567.192-.827.132-.26.316-.49.553-.69.242-.201.531-.358.869-.472.337-.114.713-.171 1.128-.171.592 0 1.098.105 1.517.314.419.21.741.49.964.841.223.346.335.731.335 1.155h-1.265c0-.205-.061-.403-.184-.594a1.364 1.364 0 0 0-.527-.486c-.228-.127-.508-.191-.84-.191-.351 0-.636.055-.855.164-.214.105-.371.24-.472.403a1.022 1.022 0 0 0-.075.889c.05.105.137.203.26.294.123.086.296.169.519.246.224.077.509.155.855.232.606.137 1.105.301 1.497.493.392.191.684.426.875.704.191.278.287.615.287 1.011a1.97 1.97 0 0 1-.786 1.586 2.89 2.89 0 0 1-.902.452 4.035 4.035 0 0 1-1.169.157c-.652 0-1.203-.117-1.655-.349-.451-.232-.793-.533-1.025-.902a2.163 2.163 0 0 1-.349-1.17h1.272c.018.347.118.623.301.828.182.2.405.344.67.43.264.083.526.124.786.124.346 0 .635-.046.868-.137.237-.091.417-.216.54-.376a.871.871 0 0 0 .184-.547ZM341.479 36.927V38h-5.271v-1.073h5.271Zm-5.004-8.88V38h-1.32v-9.953h1.32Zm4.306 4.28v1.072h-4.573v-1.073h4.573Zm.629-4.28v1.08h-5.202v-1.08h5.202Zm2.365 2.556 1.621 2.694 1.64-2.693h1.484l-2.42 3.65L348.595 38h-1.463l-1.709-2.775L343.714 38h-1.47l2.488-3.746-2.413-3.65h1.456Zm9.188 0v.971h-3.999v-.97h3.999Zm-2.646-1.797h1.265v7.362c0 .25.039.44.116.567a.558.558 0 0 0 .301.253c.123.041.255.062.397.062.104 0 .214-.01.328-.027.118-.023.207-.042.266-.055l.007 1.032c-.1.032-.232.062-.396.089-.16.032-.354.048-.581.048-.31 0-.595-.062-.855-.185a1.373 1.373 0 0 1-.622-.615c-.15-.292-.226-.684-.226-1.176v-7.355Zm7.199 9.33c-.515 0-.982-.086-1.402-.259a3.187 3.187 0 0 1-1.073-.745 3.326 3.326 0 0 1-.684-1.135 4.174 4.174 0 0 1-.239-1.435v-.288c0-.601.089-1.137.267-1.606.177-.474.419-.875.724-1.203a3.114 3.114 0 0 1 1.039-.745 2.99 2.99 0 0 1 1.204-.253c.528 0 .984.09 1.367.273.387.183.704.438.95.766.246.323.428.706.547 1.148a5.5 5.5 0 0 1 .178 1.436v.567h-5.524v-1.032h4.259v-.096a3.162 3.162 0 0 0-.205-.957 1.72 1.72 0 0 0-.547-.765c-.251-.2-.592-.301-1.025-.301a1.718 1.718 0 0 0-1.415.718 2.675 2.675 0 0 0-.404.868 4.43 4.43 0 0 0-.143 1.182v.288c0 .35.048.68.143.99.1.306.244.575.431.807.191.233.421.415.69.547.274.132.584.199.93.199.447 0 .825-.092 1.135-.274.31-.182.581-.426.813-.731l.766.608c-.16.242-.362.472-.609.69a2.9 2.9 0 0 1-.909.534c-.355.136-.777.205-1.264.205Zm5.619-5.953V38h-1.265v-7.396h1.196l.069 1.579Zm-.301 1.839-.526-.021c.004-.506.079-.973.225-1.401.146-.433.351-.81.615-1.128a2.746 2.746 0 0 1 2.167-1.005c.365 0 .693.05.985.15.291.096.54.25.745.465.21.214.369.492.478.834.11.337.165.75.165 1.237V38h-1.272v-4.86c0-.388-.057-.698-.171-.93a1.05 1.05 0 0 0-.499-.513c-.219-.11-.488-.164-.807-.164-.314 0-.601.066-.861.198a2.065 2.065 0 0 0-.663.547 2.763 2.763 0 0 0-.581 1.744Zm9.871-3.418v.97h-3.999v-.97h3.999Zm-2.645-1.798h1.264v7.362c0 .25.039.44.116.567a.558.558 0 0 0 .301.253c.123.041.255.062.397.062.105 0 .214-.01.328-.027.118-.023.207-.042.266-.055l.007 1.032c-.1.032-.232.062-.396.089-.16.032-.353.048-.581.048-.31 0-.595-.062-.855-.185a1.373 1.373 0 0 1-.622-.615c-.15-.292-.225-.684-.225-1.176v-7.355Zm5.502 1.797V38h-1.271v-7.396h1.271Zm-1.367-1.961c0-.206.062-.379.185-.52.127-.141.314-.212.56-.212.242 0 .427.07.554.212a.732.732 0 0 1 .198.52.715.715 0 0 1-.198.506c-.127.136-.312.204-.554.204-.246 0-.433-.068-.56-.204a.745.745 0 0 1-.185-.506Zm3.063 5.742v-.157c0-.534.077-1.028.232-1.484.155-.46.378-.859.67-1.196a2.992 2.992 0 0 1 1.06-.793 3.285 3.285 0 0 1 1.394-.287c.52 0 .987.096 1.402.287.419.187.774.451 1.066.793.296.337.522.736.677 1.196.155.456.232.95.232 1.484v.157c0 .533-.077 1.027-.232 1.483a3.555 3.555 0 0 1-.677 1.197 3.103 3.103 0 0 1-1.06.792c-.41.187-.875.28-1.394.28-.52 0-.987-.093-1.401-.28a3.168 3.168 0 0 1-1.067-.793 3.609 3.609 0 0 1-.67-1.196 4.579 4.579 0 0 1-.232-1.483Zm1.264-.157v.157c0 .369.044.718.13 1.046.087.323.217.61.39.861.178.25.399.449.663.595.264.141.572.212.923.212.346 0 .649-.071.909-.212.264-.146.483-.344.656-.595.174-.25.303-.538.39-.861.091-.328.137-.677.137-1.046v-.157c0-.365-.046-.71-.137-1.033a2.68 2.68 0 0 0-.396-.868 1.888 1.888 0 0 0-.657-.601 1.839 1.839 0 0 0-.916-.22c-.346 0-.651.074-.916.22-.26.145-.478.346-.656.601-.173.25-.303.54-.39.868-.086.324-.13.668-.13 1.033Zm8.32-2.044V38h-1.265v-7.396h1.196l.069 1.579Zm-.301 1.839-.526-.021c.004-.506.079-.973.225-1.401.146-.433.351-.81.615-1.128a2.746 2.746 0 0 1 2.167-1.005c.365 0 .693.05.985.15.292.096.54.25.745.465.21.214.369.492.478.834.11.337.165.75.165 1.237V38h-1.272v-4.86c0-.388-.057-.698-.171-.93a1.05 1.05 0 0 0-.499-.513c-.219-.11-.488-.164-.807-.164-.314 0-.601.066-.861.198a2.065 2.065 0 0 0-.663.547 2.763 2.763 0 0 0-.581 1.744Zm11.081 2.016c0-.182-.041-.35-.123-.506-.077-.16-.239-.303-.485-.43-.242-.133-.606-.246-1.094-.342a8.636 8.636 0 0 1-1.114-.308 3.373 3.373 0 0 1-.841-.43 1.818 1.818 0 0 1-.527-.595 1.659 1.659 0 0 1-.184-.8c0-.292.064-.567.191-.827.132-.26.317-.49.554-.69.242-.201.531-.358.868-.472.337-.114.713-.171 1.128-.171.593 0 1.098.105 1.518.314.419.21.74.49.964.841.223.346.335.731.335 1.155h-1.265c0-.205-.062-.403-.185-.594a1.361 1.361 0 0 0-.526-.486c-.228-.127-.508-.191-.841-.191-.351 0-.636.055-.854.164-.215.105-.372.24-.472.403a1.013 1.013 0 0 0-.075.889c.05.105.136.203.26.294.123.086.296.169.519.246.223.077.508.155.855.232.606.137 1.105.301 1.497.493.392.191.683.426.875.704.191.278.287.615.287 1.011 0 .324-.069.62-.205.89a1.981 1.981 0 0 1-.581.696 2.895 2.895 0 0 1-.903.452 4.03 4.03 0 0 1-1.169.157c-.651 0-1.203-.117-1.654-.349-.451-.232-.793-.533-1.025-.902a2.154 2.154 0 0 1-.349-1.17h1.271c.019.347.119.623.301.828.183.2.406.344.67.43.264.083.527.124.786.124.347 0 .636-.046.868-.137.237-.091.417-.216.541-.376a.871.871 0 0 0 .184-.547ZM424.656 32.326V33.4h-5.386v-1.073h5.386Zm-5.181-4.28V38h-1.32v-9.953h1.32Zm6.33 0V38h-1.313v-9.953h1.313Zm5.222 10.09c-.515 0-.982-.086-1.401-.259a3.177 3.177 0 0 1-1.073-.745 3.326 3.326 0 0 1-.684-1.135 4.174 4.174 0 0 1-.239-1.435v-.288c0-.601.089-1.137.266-1.606.178-.474.42-.875.725-1.203a3.104 3.104 0 0 1 1.039-.745 2.989 2.989 0 0 1 1.203-.253c.529 0 .985.09 1.367.273.388.183.705.438.951.766.246.323.428.706.547 1.148.118.438.177.916.177 1.436v.567h-5.523v-1.032h4.259v-.096a3.192 3.192 0 0 0-.205-.957 1.727 1.727 0 0 0-.547-.765c-.251-.2-.593-.301-1.026-.301a1.724 1.724 0 0 0-1.415.718 2.695 2.695 0 0 0-.403.868 4.388 4.388 0 0 0-.144 1.182v.288c0 .35.048.68.144.99.1.306.244.575.431.807.191.233.421.415.69.547.273.132.583.199.93.199.446 0 .825-.092 1.134-.274.31-.182.582-.426.814-.731l.766.608c-.16.242-.363.472-.609.69a2.9 2.9 0 0 1-.909.534c-.355.136-.777.205-1.265.205Zm5.729-10.636V38h-1.272V27.5h1.272Zm3.295 4.525v8.819h-1.272v-10.24h1.162l.11 1.421Zm4.983 2.215v.144c0 .538-.064 1.037-.191 1.497a3.691 3.691 0 0 1-.561 1.19c-.241.337-.54.599-.895.785-.356.187-.764.28-1.224.28-.469 0-.884-.077-1.244-.232a2.457 2.457 0 0 1-.916-.677 3.463 3.463 0 0 1-.602-1.066 6.18 6.18 0 0 1-.3-1.401v-.766a6.418 6.418 0 0 1 .307-1.47c.151-.432.349-.802.595-1.107.251-.31.554-.545.909-.704a2.91 2.91 0 0 1 1.231-.246c.464 0 .877.09 1.237.273.36.178.663.433.909.766.246.332.431.731.554 1.196.127.46.191.973.191 1.538Zm-1.271.144v-.144c0-.369-.039-.715-.117-1.039a2.616 2.616 0 0 0-.362-.861 1.718 1.718 0 0 0-.615-.588 1.75 1.75 0 0 0-.896-.219c-.319 0-.597.055-.834.164-.232.11-.43.258-.594.445a2.366 2.366 0 0 0-.404.628 3.62 3.62 0 0 0-.225.725v1.77c.091.32.219.62.383.903.164.278.382.504.656.677.273.168.617.253 1.032.253.342 0 .636-.071.882-.212.251-.146.456-.344.615-.595a2.7 2.7 0 0 0 .362-.861c.078-.328.117-.677.117-1.046Z"
        fill="#000"
      />
    </svg>
  );
}
