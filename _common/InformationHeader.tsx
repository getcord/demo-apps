import * as React from 'react';

import cord from './images/cord.svg';
import type { CordComponentNames } from './ComponentsDropdown';
import { ComponentsDropdown } from './ComponentsDropdown';

type Props = {
  componentNames: CordComponentNames[];
  demoLogo: string;
};

export function InformationHeader({ componentNames, demoLogo }: Props) {
  return (
    <header>
      <div id="logo">
        <img src={demoLogo} />
        <img src={cord} />
      </div>
      <div id="links">
        <ComponentsDropdown
          componentNames={componentNames}
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
