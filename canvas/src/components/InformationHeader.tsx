import React from 'react';

import cord from '../images/cord.svg';
import demoLogo from '../images/cord-canvas-demo-logo.png';
import { ComponentsDropdown } from './ComponentsDropdown';

export function InformationHeader() {
  return (
    <header>
      <div id="logo">
        <img src={demoLogo} />
        <img src={cord} />
      </div>
      <div id="links">
        <ComponentsDropdown
          componentNames={[
            'cord-floating-threads',
            'cord-thread-list',
            'cord-page-presence',
          ]}
          walkthroughURL={'https://docs.cord.com/components/'}
        />
        <a
          className="button"
          href="https://console.cord.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get your API keys
        </a>
      </div>
    </header>
  );
}
