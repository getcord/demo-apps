import React from 'react';
import { CordProvider } from '@cord-sdk/react';

import { InformationHeader } from '../../_common/InformationHeader';
import demoLogo from './images/cord-static-content-demo-logo.png';
import { useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION } from './utils';
import { StaticContent } from './components/StaticContent';

export default function App() {
  const authToken = useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION();
  return (
    // All the Cord React components must be children of a single CordProvider component.
    <CordProvider clientAuthToken={authToken}>
      <InformationHeader
        demoLogo={demoLogo}
        componentNames={[
          'cord-presence-observer',
          'cord-presence-facepile',
          'cord-sidebar',
          'cord-sidebar-launcher',
        ]}
      />
      {authToken && <StaticContent />}
    </CordProvider>
  );
}
