import { thread } from '@cord-sdk/react';
import type { PropsWithChildren } from 'react';
import {
  useCallback,
  useEffect,
  useState,
  createContext,
  useMemo,
} from 'react';
import { LOCATION } from './components/Document';

export type ThreadMetadata = {
  startNodeId: string;
  startOffset: number;
  endNodeId: string;
  endOffset: number;
  topPx: number;
};

// Context for storing all thread related information
type ThreadsContextType = {
  // Map of all threads on current page, mapping from thread's ID to its
  // metadata
  threads: ReadonlyMap<string, ThreadMetadata>;
  // Adds a thread to the threads map
  addThread: (threadId: string, metadata: ThreadMetadata) => void;
  // Removes a thread from the threads map
  removeThread: (threadId: string) => void;

  // The id of the thread open on this page (or null if none is open)
  openThread: string | null;
  setOpenThread: (arg: string | null) => void;
};
export const ThreadsContext = createContext<ThreadsContextType | undefined>(
  undefined,
);

export function ThreadsProvider({ children }: PropsWithChildren) {
  const [threads, setThreads] = useState<Map<string, ThreadMetadata>>(
    new Map(),
  );
  const addThread = useCallback(
    (threadId: string, metadata: ThreadMetadata) =>
      setThreads((oldThreads) => {
        if (oldThreads.has(threadId)) {
          return oldThreads;
        }
        const newThreads = new Map(oldThreads);
        newThreads.set(threadId, metadata);
        return newThreads;
      }),
    [],
  );
  const removeThread = useCallback(
    (threadId: string) =>
      setThreads((oldThreads) => {
        if (!oldThreads.has(threadId)) {
          return oldThreads;
        }
        const newThreads = new Map(oldThreads);
        newThreads.delete(threadId);
        return newThreads;
      }),
    [],
  );

  // Fetch existing threads associated with location
  const {
    threads: threadSummaries,
    hasMore,
    loading,
    fetchMore,
  } = thread.useLocationData(LOCATION, { includeResolved: false });
  useEffect(() => {
    if (loading) {
      return;
    }
    if (hasMore) {
      // NOTE: For this demo, fetch all threads on the page.
      void fetchMore(1000);
    }
    threadSummaries
      .filter((t) => t.total > 0)
      .forEach((t) => addThread(t.id, t.metadata as ThreadMetadata));
  }, [addThread, fetchMore, hasMore, loading, threadSummaries, threads]);

  const [openThread, setOpenThread] = useState<string | null>(null);

  const context = useMemo(
    () => ({
      threads,
      addThread,
      removeThread,
      openThread,
      setOpenThread,
    }),
    [threads, addThread, removeThread, openThread],
  );
  return (
    <ThreadsContext.Provider value={context}>
      {children}
    </ThreadsContext.Provider>
  );
}
