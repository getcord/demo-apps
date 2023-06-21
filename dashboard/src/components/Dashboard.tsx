import type { MutableRefObject } from 'react';
import { useState, useContext, useEffect } from 'react';
import { PagePresence, NotificationListLauncher } from '@cord-sdk/react';
import type { NavigateFn } from '@cord-sdk/types';
import cx from 'classnames';

import { ThreadsContext } from '../ThreadsContext';
import { HighchartsExample } from './HighchartsExample';
import { AGGridExample } from './AGGridExample';
import { ThreadListButton } from './ThreadListButton';
import { Panel } from './Panel';

export const LOCATION = { page: 'dashboard' };
export const CHART_ID = 'some-unique-and-stable-id-of-this-chart';
export const GRID_ID = 'some-unique-and-stable-id-of-this-grid';
function Dashboard({
  navigateRef,
}: {
  navigateRef: MutableRefObject<NavigateFn | null>;
}) {
  const {
    inThreadCreationMode,
    setInThreadCreationMode,
    openThread,
    setOpenThread,
    setRequestToOpenThread,
  } = useContext(ThreadsContext)!;

  useEffect(() => {
    navigateRef.current = (_url, _location, { threadID }) => {
      // Since our app is an SPA, we don't need to actually navigate to a
      // specific URL, but rather can just open up the indicated thread ID. We
      // then return "true" to tell Cord that we have handled the navigation and
      // it doesn't need to proceed to the actual URL navigation.
      //
      // Full documentation on the navigate hook is here:
      // https://docs.cord.com/js-apis-and-hooks/initialization#navigate-3
      setRequestToOpenThread(threadID);
      return true;
    };
  }, [navigateRef, setRequestToOpenThread]);

  // Effect to close open thread on ESCAPE key press and also stop thread
  // creation mode
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenThread(null);
        setInThreadCreationMode(false);
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [setInThreadCreationMode, setOpenThread]);

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
      <div
        id="dashboard"
        className={cx({ 'in-thread-mode': inThreadCreationMode })}
      >
        <div className="header">
          <h1>Your collaborative dashboard</h1>
          <div id="collaboration">
            <button
              className="action-button add-thread"
              onClick={() => setInThreadCreationMode((val) => !val)}
            >
              Add comment
            </button>
            <ThreadListButton
              open={threadListOpen}
              setOpen={setThreadListOpen}
            />
            <NotificationListLauncher
              onClick={() => setThreadListOpen(false)}
              label="Notifications"
            />
            <PagePresence location={LOCATION} />
          </div>
        </div>

        <div className="grid">
          <Panel title="Consumer expenditure on books in the United States from 1999 to 2020">
            <HighchartsExample chartId={CHART_ID} />
          </Panel>

          <Panel title="Short list of books found on Goodreads">
            <AGGridExample gridId={GRID_ID} />
          </Panel>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
