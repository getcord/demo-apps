import type { PropsWithChildren, RefObject } from 'react';
import type { Stage } from 'konva/lib/Stage';
import {
  createContext,
  useCallback,
  useState,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { thread } from '@cord-sdk/react';
import type { Location } from '@cord-sdk/types';
import type { OpenThread, Pin } from './canvasUtils';
import { getPinFromThread } from './canvasUtils';

// Context for storing all thread related information
type CanvasAndCommentsContextType = {
  // Map of all threads on current page, mapping from thread's ID to its
  // calculated pins
  threads: ReadonlyMap<string, Pin>;
  // Adds a thread to the threads map
  addThread: (threadId: string, metadata: Pin) => void;
  // Removes a thread from the threads map
  removeThreadIfEmpty: (openThread: OpenThread) => void;

  // The id of the thread open on this page, and if it's empty (or null if none is open)
  openThread: OpenThread;
  setOpenThread: (arg: OpenThread) => void;

  // True if user can leave threads at the moment
  inThreadCreationMode: boolean;
  setInThreadCreationMode: React.Dispatch<React.SetStateAction<boolean>>;

  // The stage (canvas), and container of the canvas
  canvasStageRef: RefObject<Stage>;
  canvasContainerRef: RefObject<HTMLDivElement>;
};
export const CanvasAndCommentsContext = createContext<
  CanvasAndCommentsContextType | undefined
>(undefined);

export function CanvasAndCommentsProvider({
  children,
  location,
}: PropsWithChildren<{ location: Location }>) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasStageRef = useRef<Stage>(null);
  const [threads, setThreads] = useState<Map<string, Pin>>(new Map());

  const addThread = useCallback((threadId: string, metadata: Pin) => {
    setThreads((oldThreads) => {
      if (oldThreads.has(threadId)) {
        return oldThreads;
      }
      const newThreads = new Map(oldThreads);
      newThreads.set(threadId, metadata);
      return newThreads;
    });
  }, []);

  const removeThreadIfEmpty = useCallback((removeThread: OpenThread) => {
    if (!removeThread || !removeThread.empty) {
      return;
    }

    setThreads((oldThreads) => {
      if (!oldThreads.has(removeThread.threadID)) {
        return oldThreads;
      }
      const newThreads = new Map(oldThreads);
      newThreads.delete(removeThread.threadID);
      return newThreads;
    });
  }, []);

  const [openThread, setOpenThread] = useState<OpenThread>(null);

  const [inThreadCreationMode, setInThreadCreationMode] =
    useState<boolean>(false);

  // Fetch existing threads associated with location
  const {
    threads: threadSummaries,
    hasMore,
    loading,
    fetchMore,
  } = thread.useLocationData(location, { includeResolved: false });
  useEffect(() => {
    if (loading) {
      return;
    }
    if (hasMore) {
      // NOTE: For this demo, fetch all threads on the page.
      void fetchMore(1000);
    }

    if (!canvasStageRef.current) {
      return;
    }

    const stage = canvasStageRef.current;
    threadSummaries
      .filter(
        (t) => t.total > 0 || openThread?.threadID === t.id || !t.resolved,
      )
      .forEach((t) => {
        const pinData = getPinFromThread(stage, t);
        if (pinData) {
          addThread(t.id, pinData);
        }
      });
  }, [
    addThread,
    fetchMore,
    hasMore,
    loading,
    openThread?.threadID,
    threadSummaries,
  ]);

  const context = useMemo(
    () => ({
      threads,
      addThread,
      removeThreadIfEmpty,
      openThread,
      setOpenThread,
      inThreadCreationMode,
      setInThreadCreationMode,
      canvasStageRef,
      canvasContainerRef,
    }),
    [addThread, inThreadCreationMode, openThread, removeThreadIfEmpty, threads],
  );
  return (
    <CanvasAndCommentsContext.Provider value={context}>
      {children}
    </CanvasAndCommentsContext.Provider>
  );
}