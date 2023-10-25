import type { MutableRefObject } from 'react';
import { useState, useContext, useEffect } from 'react';
import { PagePresence, NotificationListLauncher } from '@cord-sdk/react';
import type { NavigateFn } from '@cord-sdk/types';

import { ThreadsContext } from '../ThreadsContext';
import { HighchartsExample } from './HighchartsExample';
import { AGGridExample } from './AGGridExample';
import { ThreadedCommentsButton } from './ThreadedCommentsButton';

export const LOCATION = { page: 'dashboard-new' };
export const CHART_ID = 'some-unique-and-stable-id-of-this-chart';
export const GRID_ID = 'some-unique-and-stable-id-of-this-grid';
function Dashboard({
  navigateRef,
  highchartsDataSeries,
}: {
  navigateRef: MutableRefObject<NavigateFn | null>;
  highchartsDataSeries?: { start: number; end: number }[];
}) {
  const { openThread, setOpenThread, setRequestToOpenThread } =
    useContext(ThreadsContext)!;

  useEffect(() => {
    navigateRef.current = (_url, _location, { threadID }) => {
      // Since our app is an SPA, we don't need to actually navigate to a
      // specific URL, but rather can just open up the indicated thread ID. We
      // then return "true" to tell Cord that we have handled the navigation and
      // it doesn't need to proceed to the actual URL navigation.
      //
      // Full documentation on the navigate hook is here:
      // https://docs.cord.com/js-apis-and-hooks/initialization#navigate-3
      setRequestToOpenThread({ threadID });
      return true;
    };
  }, [navigateRef, setRequestToOpenThread]);

  // Effect to close open thread on ESCAPE key press and also stop thread
  // creation mode
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenThread(null);
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [setOpenThread]);

  // Effect to close thread if user clicks anywhere but a Pin or Thread
  useEffect(() => {
    if (openThread) {
      const close = (event: MouseEvent) => {
        if (
          !event.composedPath().some((e) => {
            if (e instanceof Element) {
              const elName = e.tagName.toLowerCase();
              return elName === 'cord-pin' || elName === 'cord-thread';
            }
            return false;
          })
        ) {
          // user clicked somewhere that's not the pin nor thread
          setOpenThread(null);
        }
      };
      document.addEventListener('mousedown', close);
      return () => document.removeEventListener('mousedown', close);
    }
    return () => {};
  }, [openThread, setOpenThread]);

  const [threadListOpen, setThreadListOpen] = useState(false);
  return (
    <>
      <div id="dashboard">
        <div className="grid highcharts">
          <div className="header">
            <h1>Your collaborative dashboard</h1>
            <div id="collaboration">
              <ThreadedCommentsButton
                open={threadListOpen}
                setOpen={setThreadListOpen}
              />
              <PagePresence location={LOCATION} />
              <NotificationListLauncher
                onClick={() => setThreadListOpen(false)}
                // Remove this if you want all notifications from all locations
                filter={{ location: { page: 'dashboard-new' } }}
              />
            </div>
          </div>
          <div className="panel">
            <HighchartsExample
              chartId={CHART_ID}
              highchartsDataSeries={highchartsDataSeries}
            />
          </div>

          <AGGridExample gridId={GRID_ID} />
        </div>
      </div>
    </>
  );
}

export default Dashboard;
