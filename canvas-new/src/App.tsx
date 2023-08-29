import { CordProvider } from '@cord-sdk/react';

import { InformationHeader } from '../../_common/InformationHeader';
import Canvas from './components/Canvas';
import { useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION } from './utils';

export default function App() {
  // This must be replaced with your code that obtains the client auth token
  // from your own backend, signed with your own API secret.
  const clientAuthToken = useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION();

  return (
    // All the Cord React components must be children of a single CordProvider component.
    <CordProvider clientAuthToken={clientAuthToken}>
      <InformationHeader
        components={['cord-thread', 'cord-pin']}
        api={['thread']}
      />
      <Canvas />
    </CordProvider>
  );
}
