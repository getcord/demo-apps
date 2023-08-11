import cx from 'classnames';
import cord from './images/cord.svg';
import './informationHeader.css';

export function InformationHeader({
  darkTheme = false,
}: {
  darkTheme?: boolean;
}) {
  return (
    <header className={cx({ ['dark']: darkTheme })}>
      <div id="logo">
        <img src={cord} />
      </div>
      <div id="links">
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
