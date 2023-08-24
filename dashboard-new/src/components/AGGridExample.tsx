import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ICellRendererParams, GridApi } from 'ag-grid-community';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
import { PresenceFacepile, PresenceObserver, user } from '@cord-sdk/react';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react';
import books from '../books.json';
import type { GridThreadMetadata } from '../ThreadsContext';
import { ThreadsContext } from '../ThreadsContext';
import { LOCATION } from './Dashboard';
import { ThreadWrapper } from './ThreadWrapper';
import commentIcon from './CommentIcon.svg';

export function AGGridExample({ gridId }: { gridId: string }) {
  const orgId = user.useViewerData()?.organizationID;
  const gridRef = useRef<AgGridReact>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const onGridReady = useCallback(() => {
    const element = gridContainerRef.current;

    if (!element) {
      return;
    }

    // the grid needs to be manually resized when the page is resized
    const resizeObserver = new ResizeObserver(() => {
      gridRef.current?.api.sizeColumnsToFit();
    });
    resizeObserver.observe(element);
  }, []);

  const {
    openThread,
    addThread,
    setOpenThread,
    threads,
    requestToOpenThread,
    setRequestToOpenThread,
  } = useContext(ThreadsContext)!;

  // Effect to show the correct thread when the user requests to open a
  // specific thread (e.g. by clicking a thread in ThreadList)
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      // this should not happen, appease typechecker
      return;
    }
    const metadata =
      requestToOpenThread !== null ? threads.get(requestToOpenThread) : null;
    if (metadata?.type === 'grid' && metadata.gridId === gridId) {
      // this is a request for this grid, make the thread visible
      const { rowId, colId } = metadata;
      const rowNode = grid.api.getRowNode(rowId);

      if (!rowNode) {
        // unknown rowId, may want to take a custom action, such as display
        // thread in a full page modal
        return;
      }

      if (!rowNode.displayed) {
        // remove filters to make sure the row is displayed
        grid.api.setFilterModel(null);
      }
      grid.api.ensureNodeVisible(rowNode); // scroll the table

      // Scroll the page to the table, open the thread and flash the table cell
      gridContainerRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      setRequestToOpenThread(null);

      // Only open the thread if the table is in the viewport because
      // opening the thread immediately currently stops the scrollIntoView().
      const openThreadIfInView = () => {
        const gridContainerBottom =
          gridContainerRef.current?.getBoundingClientRect().bottom;
        const gridContainerTop =
          gridContainerRef.current?.getBoundingClientRect().top;

        if (
          gridContainerBottom &&
          gridContainerTop &&
          // Open the thread if the whole table container is in the viewport
          ((window.innerHeight > gridContainerBottom &&
            window.innerHeight > gridContainerTop) ||
            // Also open the thread if the top of the table is outside the viewport
            // to account for window heights smaller than the table height
            gridContainerTop < 0)
        ) {
          grid.api.flashCells({ rowNodes: [rowNode], columns: [colId] });
          clearInterval(intervalID);
          setOpenThread(requestToOpenThread);
        }
      };

      // Check every 150ms to see if we have scrolled the table into view
      const intervalID = setInterval(openThreadIfInView, 150);

      // If for some reason we never open a thread then give up and clean up the setInterval after 2s
      setTimeout(() => clearInterval(intervalID), 2000);
    }
  }, [
    threads,
    gridId,
    requestToOpenThread,
    setOpenThread,
    setRequestToOpenThread,
  ]);

  const openThreadMetadata =
    openThread !== null ? threads.get(openThread) : null;
  const threadOpenOnThisGrid =
    openThreadMetadata?.type === 'grid' && openThreadMetadata.gridId === gridId;
  const { refs, floatingStyles } = useFloating({
    open: threadOpenOnThisGrid,
    middleware: [offset(10), flip(), shift()],
    whileElementsMounted: autoUpdate,
    transform: false, // allow Thread to use position: fixed for attachment previews
  });

  const [rowOfOpenThreadVisible, setRowOfOpenThreadVisible] = useState(true);

  // Effect to re-calculate whether the open thread's row is visible
  useEffect(() => {
    if (gridRef.current?.api && threadOpenOnThisGrid) {
      setRowOfOpenThreadVisible(
        // NOTE: same logic is needed for columns if horizontal scrolling is allowed
        isRowInScrollView(gridRef.current.api, openThreadMetadata.rowId),
      );
    }
  }, [threadOpenOnThisGrid, openThread, openThreadMetadata]);

  // This is just boring conversion from "(elem) => void" to ref object
  // "{current: Element}"
  const refSetFloating = useAsRefObject(refs.setFloating);

  const cellRenderer = useCallback(
    (params: ICellRendererParams) =>
      CellWithThreadAndPresence(params, gridId, refs.setReference),
    [gridId, refs.setReference],
  );

  return (
    <div
      id="grid-container"
      className={'ag-theme-alpine'}
      ref={gridContainerRef}
    >
      {threadOpenOnThisGrid && (
        <ThreadWrapper
          forwardRef={refSetFloating}
          location={LOCATION}
          threadId={openThread!}
          metadata={openThreadMetadata}
          style={{
            ...floatingStyles, // to position the thread next to the pin
            zIndex: 1, // to be above AgGrid
            // Hide the thread if its row is scrolled out of view.
            // Use css visibility: hidden instead of display: none to hide
            // this thread. display: none would remove the Thread from DOM
            // and thus would lose the draft message.
            visibility: rowOfOpenThreadVisible ? 'visible' : 'hidden',
          }}
        />
      )}
      <AgGridReact
        ref={gridRef}
        getRowId={(params) => getRowId(params.data)}
        rowData={books}
        defaultColDef={{
          cellRenderer,
        }}
        columnDefs={COLUMN_DEFS}
        onGridReady={onGridReady}
        suppressRowTransform={true}
        suppressDragLeaveHidesColumns={true}
        onBodyScroll={(e) => {
          // Check if the open thread's row is scrolled out of view
          if (threadOpenOnThisGrid) {
            setRowOfOpenThreadVisible(
              // NOTE: same logic is needed for columns if horizontal scrolling is allowed
              isRowInScrollView(e.api, openThreadMetadata.rowId),
            );
          }
        }}
        onCellClicked={(e) => {
          // On cell click, we might want to open/close/start a thread
          if (!orgId) {
            // appease the typechecker
            throw new Error('org information not ready');
          }

          const rowId = getRowId(e.data);
          const colId = e.column.getId();
          const threadId = makeThreadId({ orgId, gridId, rowId, colId });
          if (threadId === openThread) {
            setOpenThread(null);
          } else if (threads.has(threadId)) {
            setOpenThread(threadId);
          } else {
            const metadata: GridThreadMetadata = {
              type: 'grid',
              gridId,
              rowId,
              colId,
            };
            addThread(threadId, metadata);
            setOpenThread(threadId);
          }
        }}
      ></AgGridReact>
    </div>
  );
}

// Custom table cell renderer with presence and thread indicator
function CellWithThreadAndPresence(
  params: ICellRendererParams,
  gridId: string,
  setReference: (el: Element | null) => void,
) {
  const { threads, openThread } = useContext(ThreadsContext)!;
  const rowId = getRowId(params.data);
  const colId = params.column?.getId();
  const orgId = user.useViewerData()?.organizationID;
  if (!colId) {
    throw new Error('unexpected error: missing column id');
  }
  const threadId = orgId && makeThreadId({ orgId, gridId, colId, rowId });
  const threadMetadata =
    threadId !== undefined ? threads.get(threadId) : undefined;

  const location = useMemo(
    () => ({ gridId, rowId, colId }),
    [colId, gridId, rowId],
  );

  return (
    <>
      <PresenceObserver
        location={location}
        style={{
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}
          title={params.value}
        >
          {params.value}
        </div>
        <PresenceFacepile
          location={location}
          excludeViewer={false}
          maxUsers={1}
        />
        {threadMetadata && threadId && (
          <img
            src={commentIcon}
            ref={openThread === threadId ? setReference : undefined}
          />
        )}
      </PresenceObserver>
    </>
  );
}

const COLUMN_DEFS = [
  {
    field: 'isbn',
    headerName: 'ISBN',
    filter: true,
    sortable: false,
  },
  {
    field: 'title',
    headerName: 'Title',
    filter: true,
    sortable: true,
  },
  {
    field: 'authors',
    headerName: 'Authors',
    filter: true,
    sortable: true,
  },
  {
    field: 'average_rating',
    headerName: 'Rating',
    filter: true,
    sortable: true,
  },
  {
    field: 'num_pages',
    headerName: 'Pages',
    filter: true,
    sortable: true,
  },
  {
    field: 'publication_date',
    headerName: 'Publication Date',
    filter: true,
    sortable: true,
  },
];

// helper function that converts a function style ref into a ref object
function useAsRefObject(refMethod: (e: HTMLElement | null) => void) {
  return useMemo(() => {
    let val: HTMLElement | null = null;
    return {
      get current() {
        return val;
      },
      set current(element: HTMLElement | null) {
        val = element;
        refMethod(element);
      },
    };
  }, [refMethod]);
}

// Check if row with id rowId is within the scrollable view
function isRowInScrollView(api: GridApi<any>, rowId: string): boolean {
  const rowNode = api.getRowNode(rowId);
  if (
    !rowNode ||
    rowNode.rowTop === null ||
    rowNode.rowHeight === null ||
    rowNode.rowHeight === undefined
  ) {
    return false;
  }
  const { top: visibleTop, bottom: visibleBottom } =
    api.getVerticalPixelRange();
  const rowTop = rowNode.rowTop;
  const rowBottom = rowTop + rowNode.rowHeight;
  // The row spans pixels from rowTop to rowBottom. The grid
  // currently displays pixels from visibleTop to visibleBottom.
  return (
    (rowTop >= visibleTop && rowTop <= visibleBottom) ||
    (rowBottom >= visibleTop && rowBottom <= visibleBottom)
  );
}

// Given data of a table row, returns the row's unique ID
function getRowId(data: { bookID: number }) {
  return data.bookID.toString();
}

// Constructs a thread ID
function makeThreadId({
  orgId,
  gridId,
  rowId,
  colId,
}: {
  orgId: string;
  gridId: string;
  rowId: string;
  colId: string;
}) {
  return `${orgId}_${gridId}_${rowId}_${colId}`;
}
