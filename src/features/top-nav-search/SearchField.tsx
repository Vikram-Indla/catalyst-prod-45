import React, { forwardRef, useState } from 'react';
import Textfield from '@atlaskit/textfield';
import SearchIcon from '@atlaskit/icon/glyph/search';

interface SearchFieldProps {
  query: string;
  isOpen: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  activeDescendant?: string;
  // trigger props forwarded from @atlaskit/popup
  'aria-controls'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'dialog';
}

export const SearchField = forwardRef<HTMLDivElement, SearchFieldProps>(
  function SearchField(
    {
      query,
      isOpen,
      onChange,
      onFocus,
      onClick,
      onKeyDown,
      activeDescendant,
      'aria-controls': ariaControls,
      'aria-expanded': ariaExpanded,
      'aria-haspopup': ariaHasPopup,
    },
    ref,
  ) {
    const [isFocused, setIsFocused] = useState(false);
    const elevated = isFocused || isOpen;

    return (
      <div
        ref={ref}
        style={{
          width: '100%',
          transition: 'box-shadow 150ms ease, transform 150ms ease',
          boxShadow: elevated ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
          transform: elevated ? 'translateY(-1px)' : 'none',
          borderRadius: 4,
        }}
        aria-controls={ariaControls}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
      >
        <Textfield
          elemBeforeInput={
            <span
              style={{
                display: 'inline-flex',
                paddingLeft: 8,
                color: elevated ? '#2563EB' : '#626F86',
                transition: 'color 150ms ease',
              }}
            >
              <SearchIcon label="" />
            </span>
          }
          elemAfterInput={
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 22,
                height: 20,
                padding: '0 5px',
                marginRight: 6,
                borderRadius: 3,
                border: '1px solid #DFE1E6',
                background: '#F4F5F7',
                color: '#626F86',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
              aria-hidden
            >
              ⌘K
            </span>
          }
          placeholder="Search"
          value={query}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          onFocus={() => {
            setIsFocused(true);
            onFocus();
          }}
          onBlur={() => setIsFocused(false)}
          onClick={onClick}
          onKeyDown={onKeyDown}
          aria-label="Search"
          aria-autocomplete="list"
          aria-activedescendant={activeDescendant}
          role="combobox"
        />
      </div>
    );
  },
);
