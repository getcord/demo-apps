import { CordProvider } from '@cord-sdk/react';

import { InformationHeader } from '../../_common/InformationHeader';
import { componentsUsed } from '../../_common/componentsList';
import demoLogo from './images/cord-static-content-demo-logo.png';
import { useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION } from './utils';
import { VideoPlayer } from './components/VideoPlayer';

export default function App() {
  const authToken = useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION();
  return (
    // All the Cord React components must be children of a single CordProvider component.
    <CordProvider clientAuthToken={authToken}>
      <InformationHeader
        demoLogo={demoLogo}
        componentNames={componentsUsed.videoPlayer}
      />
      {authToken && <VideoPlayer />}
    </CordProvider>
  );
}
