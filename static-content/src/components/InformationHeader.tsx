import React from 'react';

import cord from '../images/cord.svg';
import demoLogo from '../images/cord-static-content-demo-logo.png';
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
            'cord-presence-observer',
            'cord-presence-facepile',
            'cord-sidebar',
            'cord-sidebar-launcher',
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
