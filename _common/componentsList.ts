import type { CordComponentNames } from './ComponentsDropdown';

type AppNames = 'canvas' | 'dashboard' | 'staticContent';

export const componentsUsed: {
  [key in AppNames]: CordComponentNames[];
} = {
  canvas: ['cord-floating-threads', 'cord-thread-list', 'cord-page-presence'],
  dashboard: [
    'cord-page-presence',
    'cord-thread-list',
    'cord-floating-threads',
  ],
  staticContent: [
    'cord-presence-observer',
    'cord-presence-facepile',
    'cord-sidebar',
    'cord-sidebar-launcher',
  ],
};
