import React from 'react';
import { CordProvider } from '@cord-sdk/react';

import { InformationHeader } from '../../_common/InformationHeader';
import demoLogo from './images/cord-dashboard-demo-logo.png';
import Dashboard from './components/Dashboard';
import { useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION } from './utils';

export default function App() {
  const authToken = useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION();

  return (
    // All the Cord React components must be children of a single CordProvider component.
    <CordProvider clientAuthToken={authToken}>
      <InformationHeader
        demoLogo={demoLogo}
        componentNames={[
          'cord-page-presence',
          'cord-sidebar',
          'cord-sidebar-launcher',
        ]}
      />
      {authToken && <Dashboard />}
    </CordProvider>
  );
}
