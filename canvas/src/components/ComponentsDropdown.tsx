import React, { useState } from 'react';
import cx from 'classnames';

import upSolid from '../images/up-solid.svg';
import downSolid from '../images/down-solid.svg';
import ComponentsData from '../cord-components';
import puzzlePiece from '../images/puzzle-piece.svg';

type CordComponentNames = keyof typeof ComponentsData;

type Props = {
  componentNames: Array<CordComponentNames>;
  walkthroughURL: string;
};

export function ComponentsDropdown(props: Props) {
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const components = props.componentNames.map(
    (componentName) => ComponentsData[componentName],
  );

  return (
    <div className="components-dropdown-container">
      <div
        className={cx('components-dropdown-button', {
          'components-dropdown-button-pressed': showDropdownMenu,
        })}
        onClick={() => setShowDropdownMenu(!showDropdownMenu)}
      >
        <img src={puzzlePiece} className={'puzzle-piece-icon'} />
        Cord components
        <img src={showDropdownMenu ? upSolid : downSolid} />
      </div>
      {showDropdownMenu && (
        <>
          <div className="components-dropdown-menu">
            <div className="components-dropdown-menu-items">
              <div>Used on this page:</div>
              {components.map((item, i) => {
                return <MenuItem key={i} {...item} />;
              })}
            </div>
          </div>
          <div className="modal" onClick={() => setShowDropdownMenu(false)} />
        </>
      )}
    </div>
  );
}

type MenuItemProps = {
  header: string;
  link: string;
  icon: string;
  description: string;
};

function MenuItem(props: MenuItemProps) {
  const { header, link, icon } = props;
  return (
    <>
      <div className="separator" />
      <div className="components-dropdown-menu-item">
        <img src={icon} height={'30px'} className="components-menu-item-icon" />
        <a
          href={link}
          className="components-dropdown-menu-item-header"
          target="_blank"
          rel="noopener noreferrer"
        >
          {header}
        </a>
      </div>
    </>
  );
}
