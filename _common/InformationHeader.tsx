import cx from 'classnames';
import { ComponentsList } from '../../../playground/ComponentsList';
import cord from './images/cord.svg';
import './informationHeader.css';

export function InformationHeader({
  api,
  darkTheme = false,
  components,
}: {
  darkTheme?: boolean;
  components: string[];
  api: string[];
}) {
  return (
    <header className={cx({ ['dark']: darkTheme })}>
      <div id="logo">
        <img src={cord} />
      </div>
      <div id="links">
        <ComponentsList
          components={components}
          api={api}
          darkMode={darkTheme}
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
