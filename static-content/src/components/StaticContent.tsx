import { useState } from 'react';
import {
  Sidebar,
  MultipleCursors,
  PresenceObserver,
  PresenceFacepile,
  SidebarLauncher,
} from '@cord-sdk/react';
import SyntaxHighlighter from 'react-syntax-highlighter';

import {
  CORD_TOKEN_LOCALSTORAGE_KEY,
  getLocalStorageItemWithExpiry,
} from '../utils';

export function StaticContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { value: clientAuthToken } = getLocalStorageItemWithExpiry(
    CORD_TOKEN_LOCALSTORAGE_KEY,
  );
  return (
    <>
      <div
        className="flex playground--content with-demo-app-header"
        style={{ marginRight: isSidebarOpen ? '392px' : 0 }}
      >
        <div
          id="top-right-container"
          // Sidebar width + 8px margin
          style={{ right: isSidebarOpen ? `${392 + 8}px` : 0 }}
        >
          <SidebarLauncher label={'Comments'} />
        </div>
        <div className="flex__leftCol">
          <Sidebar
            showLauncher={false}
            onOpen={() => setIsSidebarOpen(true)}
            onClose={() => setIsSidebarOpen(false)}
            location={{ page: 'playground' }}
          />
          <MultipleCursors location={{ page: 'playground' }} />
        </div>
        <div className="with-cord-presence">
          <div id="titleEmoji">🎡</div>

          <PresenceObserver location={{ page: 'playground', item: 'header' }}>
            <div className="cord-presence top-s">
              <PresenceFacepile
                location={{ page: 'playground', item: 'header' }}
              />
            </div>
            <h1 id="title">{`Collaboration in minutes, not months!`}</h1>
          </PresenceObserver>

          <PresenceObserver
            location={{ page: 'playground', item: 'block-1', part: 'title' }}
          >
            <div className="cord-presence top-l">
              <PresenceFacepile
                location={{
                  page: 'playground',
                  item: 'block-1',
                  part: 'title',
                }}
              />
            </div>
            <h5 className="font-large">What’s going on here then?</h5>
          </PresenceObserver>

          <PresenceObserver
            location={{ page: 'playground', item: 'block-1', part: 'text' }}
          >
            <div className="cord-presence top-xs">
              <PresenceFacepile
                location={{ page: 'playground', item: 'block-1', part: 'text' }}
              />
            </div>
            <p data-cord-annotation-target="text-annotation">
              This page shows how Cord offers collaboration out of the box with
              the <b>Sidebar</b> component. By installing the Cord SDK and
              adding the component to your application, you can get comments,
              annotations, tasks, an inbox, live presence, and more. You can
              customize the look and feel to match your brand.
            </p>
          </PresenceObserver>

          <PresenceObserver
            location={{ page: 'playground', item: 'block-2', part: 'title' }}
          >
            <div className="cord-presence top-m">
              <PresenceFacepile
                location={{
                  page: 'playground',
                  item: 'block-2',
                  part: 'title',
                }}
              ></PresenceFacepile>
            </div>
            <h5 className=" font-large">Try Cord in your application</h5>
          </PresenceObserver>

          <PresenceObserver
            location={{ page: 'playground', item: 'block-2', part: 'text' }}
          >
            <div className="cord-presence top-xs">
              <PresenceFacepile
                location={{ page: 'playground', item: 'block-2', part: 'text' }}
              />
            </div>
            <p>
              This code snippet will display a live sidebar in your application.
              Simply open the browser console in your app’s URL and paste the
              following snippet:
            </p>
          </PresenceObserver>

          <PresenceObserver
            location={{ page: 'playground', item: 'block-2', part: 'code' }}
          >
            <div className="cord-presence top-xs">
              <PresenceFacepile
                location={{ page: 'playground', item: 'block-2', part: 'code' }}
              />
            </div>
            <SyntaxHighlighter
              language="javascript"
              customStyle={{ fontSize: '16px' }}
            >
              {generateCodeSnippet(clientAuthToken)}
            </SyntaxHighlighter>
          </PresenceObserver>
        </div>
      </div>
    </>
  );
}

const generateCodeSnippet = (clientAuthToken: string) => {
  return `// Add Cord SDK to the page
  const script = document.createElement('script');
  script.src = 'https://app.cord.com/sdk/v1/sdk.latest.js';
  // Wait for the script to load to initialize Cord
  script.addEventListener('load', () => {
    window.CordSDK.init({
      client_auth_token: \`${clientAuthToken}\`,
    });
    // Create a cord-thread and add it to the page
    const thread = document.createElement('cord-thread');
    thread.setAttribute('thread-id', \`my-awesome-thread-id-${crypto.randomUUID()}\`);
    // Use the new version of Cord components, which are fully CSS customizable
    thread.setAttribute('use-shadow-root', false);
    // Style the cord-thread to make it always visible on the page
    thread.style.position = 'fixed'; 
    thread.style.top = '45%'; 
    thread.style.left = '10%'; 
    thread.style.width = '350px';
    document.body.appendChild(thread);
  });
  document.body.appendChild(script);`;
};
