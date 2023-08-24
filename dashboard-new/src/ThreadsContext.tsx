import { thread } from '@cord-sdk/react';
import type { PropsWithChildren } from 'react';
import {
  useCallback,
  useEffect,
  useState,
  createContext,
  useMemo,
} from 'react';
import { LOCATION } from './components/Dashboard';

// Metadata stored on threads left on charts
export type ChartThreadMetadata = {
  type: 'chart';
  chartId: string;
  seriesId: string;
  x: number;
  y: number;
};

// Metadata stored on threads left on table grids
export type GridThreadMetadata = {
  type: 'grid';
  gridId: string;
  rowId: string;
  colId: string;
};

export type ThreadMetadata = ChartThreadMetadata | GridThreadMetadata;

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

  // The id of the thread that should be open after the page makes necessary
  // adjustments to make the thread visible. Common adjustments are scrolling
  // the page, updating chart/table filters, un-collapsing the right page
  // section etc. This is useful for implementing ThreadList's onThreadClick
  // callback or for implementing URL deep-linking. If page adjustments are not
  // needed, then simply use `setOpenThread(threadId)` to open a thread.
  //
  // The standard usage pattern looks like this:
  // useEffect(() => {
  //    if (requestToOpenThread) {
  //      ...scroll the page, adjust filters, etc.
  //      setOpenThread(requestToOpenThread);
  //      setRequestToOpenThread(null);
  //   }
  // }, [requestToOpenThread, setRequestToOpenThread, setOpenThread]);
  requestToOpenThread: string | null;
  setRequestToOpenThread: (threadId: string | null) => void;

  // True if user can leave threads at the moment
  inThreadCreationMode: boolean;
  setInThreadCreationMode: (
    v: boolean | ((oldVal: boolean) => boolean),
  ) => void;

  // Enables hiding all conversations on the page
  threadsEnabled: boolean;
  setThreadsEnabled: (v: boolean | ((oldVal: boolean) => boolean)) => void;
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

  const [requestToOpenThread, setRequestToOpenThread] = useState<string | null>(
    null,
  );

  const [inThreadCreationMode, setInThreadCreationMode] =
    useState<boolean>(false);

  const [threadsEnabled, setThreadsEnabled] = useState<boolean>(true);

  const context = useMemo(
    () => ({
      threads,
      addThread,
      removeThread,
      openThread,
      setOpenThread,
      requestToOpenThread,
      setRequestToOpenThread,
      inThreadCreationMode,
      setInThreadCreationMode,
      threadsEnabled,
      setThreadsEnabled,
    }),
    [
      threads,
      addThread,
      removeThread,
      openThread,
      requestToOpenThread,
      inThreadCreationMode,
      threadsEnabled,
    ],
  );
  return (
    <ThreadsContext.Provider value={context}>
      {children}
    </ThreadsContext.Provider>
  );
}
