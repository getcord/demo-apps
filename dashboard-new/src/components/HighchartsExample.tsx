import HighchartsReact from 'highcharts-react-official';
import {
  useMemo,
  useContext,
  useEffect,
  useState,
  useRef,
  useReducer,
  useCallback,
} from 'react';
import * as Highcharts from 'highcharts';
import type { TooltipPositionerPointObject } from 'highcharts';
import cx from 'classnames';
import { user } from '@cord-sdk/react';
import chartData from '../chartData.json';
import type { ChartThreadMetadata } from '../ThreadsContext';
import { ThreadsContext } from '../ThreadsContext';
import { LOCATION } from './Dashboard';
import { ThreadWrapper } from './ThreadWrapper';
import commentIcon from './CommentIcon.svg';

const DATE_RANGE_SELECTOR_OPTIONS = [
  { start: 1999, end: 2006 },
  { start: 2007, end: 2013 },
  { start: 2013, end: 2022 },
];

const COMMENT_ICON_HEIGHT_PX = 12;
const GAP_PX = 5;

type Props = {
  chartId: string;
};
export function HighchartsExample({ chartId }: Props) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const {
    setOpenThread,
    threads,
    requestToOpenThread,
    setRequestToOpenThread,
  } = useContext(ThreadsContext)!;
  const [selectedDateRange, setSelectedDateRange] = useState(
    DATE_RANGE_SELECTOR_OPTIONS[0],
  );

  // Effect to update chart's axis range when selectedDateRange changes
  useEffect(() => {
    chartRef.current?.chart.xAxis[0].setExtremes(
      selectedDateRange.start,
      selectedDateRange.end,
    );
  }, [selectedDateRange]);

  const chartParentRef = useRef<HTMLDivElement>(null);
  // Effect to update chart so that the requested thread can be displayed
  useEffect(() => {
    if (requestToOpenThread === null) {
      return;
    }

    const metadata = threads.get(requestToOpenThread);
    if (metadata?.type !== 'chart' || metadata.chartId !== chartId) {
      // request is not for this chart
      return;
    }

    // Make the requested chart series visible
    const series = chartRef.current?.chart.get(metadata.seriesId) as
      | Highcharts.Series
      | undefined;
    if (!series) {
      throw new Error('series not found');
    }
    series.setVisible(true);

    // Adjust the range of the chart axes
    const rangeForThread = DATE_RANGE_SELECTOR_OPTIONS.find(
      (range) => range.start <= metadata.x && metadata.x <= range.end,
    );
    if (!rangeForThread) {
      throw new Error(`thread ${requestToOpenThread} cannot be displayed`);
    }
    setSelectedDateRange(rangeForThread);
    // NOTE: Eagerly update the chart axis range, so that the thread we are
    // going to open does not auto-close because the axis range does not
    // match
    chartRef.current?.chart.xAxis[0].setExtremes(
      rangeForThread.start,
      rangeForThread.end,
    );

    // Scroll the page to the chart and open the thread
    chartParentRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    setRequestToOpenThread(null);
    // Open the thread with a small delay. Opening the thread immediately
    // currently stops the scrollIntoView().
    setTimeout(() => setOpenThread(requestToOpenThread), 300);
  }, [
    chartId,
    threads,
    requestToOpenThread,
    setOpenThread,
    setRequestToOpenThread,
  ]);

  // A dummy reducer with the sole purpose to re-render this component.
  // Used to to redraw positions of pins when chart redraws
  const [_, forceRerender] = useReducer((x) => x + 1, 0);
  const chartOptions = useChartOptions(chartId, chartRef, forceRerender);

  return (
    <>
      <div className="date-range-selector">
        {DATE_RANGE_SELECTOR_OPTIONS.map(({ start, end }) => {
          return (
            <button
              key={`${start}-${end}`}
              className={cx('date-range-selector-option', {
                'date-range-selector-option-active':
                  selectedDateRange.start === start &&
                  selectedDateRange.end === end,
              })}
              onClick={() => setSelectedDateRange({ start, end })}
              type="button"
            >
              {start} - {end}
            </button>
          );
        })}
      </div>
      <div ref={chartParentRef} style={{ position: 'relative' }}>
        <HighchartsReact
          ref={chartRef}
          highcharts={Highcharts}
          options={chartOptions}
        />
        {chartRef.current?.chart && (
          <ChartThreads chartId={chartId} chart={chartRef.current.chart} />
        )}
      </div>
    </>
  );
}

function useChartOptions(
  chartId: string,
  chartRef: React.RefObject<HighchartsReact.RefObject>,
  onRedraw: (() => void) | undefined,
) {
  const orgId = user.useViewerData()?.organizationID;
  const { addThread, setOpenThread } = useContext(ThreadsContext)!;

  const maybeAddComment = useCallback(() => {
    const hoverPoint = chartRef.current?.chart.hoverPoint;
    if (!hoverPoint) {
      return;
    }
    if (!orgId) {
      throw new Error('org information not ready');
    }

    const metadata = {
      type: 'chart',
      chartId,
      seriesId: hoverPoint.series.userOptions.id!,
      x: hoverPoint.x,
      y: hoverPoint.y!,
    } as const;
    // NOTE: Allow only one thread per point by using the point x,y in threadId
    // NOTE: Use orgId as part of thread Id to have unique ids across orgs
    const threadId = `${orgId}_${metadata.chartId}_${metadata.seriesId}_${metadata.x}_${metadata.y}`;
    addThread(threadId, metadata);
    setOpenThread(threadId);
  }, [addThread, chartId, chartRef, orgId, setOpenThread]);

  return useMemo(
    () => ({
      plotOptions: {
        series: {
          cursor: 'pointer',
          events: {
            click: maybeAddComment,
          },
          label: {
            connectorAllowed: false,
          },
          pointStart: 1999,
          marker: {
            states: {
              hover: {
                fillColor: '#e37400',
              },
            },
          },
        },
        column: {
          pointPadding: 0.2,
          borderWidth: 0,
          pointWidth: 22,
          borderRadius: 4,
        },
      },

      chart: {
        type: 'column',
        style: {
          fontFamily:
            'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
        },
        backgroundColor: '#2E2E2E',
        events: {
          redraw: onRedraw,
          click: maybeAddComment,
        },
      },

      series: chartData,

      // Standard options from here on
      title: {
        text: null,
      },

      yAxis: {
        title: {
          text: 'Currency in USD',
        },
        gridLineColor: 'transparent',
        labels: {
          style: {
            color: '#edeff1',
          },
        },
      },

      xAxis: {
        min: 1999,
        max: 2009,
        accessibility: {
          rangeDescription: 'Range: 1999 to 2022',
        },
        categories: [
          '1999',
          '2000',
          '2001',
          '2002',
          '2003',
          '2004',
          '2005',
          '2006',
          '2007',
          '2008',
          '2009',
          '2010',
          '2011',
          '2012',
          '2013',
          '2014',
          '2015',
          '2016',
          '2017',
          '2018',
          '2019',
          '2020',
          '2021',
          '2022',
        ],
        crosshair: { color: '#442f71' },
        tickInterval: 1,
        labels: {
          style: {
            color: '#edeff1',
          },
        },
      },

      legend: {
        layout: 'horizontal',
        align: 'right',
        verticalAlign: 'bottom',
        itemStyle: {
          color: '#edeff1',
        },
      },

      tooltip: {
        // Always show tooltip below the bar
        positioner: function (
          _labelHeight: number,
          _labelWidth: number,
          point: TooltipPositionerPointObject,
        ) {
          return {
            x: point.plotX,
            y: point.plotY + 20,
          };
        },
        borderRadius: 12,
        padding: 12,
        borderColor: 'transparent',
        backgroundColor: '#00000c',
        style: {
          color: '#edeff1',
        },
        formatter: function (): string {
          const { x, y, color, series } = this as any;
          return `
                <div style="display: flex; flex-direction: column; gap: 8px">
                  <div><b>${x}</b></div>

                  <div style="display: flex; align-items: center; gap: 4px">
                    <span style="color: ${color};">●</span>
                    ${series.name}: <b>${y}</b>
                  </div>

                  <div style="display: flex; align-items: center; gap: 4px">
                    <img src=${commentIcon} />
                    <span>Click to comment</span>
                  </div>
                </div>
        `;
        },
        useHTML: true,
      },
    }),
    [maybeAddComment, onRedraw],
  );
}

type ChartThreadsProps = {
  chartId: ChartThreadMetadata['chartId'];
  chart: Highcharts.Chart;
};

function ChartThreads({ chartId, chart }: ChartThreadsProps) {
  const { threads } = useContext(ThreadsContext)!;
  return (
    <>
      {Array.from(threads)
        .filter((keyVal): keyVal is [string, ChartThreadMetadata] => {
          const [_threadId, metadata] = keyVal;
          return metadata.type === 'chart' && metadata.chartId === chartId;
        })
        .map(([threadId, metadata]) => (
          <ChartThread
            key={threadId}
            threadId={threadId}
            metadata={metadata}
            chart={chart}
          />
        ))}
    </>
  );
}

type ChartThreadProps = {
  threadId: string;
  metadata: ChartThreadMetadata;
  chart: Highcharts.Chart;
};

function ChartThread({ threadId, metadata, chart }: ChartThreadProps) {
  const { openThread, setOpenThread } = useContext(ThreadsContext)!;
  const isVisible = isPointVisible(chart, metadata);
  const isOpen = openThread === threadId;

  // Effect to close thread if it becomes not visible
  useEffect(() => {
    if (!isVisible && isOpen) {
      setOpenThread(null);
    }
  }, [isOpen, isVisible, openThread, setOpenThread, threadId]);
  const series = chart.get(metadata.seriesId) as Highcharts.Series & {
    pointXOffset: number;
  };

  const pointPixelPosX =
    series.xAxis.toPixels(metadata.x, false) + series.pointXOffset;
  const pointPixelPosY = series.yAxis.toPixels(metadata.y, false);

  return (
    <div
      style={{
        position: 'absolute',
        // When not visible, position all the way to the left, to not
        // add unnecessary horizontal scroll.
        left: isVisible ? pointPixelPosX + GAP_PX : 0,
        // When the commented bar is visible, show the comment icon
        // on top of it.
        top: isVisible
          ? `calc(${pointPixelPosY - COMMENT_ICON_HEIGHT_PX - GAP_PX}px`
          : 0,
        transition: 'top 0.5s, left 0.5s',
        visibility: isVisible ? 'visible' : 'hidden',
        zIndex: isOpen ? 1 : 0,
      }}
    >
      <img
        key={threadId}
        src={commentIcon}
        onClick={() => setOpenThread(isOpen ? null : threadId)}
        style={{ height: COMMENT_ICON_HEIGHT_PX }}
      />

      <ThreadWrapper
        location={LOCATION}
        threadId={threadId}
        metadata={metadata}
        style={{
          position: 'absolute',
          left: 'calc(100% + 12px)',
          top: -50,
        }}
      />
    </div>
  );
}

// Check if the point that the thread's metadata is associated with is
// currently visible
function isPointVisible(
  chart: Highcharts.Chart,
  metadata: ChartThreadMetadata,
): boolean {
  const series = chart.get(metadata.seriesId) as Highcharts.Series | undefined;
  if (!series || !series.visible) {
    return false;
  }
  const point = series.points.find(
    (p) => p.x === metadata.x && p.y === metadata.y,
  );
  if (!point) {
    return false;
  }
  const { min: xMin, max: xMax } = chart.xAxis[0].getExtremes();
  // NOTE: the check of the yAxis range is not really necessary for this app
  const { min: yMin, max: yMax } = chart.yAxis[0].getExtremes();
  return (
    xMin <= metadata.x &&
    yMin <= metadata.y &&
    metadata.x <= xMax &&
    metadata.y <= yMax
  );
}