import { CordProvider } from '@cord-sdk/react';

import { InformationHeader } from '../../_common/InformationHeader';
import { useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION } from './utils';
import { Document } from './components/Document';
import { ThreadsProvider } from './ThreadsContext';
// The playground token is only used on cord.com and docs.cord.com, you can ignore it!
import { playgroundToken } from './playgroundToken.json';

export default function App() {
  const sampleToken = useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION();
  const clientAuthToken = playgroundToken ?? sampleToken;

  return (
    // All the Cord React components must be children of a single CordProvider component.
    <CordProvider clientAuthToken={clientAuthToken}>
      <InformationHeader
        api={['presence', 'thread', 'user']}
        components={['cord-avatar', 'cord-thread', 'cord-threaded-comments']}
        app="document"
      />
      {clientAuthToken && (
        <ThreadsProvider>
          <Document />
        </ThreadsProvider>
      )}
    </CordProvider>
  );
}
