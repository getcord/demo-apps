import React from 'react';
import { CordProvider } from '@cord-sdk/react';

import Dashboard from './components/Dashboard';
import { useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION } from './utils';
import { InformationHeader } from './components/InformationHeader';

export default function App() {
  const authToken = useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION();

  return (
    // All the Cord React components must be children of a single CordProvider component.
    <CordProvider clientAuthToken={authToken}>
      <InformationHeader />
      {authToken && <Dashboard />}
    </CordProvider>
  );
}
