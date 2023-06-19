import { useEffect, useRef, useState } from 'react';
import {
  useCordAnnotationTargetRef,
  useCordAnnotationCaptureHandler,
  useCordAnnotationClickHandler,
  useCordAnnotationRenderer,
} from '@cord-sdk/react';
import * as Highcharts from 'highcharts';
import type { TooltipPositionerPointObject } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import cx from 'classnames';
import chartData from '../chartData.json';

function planarDistance(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

type HighchartsAnnotationLocation = {
  section: string;
  series: number;
  pointIndex: number;
  x: number;
  y: number;
};

export function HighchartsExample() {
  const [selectedDateRange, setSelectedDateRange] = useState(
    DATE_RANGE_SELECTOR_OPTIONS[0],
  );
  const highchartsRef = useRef<HighchartsReact.RefObject>(null);

  const location = { section: 'chart' };

  const annotationTargetRef = useCordAnnotationTargetRef<
    HTMLDivElement,
    HighchartsAnnotationLocation
  >(location);

  useEffect(() => {
    const element = annotationTargetRef.current;

    if (!element) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      highchartsRef.current?.chart.reflow();
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.unobserve(element);
    };
  }, [annotationTargetRef]);

  useEffect(() => {
    highchartsRef.current?.chart.xAxis[0].setExtremes(
      selectedDateRange.start,
      selectedDateRange.end,
    );
  }, [selectedDateRange]);

  // Runs when users click on the screen to annotate.
  // The pin will be attached to the closest data point relative to the location of the user click.
  useCordAnnotationCaptureHandler<HighchartsAnnotationLocation>(
    location,
    ({ x, y }) => {
      const chart = highchartsRef.current?.chart;
      if (chart) {
        const { plotLeft, plotTop } = chart;
        const plotRelativeX = x - plotLeft;
        const plotRelativeY = y - plotTop;

        let minDistance = Infinity;
        let closestPoint: Highcharts.Point | undefined;

        for (const series of chart.series) {
          for (const point of series.points) {
            const { plotX, plotY } = point;

            if (plotX !== undefined && plotY !== undefined) {
              const distance = planarDistance(
                plotX,
                plotY,
                plotRelativeX,
                plotRelativeY,
              );

              if (distance < minDistance) {
                minDistance = distance;
                closestPoint = point;
              }
            }
          }
        }

        if (closestPoint) {
          return {
            // Storing the location of the annotated data point.
            extraLocation: {
              x: closestPoint.x,
              y: closestPoint.y,
              series: closestPoint.series.index,
              pointIndex: closestPoint.index,
            },
            // Showing data point information in annotation pill.
            label: `${closestPoint.series.name}: ${closestPoint.x}`,
          };
        }
      }
    },
  );

  const { redrawAnnotations } =
    useCordAnnotationRenderer<HighchartsAnnotationLocation>(
      location,
      (annotation) => {
        const chart = highchartsRef.current?.chart;
        const container = highchartsRef.current?.container?.current;

        if (chart && container) {
          if (!chart.series[annotation.location.series].visible) {
            return;
          }

          return {
            element: container,
            coordinates: {
              x: chart.xAxis[0].toPixels(annotation.location.x, false),
              y: chart.yAxis[0].toPixels(annotation.location.y, false),
            },
          };
        }
      },
    );

  // Runs when a user clicks on the annotation pill within the sidebar.
  useCordAnnotationClickHandler<HighchartsAnnotationLocation>(
    location,
    (annotation) => {
      highchartsRef.current?.chart.series[
        annotation.location.series
      ].setVisible(true);

      const chart = highchartsRef.current?.chart;

      chart?.series[annotation.location.series].points[
        annotation.location.pointIndex
      ].setState('hover');

      setTimeout(
        () =>
          chart?.series[annotation.location.series].points[
            annotation.location.pointIndex
          ].setState('normal'),
        2000,
      );

      for (const range of DATE_RANGE_SELECTOR_OPTIONS) {
        if (
          annotation.location.x >= range.start &&
          annotation.location.x <= range.end &&
          range !== selectedDateRange
        ) {
          setSelectedDateRange(range);
          break;
        }
      }
    },
  );

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
              onClick={() => {
                setSelectedDateRange({ start, end });
              }}
            >
              {start} - {end}
            </button>
          );
        })}
      </div>
      <div ref={annotationTargetRef}>
        <HighchartsReact
          ref={highchartsRef}
          highcharts={Highcharts}
          options={{
            title: {
              text: null,
            },

            yAxis: {
              title: {
                text: 'Expenditure in billion U.S. dollars',
              },
            },

            xAxis: {
              min: 1999,
              max: 2009,
              accessibility: {
                rangeDescription: 'Range: 1999 to 2020',
              },
              tickInterval: 1,
            },

            legend: {
              layout: 'horizontal',
              align: 'center',
              verticalAlign: 'bottom',
              itemStyle: {
                color: '#4A4A4A',
              },
            },

            plotOptions: {
              series: {
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
            },

            tooltip: {
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
            },

            chart: {
              style: {
                fontFamily:
                  'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
              },
              events: {
                render: redrawAnnotations,
              },
            },

            series: chartData,
          }}
        />
      </div>
    </>
  );
}

const DATE_RANGE_SELECTOR_OPTIONS = [
  { start: 1999, end: 2009 },
  { start: 2010, end: 2020 },
];
