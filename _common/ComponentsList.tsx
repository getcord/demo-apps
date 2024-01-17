import { useCallback } from 'react';
import cx from 'classnames';
import { ComponentNameToIcon } from './ComponentNameToIcon';
import type { ComponentNames } from './ComponentNameToIcon';

const CSS = `
hr {
  border: 0;
  border-top: 1px solid #CECFD2;  
  margin: 0;
}

.drawer-container {
  display: flex;
  gap: 32px;
  margin: auto;
  /* Shifting up the text so it appears over the hr */
  margin-top: -16px;
}

.pill {
  align-items: center;
  background-color: #DCDCE2;
  border-radius: 16px;
  color: black;
  display: flex;
  font-size: 12px;
  gap: 4px;
  min-height: 24px;
  padding: 4px 8px;
  text-decoration: none;
  white-space: nowrap;
}

.pill.dark {
  background-color: #4C4C4C;
  color: #F5F5F5;
}

.pill:hover {
  background-color: #9A6AFF;
  color: white;
}

.api.pill::after,
.github-logo.pill::after {
  content: '↗︎';
}

.section {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  color: #9a6aff;
  background-color: #F8F4F4;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 300;
  padding: 0 4px;
  white-space: nowrap;
}

.section-title.dark {
  background-color: #302C2C;
  color: white;
}

.section-items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* Don't display the drawer on mobile */
@media only screen and (max-width: 650px) {
  .drawer-container, hr {
    display: none;
  }
}
`;

export type DemoApp = 'dashboard' | 'canvas-new' | 'video-player' | 'document';

export function ComponentsList({
  api,
  components,
  darkMode,
  app,
}: {
  components?: ComponentNames[];
  api?: string[];
  darkMode?: boolean;
  app: DemoApp;
}) {
  const setHoveredComponent = useCallback((componentString: string) => {
    const rootDiv = document.getElementById('root');
    rootDiv?.setAttribute('data-hovered-component', componentString);
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <hr />
      <div className="drawer-container">
        <div className="section">
          <div
            className={cx('section-title', {
              ['dark']: darkMode,
            })}
          >
            Explore components
          </div>
          <div className="section-items">
            {components?.map((component) => {
              const lowercaseComponent = component.toLowerCase();
              const prettyComponentName = lowercaseComponent
                .slice(4) // Remove `cord-`
                .split('-')
                .join(' ')
                .toLowerCase();
              return (
                <a
                  href={`https://docs.cord.com/components/${lowercaseComponent}`}
                  key={component}
                  className={cx('pill', {
                    ['dark']: darkMode,
                  })}
                  onMouseEnter={() => setHoveredComponent(component)}
                  onMouseLeave={() => setHoveredComponent('')}
                >
                  {ComponentNameToIcon(component, !!darkMode)}
                  {capitalize(prettyComponentName)}
                </a>
              );
            })}
          </div>
        </div>
        <div className="section">
          <div
            className={cx('section-title', {
              ['dark']: darkMode,
            })}
          >
            Explore APIs
          </div>
          <div className="section-items">
            {api?.map((apiName) => (
              <a
                href={`https://docs.cord.com/js-apis-and-hooks/${apiName}-api`}
                key={apiName}
                className={cx('api', 'pill', {
                  ['dark']: darkMode,
                })}
              >
                {capitalize(apiName)}
              </a>
            ))}
          </div>
        </div>
        <div className="section">
          <div
            className={cx('section-title', {
              ['dark']: darkMode,
            })}
          >
            View source code
          </div>
          <div className="section-items">
            <GithubLink app={app} darkMode={!!darkMode} />
          </div>
        </div>
      </div>
    </>
  );
}

function capitalize(componentName: string) {
  return componentName
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.substring(1))
    .join(' ');
}

function GithubLogo() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_1906_7113)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.97616 0C3.56555 0 0 3.66667 0 8.20283C0 11.8288 2.28457 14.8982 5.45388 15.9845C5.85012 16.0662 5.99527 15.808 5.99527 15.5908C5.99527 15.4007 5.9822 14.7488 5.9822 14.0697C3.76343 14.5587 3.30139 13.0918 3.30139 13.0918C2.94482 12.1412 2.41649 11.8968 2.41649 11.8968C1.69029 11.3943 2.46939 11.3943 2.46939 11.3943C3.27494 11.4487 3.69763 12.2363 3.69763 12.2363C4.41061 13.4857 5.55951 13.1327 6.02171 12.9153C6.08767 12.3857 6.2991 12.019 6.52359 11.8153C4.75396 11.6252 2.89208 10.919 2.89208 7.76817C2.89208 6.87183 3.20882 6.1385 3.71069 5.56817C3.63151 5.3645 3.35412 4.52233 3.79004 3.39517C3.79004 3.39517 4.46351 3.17783 5.98204 4.23717C6.63218 4.05761 7.30265 3.96627 7.97616 3.9655C8.64963 3.9655 9.33616 4.06067 9.97012 4.23717C11.4888 3.17783 12.1623 3.39517 12.1623 3.39517C12.5982 4.52233 12.3207 5.3645 12.2415 5.56817C12.7566 6.1385 13.0602 6.87183 13.0602 7.76817C13.0602 10.919 11.1984 11.6115 9.41551 11.8153C9.70612 12.0733 9.9569 12.5622 9.9569 13.3363C9.9569 14.4363 9.94384 15.3192 9.94384 15.5907C9.94384 15.808 10.0891 16.0662 10.4852 15.9847C13.6545 14.898 15.9391 11.8288 15.9391 8.20283C15.9522 3.66667 12.3736 0 7.97616 0Z"
          fill="black"
        />
      </g>
      <defs>
        <clipPath id="clip0_1906_7113">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

type GithubLinkProps = {
  app: DemoApp;
  darkMode: boolean;
};

function GithubLink({ app, darkMode }: GithubLinkProps) {
  const to = `https://github.com/getcord/demo-apps/tree/master/${app}`;

  return (
    <a
      href={to}
      className={cx('github-logo', 'pill', {
        ['dark']: darkMode,
      })}
      target="_blank"
      rel="noreferrer"
    >
      <GithubLogo />
      <span>Github</span>
    </a>
  );
}
