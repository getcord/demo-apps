import cord from './images/cord.svg';

export function InformationHeader() {
  return (
    <header>
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
