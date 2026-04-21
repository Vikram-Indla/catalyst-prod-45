import { useEffect, useRef, useState } from 'react';
import SearchIcon from '@atlaskit/icon/glyph/search';
import { IconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import Textfield from '@atlaskit/textfield';
import { Box, xcss } from '@atlaskit/primitives';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

// GlobalSearch — Jira-parity responsive search.
//
//  - Desktop (≥1024): full Textfield inline in the header (caller caps width
//    via CatalystHeader's searchRegionStyles).
//  - Narrow  (<1024): collapsed to a magnifying-glass IconButton. Click
//    expands the search full-width across the search region (and triggers
//    the global search store open). Escape or outside-click re-collapses.
const searchContainerStyles = xcss({
  width: '100%',
  maxWidth: '100%',
  flexShrink: 1,
});

interface GlobalSearchProps {
  collapsed?: boolean;
}

export function GlobalSearch({ collapsed = false }: GlobalSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openSearch = useGlobalSearchStore((state) => state.open);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const handler = () => {
      openSearch();
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener('open-global-search', handler);
    return () => window.removeEventListener('open-global-search', handler);
  }, [openSearch]);

  // When viewport leaves narrow mode, always reset the expanded overlay
  useEffect(() => {
    if (!collapsed) setExpanded(false);
  }, [collapsed]);

  // Escape collapses the narrow-mode overlay
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  // Narrow mode, not yet expanded — show icon only
  if (collapsed && !expanded) {
    return (
      <Tooltip content="Search (⌘ + K)" position="bottom">
        <IconButton
          label="Search"
          appearance="subtle"
          icon={SearchIcon}
          onClick={() => {
            setExpanded(true);
            openSearch();
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Box xcss={searchContainerStyles}>
      <Textfield
        ref={inputRef}
        elemBeforeInput={
          <span style={{ display: 'inline-flex', paddingLeft: 6, color: '#626F86' }}>
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
              padding: '0 6px',
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
        onChange={(event) => setQuery((event.target as HTMLInputElement).value)}
        onFocus={openSearch}
        onBlur={() => {
          if (collapsed) setExpanded(false);
        }}
        aria-label="Search"
      />
    </Box>
  );
}
