import type { CordComponentNames } from './ComponentsDropdown';

type AppNames = 'canvas' | 'dashboard' | 'staticContent' | 'videoPlayer';

export const componentsUsed: {
  [key in AppNames]: CordComponentNames[];
} = {
  canvas: ['cord-floating-threads', 'cord-thread-list', 'cord-page-presence'],
  dashboard: [
    'cord-page-presence',
    'cord-pin',
    'cord-thread',
    'cord-thread-list',
  ],
  staticContent: [
    'cord-presence-observer',
    'cord-presence-facepile',
    'cord-sidebar',
    'cord-sidebar-launcher',
  ],
  videoPlayer: [
    'cord-pin',
    'cord-thread',
    // TODO(am) rip this entire component list down, and replace with a simpler dropdown
    // Video player also uses 'cord-composer' and 'cord-threaded-comments', but we don't have icons
    // for those.
  ],
};
