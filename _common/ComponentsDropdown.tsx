import { useState } from 'react';
import cx from 'classnames';

import upSolid from './images/up-solid.svg';
import downSolid from './images/down-solid.svg';
import puzzlePiece from './images/puzzle-piece.svg';
import sidebarIcon from './images/componentIcons/sidebar-icon.svg';
import sidebarLauncherIcon from './images/componentIcons/sidebar-launcher-icon.svg';
import pagePresenceIcon from './images/componentIcons/page-presence-icon.svg';
import presenceFacepileIcon from './images/componentIcons/presence-facepile-icon.svg';
import threadIcon from './images/componentIcons/thread-icon.svg';
import threadListIcon from './images/componentIcons/thread-list-icon.svg';
import componentsDropdownCSS from './components-dropdown.css';

export type CordComponentNames = keyof typeof ComponentsData;

type Props = {
  componentNames: Array<CordComponentNames>;
  walkthroughURL: string;
};

const ComponentsData = {
  'cord-sidebar': {
    header: 'Sidebar',
    icon: sidebarIcon,
    link: 'https://docs.cord.com/components/cord-sidebar',
    description:
      'Renders the Cord sidebar, positioned fixed on the right side of your website.',
  },
  'cord-sidebar-launcher': {
    header: 'Sidebar Launcher',
    icon: sidebarLauncherIcon,
    link: 'https://docs.cord.com/components/cord-sidebar-launcher',
    description:
      'Renders a customizable button to open and close the sidebar that you can choose to place anywhere in your application UI.',
  },
  'cord-page-presence': {
    header: 'Page Presence',
    icon: pagePresenceIcon,
    link: 'https://docs.cord.com/components/cord-page-presence',
    description:
      'Renders a “facepile” showing the avatars of users who are (or have been) present on that page.',
  },
  'cord-presence-facepile': {
    header: 'Presence Facepile',
    icon: presenceFacepileIcon,
    link: 'https://docs.cord.com/components/cord-presence-facepile',
    description:
      'Renders a “facepile” showing the avatars of users who are (or have been) present in a specific location — for example a section within a larger page.',
  },
  'cord-presence-observer': {
    header: 'Presence Observer',
    icon: pagePresenceIcon,
    link: 'https://docs.cord.com/components/cord-presence-observer',
    description:
      'Observes user interaction on the DOM subtree it’s defined on, and marks the current user as present in the location when interaction is detected.',
  },
  'cord-thread': {
    header: 'Thread',
    icon: threadIcon,
    link: 'https://docs.cord.com/components/cord-thread',
    description: 'Renders a single conversation thread.',
  },
  'cord-thread-list': {
    header: 'Thread List',
    icon: threadListIcon,
    link: 'https://docs.cord.com/components/cord-thread-list',
    description: 'Renders the list of threads created on a given location.',
  },
  'cord-floating-threads': {
    header: 'Floating Threads',
    icon: sidebarLauncherIcon,
    link: 'https://docs.cord.com/components/cord-floating-threads',
    description: 'Renders the threads on the page as annotation pointers.',
  },
};

export function ComponentsDropdown(props: Props) {
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const components = props.componentNames.map(
    (componentName) => ComponentsData[componentName],
  );

  return (
    <>
      <style>{componentsDropdownCSS}</style>
      <div className="components-dropdown-container">
        <div
          className={cx('components-dropdown-button', {
            'components-dropdown-button-pressed': showDropdownMenu,
          })}
          onClick={() => setShowDropdownMenu(!showDropdownMenu)}
        >
          <img src={puzzlePiece} className={'puzzle-piece-icon'} />
          Cord components
          <img src={showDropdownMenu ? upSolid : downSolid} />
        </div>
        {showDropdownMenu && (
          <>
            <div className="components-dropdown-menu">
              <div className="components-dropdown-menu-items">
                <div>Used on this page:</div>
                {components.map((item, i) => {
                  return <MenuItem key={i} {...item} />;
                })}
              </div>
            </div>
            <div className="modal" onClick={() => setShowDropdownMenu(false)} />
          </>
        )}
      </div>
    </>
  );
}

type MenuItemProps = {
  header: string;
  link: string;
  icon: string;
  description: string;
};

function MenuItem(props: MenuItemProps) {
  const { header, link, icon } = props;
  return (
    <>
      <div className="separator" />
      <div className="components-dropdown-menu-item">
        <img src={icon} height={'30px'} className="components-menu-item-icon" />
        <a
          href={link}
          className="components-dropdown-menu-item-header"
          target="_blank"
          rel="noopener noreferrer"
        >
          {header}
        </a>
      </div>
    </>
  );
}
