import { useEffect, useRef, useState } from 'react';
import Popup from '@atlaskit/popup';
import SearchIcon from '@atlaskit/icon/glyph/search';
import { IconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import Textfield from '@atlaskit/textfield';
import { Box, xcss } from '@atlaskit/primitives';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { GlobalSearchPanel } from '@/components/global-search/GlobalSearchPanel';

// GlobalSearch — Jira-parity responsive search trigger.
//   - Desktop (≥1024): full Textfield inline in the header.
//   - Narrow  (<1024): collapsed magnifying-glass IconButton; click expands.
// Clicking / focusing the field opens an Atlaskit Popup containing the
// 920px GlobalSearchPanel (filter chips, suggestions, recent items, action
// rows, footer). Cmd/Ctrl+K toggles open. Escape + outside-click close.
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
  const isOpen = useGlobalSearchStore((s) => s.isOpen);
  const openSearch = useGlobalSearchStore((s) => s.open);
  const closeSearch = useGlobalSearchStore((s) => s.close);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Cmd/Ctrl+K from anywhere → focus input + open panel.
  useEffect(() => {
    const handler = () => {
      openSearch();
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener('open-global-search', handler);
    return () => window.removeEventListener('open-global-search', handler);
  }, [openSearch]);

  // Reset narrow-mode overlay when viewport widens.
  useEffect(() => {
    if (!collapsed) setExpanded(false);
  }, [collapsed]);

  // Esc closes the narrow-mode overlay.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  // Narrow mode collapsed → render icon trigger only.
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
    <Popup
      isOpen={isOpen}
      onClose={() => closeSearch()}
      placement="bottom-start"
      shouldRenderToParent={false}
      content={() => (
        <GlobalSearchPanel
          query={query}
          onQueryChange={setQuery}
          onClose={() => closeSearch()}
        />
      )}
      trigger={(triggerProps) => (
        <Box ref={triggerProps.ref as any} xcss={searchContainerStyles}>
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
            onChange={(event) => {
              setQuery((event.target as HTMLInputElement).value);
              if (!isOpen) openSearch();
            }}
            onFocus={openSearch}
            onClick={openSearch}
            aria-label="Search"
            aria-haspopup="dialog"
            aria-expanded={isOpen}
          />
        </Box>
      )}
    />
  );
}
