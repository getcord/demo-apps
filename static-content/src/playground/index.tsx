import { CordProvider } from '@cord-sdk/react';
import { useCallback, useState } from 'react';
import * as ReactDOM from 'react-dom/client';
import { ComponentsDropdown } from '../../../_common/ComponentsDropdown';
import '../css/index.css';
import {
  startRoomSession,
  useCordDemoRooms,
  useCordPlaygroundToken,
} from '../../../../../playground/util';
import './playground.css';
import { StaticContent } from '../components/StaticContent';
import { componentsUsed } from '../../../_common/componentsList';
import shareRoomButtonCSS from './componentCSS/share-room-button.css';

function App() {
  useCordDemoRooms();
  const cordAuthToken = useCordPlaygroundToken();

  return (
    <CordProvider clientAuthToken={cordAuthToken}>
      {cordAuthToken && <StaticContent />}
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
  document.getElementById('share-room-button-container')!,
).render(<ShareRoomButton />);

ReactDOM.createRoot(
  document.getElementById('components-dropdown-button-container')!,
).render(
  <ComponentsDropdown
    componentNames={componentsUsed.staticContent}
    walkthroughURL={'https://docs.cord.com/components/'}
  />,
);
