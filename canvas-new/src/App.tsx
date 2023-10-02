import { CordProvider } from '@cord-sdk/react';

import { InformationHeader } from '../../_common/InformationHeader';
import { CanvasAndCommentsProvider } from './CanvasAndCommentsContext';
import { EXAMPLE_CORD_LOCATION } from './canvasUtils';
import { CanvasWindow } from './components/CanvasWindow';
import { useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION } from './utils';

export default function App() {
  // This must be replaced with your code that obtains the client auth token
  // from your own backend, signed with your own API secret.
  const clientAuthToken = useCordSampleToken_DEMO_ONLY_NOT_FOR_PRODUCTION();

  return (
    // All the Cord React components must be children of a single CordProvider component.
    <CordProvider clientAuthToken={clientAuthToken}>
      <InformationHeader
        components={['cord-avatar', 'cord-message', 'cord-thread']}
        api={['thread', 'user']}
      />
      {clientAuthToken && (
        <CanvasAndCommentsProvider location={EXAMPLE_CORD_LOCATION}>
          <CanvasWindow />
        </CanvasAndCommentsProvider>
      )}
    </CordProvider>
  );
}
