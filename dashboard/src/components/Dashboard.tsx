import React, { useState, useCallback, useRef } from 'react';
import { PagePresence, beta, ThreadList } from '@cord-sdk/react';
import { usePopper } from 'react-popper';
import type { HTMLCordFloatingThreadsElement } from '@cord-sdk/types';

import { HighchartsExample } from './HighchartsExample';
import { AGGridExample } from './AGGridExample';

const LOCATION = { page: 'dashboard' };
function Dashboard() {
  const floatingThreadsRef = useRef<HTMLCordFloatingThreadsElement | null>(
    null,
  );

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

function ThreadListButton({
  floatingThreadsRef,
}: {
  floatingThreadsRef: React.MutableRefObject<HTMLCordFloatingThreadsElement | null>;
}) {
  const [referenceElement, setReferenceElement] =
    useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(
    null,
  );
  const [threadListOpen, setThreadListOpen] = useState(false);
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: 'bottom-start',
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [-155, 0],
        },
      },
    ],
  });

  const toggleThreadList = useCallback(() => {
    setThreadListOpen((prev) => !prev);
  }, []);

  const handleOpenThread = useCallback(
    (threadID: string) => {
      floatingThreadsRef.current?.openThread(threadID);
    },
    [floatingThreadsRef],
  );

  return (
    <>
      <button
        className="threadlist-button"
        style={
          threadListOpen
            ? { color: '#f8f9fa', backgroundColor: '#476b9b' }
            : undefined
        }
        ref={setReferenceElement}
        onClick={toggleThreadList}
      >
        <InboxIcon />
        All comments
      </button>
      {threadListOpen && (
        <div
          className="threadlist-container"
          ref={setPopperElement}
          style={styles.popper}
          {...attributes.popper}
        >
          <ThreadList location={LOCATION} onThreadClick={handleOpenThread} />
        </div>
      )}
    </>
  );
}

function Panel(props: React.PropsWithChildren<{ title: string }>) {
  return (
    <div className="panel">
      <h2>{props.title}</h2>
      {props.children}
    </div>
  );
}

function InboxIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.1488 3.16455H3.88004C3.54125 3.16455 3.2666 3.4392 3.2666 3.77799V16.0467C3.2666 16.3855 3.54125 16.6602 3.88004 16.6602H16.1488C16.4876 16.6602 16.7622 16.3855 16.7622 16.0467V3.77799C16.7622 3.4392 16.4876 3.16455 16.1488 3.16455Z"
        stroke="currentColor"
        strokeWidth="1.64"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.2666 12.3661H6.08075C6.1604 12.3658 6.23933 12.3812 6.31301 12.4115C6.3867 12.4418 6.45369 12.4863 6.51015 12.5425L7.99774 14.03C8.0542 14.0862 8.12119 14.1307 8.19488 14.161C8.26856 14.1913 8.34749 14.2067 8.42714 14.2064H11.6017C11.6813 14.2067 11.7603 14.1913 11.834 14.161C11.9076 14.1307 11.9746 14.0862 12.0311 14.03L13.5187 12.5425C13.5751 12.4863 13.6421 12.4418 13.7158 12.4115C13.7895 12.3812 13.8684 12.3658 13.9481 12.3661H16.7622"
        stroke="currentColor"
        strokeWidth="1.64"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Dashboard;
