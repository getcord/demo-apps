import { CordProvider } from '@cord-sdk/react';

import { InformationHeader } from '../../_common/InformationHeader';
import { useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION } from './utils';
import { VideoPlayer } from './components/VideoPlayer';

export default function App() {
  const authToken = useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION();
  return (
    // All the Cord React components must be children of a single CordProvider component.
    <CordProvider clientAuthToken={authToken}>
      <InformationHeader
        components={[
          'cord-threaded-comments',
          'cord-thread',
          'cord-pin',
          'cord-page-presence',
          'cord-notification-list-launcher',
        ]}
        api={['thread']}
      />
      {authToken && <VideoPlayer />}
    </CordProvider>
  );
}
