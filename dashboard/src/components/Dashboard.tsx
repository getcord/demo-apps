import type { MutableRefObject } from 'react';
import { useRef, useEffect } from 'react';
import { PagePresence, beta, NotificationListLauncher } from '@cord-sdk/react';
import type {
  HTMLCordFloatingThreadsElement,
  NavigateFn,
} from '@cord-sdk/types';

import { HighchartsExample } from './HighchartsExample';
import { AGGridExample } from './AGGridExample';
import { ThreadListButton } from './ThreadListButton';
import { Panel } from './Panel';

export const LOCATION = { page: 'dashboard' };
function Dashboard({
  navigateRef,
}: {
  navigateRef: MutableRefObject<NavigateFn | null>;
}) {
  const floatingThreadsRef = useRef<HTMLCordFloatingThreadsElement | null>(
    null,
  );

  useEffect(() => {
    navigateRef.current = (_url, _location, { threadID }) => {
      // Since our app is an SPA, we don't need to actually navigate to a
      // specific URL, but rather can just open up the indicated thread ID. We
      // then return "true" to tell Cord that we have handled the navigation and
      // it doesn't need to proceed to the actual URL navigation.
      //
      // Full documentation on the navigate hook is here:
      // https://docs.cord.com/js-apis-and-hooks/initialization#navigate-3
      floatingThreadsRef.current?.openThread(threadID);
      return true;
    };
  }, [navigateRef]);

  return (
    <>
      <div id="dashboard">
        <div className="header">
          <h1>Your collaborative dashboard</h1>
          <div id="collaboration">
            <beta.FloatingThreads
              location={LOCATION}
              ref={floatingThreadsRef}
            />
            <ThreadListButton floatingThreadsRef={floatingThreadsRef} />
            <NotificationListLauncher label="Notifications" />
            <PagePresence location={LOCATION} />
          </div>
        </div>

        <div className="grid">
          <Panel title="Consumer expenditure on books in the United States from 1999 to 2020">
            <HighchartsExample />
          </Panel>

          <Panel title="Short list of books found on Goodreads">
            <AGGridExample />
          </Panel>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
