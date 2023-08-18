import { CordProvider } from '@cord-sdk/react';

import { InformationHeader } from '../../_common/InformationHeader';
import { useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION } from './utils';
import { Document } from './components/Document';
import { ThreadsProvider } from './ThreadsContext';

export default function App() {
  const authToken = useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION();
  return (
    // All the Cord React components must be children of a single CordProvider component.
    <CordProvider clientAuthToken={authToken}>
      <InformationHeader
        api={['presence']}
        components={['cord-avatar', 'cord-thread']}
      />
      {authToken && (
        <ThreadsProvider>
          <Document />
        </ThreadsProvider>
      )}
    </CordProvider>
  );
}
