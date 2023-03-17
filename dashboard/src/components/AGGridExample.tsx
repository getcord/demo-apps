import * as React from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
import {
  PresenceObserver,
  useCordAnnotationCaptureHandler,
  useCordAnnotationClickHandler,
  useCordAnnotationRenderer,
  useCordAnnotationTargetRef,
  useCordPresentUsers,
} from '@cord-sdk/react';

import books from '../books.json';

const COLUMN_HEADER_HEIGHT = 48;

type GridLocation = {
  section: string;
  row: string;
  column?: string;
};

function CellWithAnnotationTargetAndPresence(params: ICellRendererParams) {
  const location: GridLocation = useMemo(
    () => ({
      section: 'grid',
      row: String(params.rowIndex),
      column: params.column?.getColId(),
    }),
    [params],
  );

  const annotationTargetRef =
    useCordAnnotationTargetRef<HTMLDivElement>(location);

  const presentUsers = useCordPresentUsers(location, {
    includeUserDetails: true,
    onlyPresentUsers: true,
  });

  return (
    <>
      <PresenceObserver location={location}>
        <div ref={annotationTargetRef} className="cell">
          {params.value}
        </div>
      </PresenceObserver>
      {presentUsers.length > 0 && (
        <div className="cell-presence">
          <span>{presentUsers.map((u) => u.name).join(', ')}</span>
        </div>
      )}
    </>
  );
}

export function AGGridExample() {
  const gridRef = useRef<AgGridReact>(null);
  const location = { section: 'grid' };
  const gridContainerRef = useCordAnnotationTargetRef<HTMLDivElement>(location);

  const onGridReady = useCallback(() => {
    const element = gridContainerRef.current;

    if (!element) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      gridRef.current?.api.sizeColumnsToFit();
    });
    resizeObserver.observe(element);
  }, [gridContainerRef]);

  const flashCell = useCallback(
    (rowID: string | undefined, columnID: string | undefined) => {
      const grid = gridRef.current;

      if (!grid || rowID === undefined || columnID === undefined) {
        return;
      }

      const rowNode = grid.api.getRowNode(rowID);

      if (!rowNode) {
        return;
      }

      grid.api.flashCells({
        rowNodes: [rowNode],
        columns: [columnID],
      });
    },
    [],
  );

  useCordAnnotationCaptureHandler<GridLocation>(
    location,
    (_position, element) => {
      const grid = gridRef.current;
      if (!grid) {
        return;
      }

      const colId = element.closest('[role=gridcell]')?.getAttribute('col-id');
      const rowId = element.closest('[role=row]')?.getAttribute('row-id');
      const cellValue = element.closest('.cell')?.textContent ?? undefined;

      const column = grid.columnApi.getColumn(colId);

      if (rowId && colId && column) {
        flashCell(rowId, colId);
        return {
          extraLocation: {
            // Deliberately breaking exact match so useCordAnnotationRenderer runs
            // for additional logic to correctly show/hide pins when scrolled out of view.
            row: Number(rowId),
            column: colId,
          },
          label: `${column.getColDef().headerName}: ${cellValue}`,
        };
      }
      return;
    },
  );

  useCordAnnotationRenderer<GridLocation>(location, (annotation) => {
    const gridContainer = gridContainerRef.current;

    if (!gridContainer) {
      return;
    }

    const { row, column } = annotation.location;
    const annotatedCell = gridContainerRef.current?.querySelector(
      `*[role='row'][row-id='${row}'] *[role='gridcell'][col-id='${column}']`,
    );

    if (!annotatedCell) {
      return;
    }

    const annotatedCellDOMRect = annotatedCell.getBoundingClientRect();
    const gridContainerDOMRect = gridContainer.getBoundingClientRect();

    if (
      annotatedCellDOMRect.top <
        gridContainerDOMRect.top + COLUMN_HEADER_HEIGHT ||
      annotatedCellDOMRect.top + annotatedCellDOMRect.height / 2 >
        gridContainerDOMRect.bottom
    ) {
      return;
    }

    return {
      element: annotatedCell as HTMLElement,
    };
  });

  useCordAnnotationClickHandler<GridLocation>(location, (annotation) => {
    const grid = gridRef.current;

    if (!grid) {
      return;
    }

    const { row, column } = annotation.location;
    const rowNode = grid.api.getRowNode(String(row));

    grid.api.setFilterModel(null);
    grid.api.ensureNodeVisible(rowNode, 'middle');
    flashCell(String(row), column);
  });

  return (
    <div
      id="grid-container"
      className={'ag-theme-alpine'}
      ref={gridContainerRef}
    >
      <AgGridReact
        ref={gridRef}
        rowData={books}
        columnDefs={COLUMN_DEFS}
        onGridReady={onGridReady}
      />
    </div>
  );
}

const COLUMN_DEFS = [
  {
    field: 'isbn',
    headerName: 'ISBN',
    filter: true,
    sortable: false,
    cellRenderer: CellWithAnnotationTargetAndPresence,
  },
  {
    field: 'title',
    headerName: 'Title',
    filter: true,
    sortable: true,
    cellRenderer: CellWithAnnotationTargetAndPresence,
  },
  {
    field: 'authors',
    headerName: 'Authors',
    filter: true,
    sortable: true,
    cellRenderer: CellWithAnnotationTargetAndPresence,
  },
  {
    field: 'average_rating',
    headerName: 'Rating',
    filter: true,
    sortable: true,
    cellRenderer: CellWithAnnotationTargetAndPresence,
  },
  {
    field: 'num_pages',
    headerName: 'Pages',
    filter: true,
    sortable: true,
    cellRenderer: CellWithAnnotationTargetAndPresence,
  },
  {
    field: 'publication_date',
    headerName: 'Publication Date',
    filter: true,
    sortable: true,
    cellRenderer: CellWithAnnotationTargetAndPresence,
  },
];
