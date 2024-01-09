import { CordProvider } from '@cord-sdk/react';
import type { NavigateFn } from '@cord-sdk/types';

import { useRef } from 'react';
import { InformationHeader } from '../../_common/InformationHeader';
import Dashboard from './components/Dashboard';
import {
  handleBeforeMessageCreate,
  useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION,
} from './utils';
import { ThreadsProvider } from './ThreadsContext';
// The playground token is only used on cord.com and docs.cord.com, you can ignore it!
import { playgroundToken } from './playgroundToken.json';

export default function App() {
  const sampleToken = useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION();
  const navigateRef = useRef<NavigateFn | null>(null);
  const clientAuthToken = playgroundToken ?? sampleToken;

  return (
    // All the Cord React components must be children of a single CordProvider
    // component, which is passed the clientAuthToken so the Cord components
    // know which user they're connecting as. The "navigate" function is
    // optional and used here to make clicking on notifications work better (see
    // it's actual implementation in Dashboard.tsx).
    //
    // All props to CordProvider, along with the Cord init process in general,
    // are documented here:
    // https://docs.cord.com/js-apis-and-hooks/initialization
    <CordProvider
      clientAuthToken={clientAuthToken}
      navigate={(...args) => navigateRef.current?.(...args) ?? false}
      beforeMessageCreate={handleBeforeMessageCreate}
    >
      <InformationHeader
        components={[
          'cord-thread',
          'cord-notification-list-launcher',
          'cord-threaded-comments',
          'cord-presence-facepile',
          'cord-presence-observer',
          'cord-page-presence',
        ]}
        api={['thread', 'user']}
        darkTheme
        app="dashboard"
      />
      {clientAuthToken && (
        <ThreadsProvider>
          <Dashboard navigateRef={navigateRef} />
        </ThreadsProvider>
      )}
    </CordProvider>
  );
}
