import { CordProvider } from '@cord-sdk/react';
import type { NavigateFn } from '@cord-sdk/types';

import { useRef } from 'react';
import { InformationHeader } from '../../_common/InformationHeader';
import Dashboard from './components/Dashboard';
import { useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION } from './utils';
import { ThreadsProvider } from './ThreadsContext';

export default function App() {
  const authToken = useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION();
  const navigateRef = useRef<NavigateFn | null>(null);

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
      clientAuthToken={authToken}
      navigate={(...args) => navigateRef.current?.(...args) ?? false}
    >
      <InformationHeader />
      {authToken && (
        <ThreadsProvider>
          <Dashboard navigateRef={navigateRef} />
        </ThreadsProvider>
      )}
    </CordProvider>
  );
}
