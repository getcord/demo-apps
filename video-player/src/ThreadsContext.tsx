import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
} from 'react';
import { thread } from '@cord-sdk/react';
import type { Location } from '@cord-sdk/types';

export type ThreadMetadata = {
  xPercent: number;
  yPercent: number;
  timestamp: number;
  autogenerated?: boolean;
  initallyOpen?: boolean;
  durationOnVideo?: number;
};

// Context for storing all thread related information
type ThreadsContextType = {
  // Map of all threads on current page, mapping from thread's ID to its
  // metadata
  threads: ReadonlyMap<
    string,
    { metadata: ThreadMetadata; totalMessages: number }
  >;
  // Adds a thread to the threads map
  addThread: (
    threadId: string,
    metadata: ThreadMetadata,
    totalMessages: number,
  ) => void;
  // Removes a thread from the threads map
  removeThread: (threadId: string) => void;

  // The id of the thread open on this page (or null if none is open)
  openThread: string | null;
  setOpenThread: (arg: string | null) => void;
};
export const ThreadsContext = createContext<ThreadsContextType | undefined>(
  undefined,
);

export function ThreadsProvider({
  children,
  location,
}: PropsWithChildren<{ location: Location }>) {
  const [threads, setThreads] = useState<
    Map<string, { metadata: ThreadMetadata; totalMessages: number }>
  >(new Map());
  const addThread = useCallback(
    (threadId: string, metadata: ThreadMetadata, totalMessages: number) =>
      setThreads((oldThreads) => {
        if (
          oldThreads.has(threadId) &&
          oldThreads.get(threadId)?.totalMessages === totalMessages
        ) {
          return oldThreads;
        }
        const newThreads = new Map(oldThreads);
        newThreads.set(threadId, { metadata, totalMessages });
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
  } = thread.useThreads({ filter: { location, resolvedStatus: 'unresolved' } });
  useEffect(() => {
    if (loading) {
      return;
    }
    if (hasMore) {
      // NOTE: For this demo, fetch all threads on the page.
      void fetchMore(1000);
    }
    threadSummaries
      .filter((t) => t.total > 0 && Object.keys(t.metadata).length > 0)
      .forEach((t) => addThread(t.id, t.metadata as ThreadMetadata, t.total));
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
