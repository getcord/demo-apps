import sidebarIcon from './images/componentIcons/sidebar-icon.svg';
import sidebarLauncherIcon from './images/componentIcons/sidebar-launcher-icon.svg';
import pagePresenceIcon from './images/componentIcons/page-presence-icon.svg';
import presenceFacepileIcon from './images/componentIcons/presence-facepile-icon.svg';
import threadIcon from './images/componentIcons/thread-icon.svg';
import threadListIcon from './images/componentIcons/thread-list-icon.svg';

const ComponentsData = {
  'cord-sidebar': {
    header: 'Sidebar',
    icon: sidebarIcon,
    link: 'https://docs.cord.com/components/cord-sidebar/',
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
    link: 'https://docs.cord.com/components/cord-page-presence/',
    description:
      'Renders a “facepile” showing the avatars of users who are (or have been) present on that page.',
  },
  'cord-presence-facepile': {
    header: 'Presence Facepile',
    icon: presenceFacepileIcon,
    link: 'https://docs.cord.com/components/cord-presence-facepile/',
    description:
      'Renders a “facepile” showing the avatars of users who are (or have been) present in a specific location — for example a section within a larger page.',
  },
  'cord-presence-observer': {
    header: 'Presence Observer',
    icon: pagePresenceIcon,
    link: 'https://docs.cord.com/components/cord-presence-observer/',
    description:
      'Observes user interaction on the DOM subtree it’s defined on, and marks the current user as present in the location when interaction is detected.',
  },
  'cord-thread': {
    header: 'Thread',
    icon: threadIcon,
    link: 'https://docs.cord.com/components/cord-thread/',
    description: 'Renders a single conversation thread.',
  },
  'cord-thread-list': {
    header: 'Thread List',
    icon: threadListIcon,
    link: 'https://docs.cord.com/components/cord-thread-list/',
    description: 'Renders the list of threads created on a given location.',
  },
};
export default ComponentsData;
