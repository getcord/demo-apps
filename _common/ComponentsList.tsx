import { useCallback, useEffect, useRef, useState } from 'react';

const CSS = `
#components-list-btn {
  align-items: center;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: flex;
  font-size: 16px;
  gap: 8px;
  height: 32px;
  padding: 8px;
}

#components-list-btn:hover,
#components-list-btn:active {
  background: rgba(0, 0, 0, 0.2);
}

#components-list-dropdown {
  position: absolute;
  top: 80%;
  background: #F6F6F6;
  border-radius: 4px;
  box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.08);
  padding: 4px 8px;
}

#components-list-dropdown a {
  color: #9A6AFF;
  text-decoration: none;
  border-radius: 4px;
  text-transform: capitalize;
  display: flex;
  height: 40px;
  padding: 4px 8px;
  align-items: center;
  gap: 8px;
  align-self: stretch;
}

#components-list-dropdown a:hover {
  color: #6949AC;
  background-color: #DADCE0;
}

.dropdown-section-title {
  color: #97979F;
  display: flex;
  padding: 4px 8px;
  align-items: center;
  gap: 8px;
  align-self: stretch;
  cursor: default;
}

.group-title {
  height: 40px;
}

.group-subtitle {
  height: 18px;
  font-size: 12px;
  padding-top: 0;
  padding-bottom: 4px;
}

.separator {
  border: 0;
  border-top: 1px solid #DADCE0;
  margin: 4px 0;
}
`;

export type DemoApp = 'dashboard' | 'canvas-new' | 'video-player' | 'document';

export function ComponentsList({
  api,
  components,
  darkMode,
  app,
}: {
  components?: string[];
  api?: string[];
  darkMode?: boolean;
  app: DemoApp;
}) {
  const [isListOpen, setIsListOpen] = useState(false);
  const handleToggleComponentsList = useCallback(() => {
    setIsListOpen((prev) => !prev);
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        id="components-list-btn"
        style={{
          background:
            darkMode && !isListOpen
              ? 'rgba(255, 255, 255, 0.10)'
              : darkMode && isListOpen
              ? 'rgba(255, 255, 255, 0.2)'
              : isListOpen
              ? 'rgba(0, 0, 0, 0.2)'
              : undefined,
        }}
        onClick={handleToggleComponentsList}
      >
        <CordLogo />
        How it&apos;s built
        <DropdownIcon />
      </button>
      {isListOpen && (
        <ComponentListDropdown
          components={components}
          api={api}
          onClose={() => setIsListOpen(false)}
          app={app}
        />
      )}
    </>
  );
}

type ComponentListDropdownProps = {
  onClose: () => void;
  components?: string[];
  api?: string[];
  app: DemoApp;
};

function ComponentListDropdown({
  onClose,
  components,
  api,
  app,
}: ComponentListDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [handleOutsideClick]);

  const setHoveredComponent = useCallback((componentString: string) => {
    const rootDiv = document.getElementById('root');
    rootDiv?.setAttribute('data-hovered-component', componentString);
  }, []);

  return (
    <div id="components-list-dropdown" ref={dropdownRef}>
      {components?.length && (
        <>
          <div className="dropdown-section-title group-title">Components</div>
          <div className="dropdown-section-title group-subtitle">
            *Hover to highlight
          </div>
        </>
      )}
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
            onMouseEnter={() => setHoveredComponent(component)}
            onMouseLeave={() => setHoveredComponent('')}
          >
            {prettyComponentName}
          </a>
        );
      })}
      {api?.length && (
        <>
          <hr className="separator" />
          <div className="dropdown-section-title group-title">APIs</div>
        </>
      )}
      {api?.map((apiName) => (
        <a
          href={`https://docs.cord.com/js-apis-and-hooks/${apiName}-api`}
          key={apiName}
        >
          {apiName}
        </a>
      ))}
      <hr className="separator" />
      <div>
        <GithubLink app={app} />
      </div>
    </div>
  );
}

function CordLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none">
      <path
        d="M10 20c5.523 0 10-4.477 10-10S15.523 0 10 0 0 4.477 0 10s4.477 10 10 10Z"
        fill="#EDFC7E"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.444 9.316h1.271V6.983c.864.981 1.435 1.92 1.67 2.75.266.945.098 1.7-.513 2.311-.416.416-1.009.613-1.7.613-.207 0-.421-.017-.641-.05a4.533 4.533 0 0 0-.129-1.15c-.28-1.184-.994-2.398-2.014-3.417-.84-.84-1.757-1.512-2.586-1.895-1.31-.606-2-.318-2.348.03-.35.349-.637 1.04-.032 2.35.384.83 1.064 1.755 1.904 2.596 1.124 1.12 2.383 1.933 3.666 2.393a1.28 1.28 0 0 1-.162.2c-.242.242-.817.606-1.964.335-.958-.226-1.956-.822-2.81-1.677l-.9.9c1.019 1.018 2.233 1.735 3.418 2.014.368.087.721.13 1.056.13.844 0 1.569-.273 2.098-.803.223-.222.4-.478.53-.763.316.053.622.079.916.079 1.05 0 1.947-.334 2.598-.986.938-.939 1.228-2.168.837-3.555-.29-1.026-.941-2.115-1.94-3.247h2.221V4.87h-4.446v4.446Zm-2.952-.375c.855.855 1.447 1.851 1.673 2.81.043.182.07.35.084.505-1.014-.397-2.072-1.084-3.024-2.034-.684-.683-1.25-1.432-1.584-2.095-.32-.638-.31-.969-.286-1.049.08-.025.41-.034 1.049.286.663.334 1.404.893 2.088 1.577Z"
        fill="#121314"
      />
    </svg>
  );
}

function DropdownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 2.4a.6.6 0 0 1 .44.192l2.6 2.8a.6.6 0 0 1-.88.816L8 3.882 5.84 6.208a.6.6 0 1 1-.88-.816l2.6-2.8A.6.6 0 0 1 8 2.4ZM4.992 9.76a.6.6 0 0 1 .848.032L8 12.12l2.16-2.327a.6.6 0 1 1 .88.816l-2.6 2.8a.6.6 0 0 1-.88 0l-2.6-2.8a.6.6 0 0 1 .032-.848Z"
        fill="currentColor"
      />
    </svg>
  );
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
};

function GithubLink({ app }: GithubLinkProps) {
  const to = `https://github.com/getcord/demo-apps/tree/master/${app}`;

  return (
    <a href={to} target="_blank" rel="noreferrer">
      <GithubLogo />
      <span>View Source Code</span>
    </a>
  );
}
