import { CordProvider } from '@cord-sdk/react';

import { InformationHeader } from '../../_common/InformationHeader';
import { useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION } from './utils';
import { VideoPlayer } from './components/VideoPlayer';
// The playground token is only used on cord.com and docs.cord.com, you can ignore it!
import { playgroundToken } from './playgroundToken.json';

export default function App() {
  const sampleToken = useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION();
  const clientAuthToken = playgroundToken ?? sampleToken;

  return (
    // All the Cord React components must be children of a single CordProvider component.
    <CordProvider clientAuthToken={clientAuthToken}>
      <InformationHeader
        components={[
          'cord-threaded-comments',
          'cord-thread',
          'cord-pin',
          'cord-page-presence',
          'cord-notification-list-launcher',
        ]}
        api={['thread']}
        app="video-player"
      />
      {clientAuthToken && (
        <VideoPlayer
          video={
            'https://cdn.cord.com/cord-website-video/cord-website-video-with-subs-1080p.mp4'
          }
        />
      )}
    </CordProvider>
  );
}
