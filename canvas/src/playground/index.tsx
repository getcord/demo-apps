import { CordProvider } from '@cord-sdk/react';
import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom/client';

import Canvas from '../components/Canvas';
import { ComponentsDropdown } from '../components/ComponentsDropdown';
import '../css/index.css';
import componentsDropdownCSS from '../css/components-dropdown.css';
import {
  startRoomSession,
  useCordDemoRooms,
  useCordPlaygroundToken,
} from '../../../../../playground/util';
import './playground.css';
import shareRoomButtonCSS from './componentCSS/share-room-button.css';

function App() {
  useCordDemoRooms();
  const cordAuthToken = useCordPlaygroundToken();
  return (
    <CordProvider clientAuthToken={cordAuthToken}>
      {cordAuthToken && <Canvas />}
    </CordProvider>
  );
}

function ShareRoomButton() {
  const [buttonText, setButtonText] = useState('Share room');

  const startRooms = useCallback(() => {
    startRoomSession();
    setButtonText('Invite copied!');

    setTimeout(() => setButtonText('Share room'), 2000);
  }, []);

  return (
    <>
      <style>{shareRoomButtonCSS}</style>
      <button className={'share-room-button'} onClick={startRooms}>
        {buttonText}
      </button>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

ReactDOM.createRoot(
  document
    .getElementById('headers')
    ?.shadowRoot?.getElementById('share-room-button-container')!,
).render(<ShareRoomButton />);

ReactDOM.createRoot(
  document
    .getElementById('headers')
    ?.shadowRoot?.getElementById('components-dropdown-button-container')!,
).render(
  <>
    <style>{componentsDropdownCSS}</style>
    <ComponentsDropdown
      componentNames={[
        'cord-page-presence',
        'cord-sidebar',
        'cord-sidebar-launcher',
      ]}
      walkthroughURL={'https://docs.cord.com/components/'}
    />
  </>,
);
