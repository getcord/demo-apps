import React from 'react';
import { CordProvider } from '@cord-sdk/react';

import Canvas from './components/Canvas';
import { useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION } from './utils';
import { InformationHeader } from './components/InformationHeader';

export default function App() {
  // This must be replaced with your code that obtains the client auth token
  // from your own backend, signed with your own API secret.
  const clientAuthToken = useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION();

  return (
    // All the Cord React components must be children of a single CordProvider component.
    <CordProvider clientAuthToken={clientAuthToken}>
      <InformationHeader />
      <Canvas />
    </CordProvider>
  );
}
