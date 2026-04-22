import React from 'react';
import { Popup } from '@atlaskit/popup';
import { SearchField } from './SearchField';
import { SearchDropdown } from './SearchDropdown';
import { useTopNavSearchController } from './hooks/useTopNavSearchController';

export function TopNavSearch() {
  const ctrl = useTopNavSearchController();

  return (
    <Popup
      isOpen={ctrl.isOpen}
      onClose={ctrl.close}
      shouldFitContainer
      placement="bottom-start"
      shouldDisableFocusLock
      trigger={(triggerProps) => (
        <SearchField
          ref={triggerProps.ref as React.Ref<HTMLDivElement>}
          aria-controls={triggerProps['aria-controls']}
          aria-expanded={triggerProps['aria-expanded']}
          aria-haspopup={triggerProps['aria-haspopup']}
          query={ctrl.query}
          isOpen={ctrl.isOpen}
          onFocus={ctrl.open}
          onClick={ctrl.open}
          onChange={ctrl.setQuery}
          onKeyDown={ctrl.handleKeyDown}
          activeDescendant={
            ctrl.activeIndex >= 0 ? `tnav-option-${ctrl.activeIndex}` : undefined
          }
        />
      )}
      content={() => (
        <SearchDropdown
          query={ctrl.query}
          state={ctrl.state}
          items={ctrl.items}
          activeIndex={ctrl.activeIndex}
          onActiveIndexChange={ctrl.setActiveIndex}
          onItemClick={ctrl.navigate}
        />
      )}
    />
  );
}
