import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import SearchIcon from '@atlaskit/icon/glyph/search';
import { IconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import Textfield from '@atlaskit/textfield';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { GlobalSearchPanel } from '@/components/global-search/GlobalSearchPanel';

// GlobalSearch — search trigger anchored directly via getBoundingClientRect.
// Atlaskit Popup's Manager/Reference context pattern has a React-18 timing
// bug: referenceNode is null on the first Popper.js layout pass, producing
// left:0. The fix is to read the trigger's viewport position ourselves and
// apply it to a portal-rendered, fixed-positioned container.

interface GlobalSearchProps {
  collapsed?: boolean;
}

export function GlobalSearch({ collapsed = false }: GlobalSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const isOpen = useGlobalSearchStore((s) => s.isOpen);
  const openSearch = useGlobalSearchStore((s) => s.open);
  const closeSearch = useGlobalSearchStore((s) => s.close);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

  const handleClose = () => {
    closeSearch();
    if (collapsed) setExpanded(false);
  };

  // Position popup whenever it opens — read the trigger's live viewport rect.
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupWidth = Math.min(780, window.innerWidth - 32);
    // Prevent the popup from overflowing off the right edge.
    const left = Math.min(rect.left, window.innerWidth - popupWidth - 8);
    setPopupStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left: Math.max(8, left),
      zIndex: 800,
    });
  }, [isOpen]);

  // Click-outside closes the popup.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !popupRef.current?.contains(target)) {
        handleClose();
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cmd/Ctrl+K from anywhere → focus input + open panel.
  useEffect(() => {
    const handler = () => {
      openSearch();
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener('open-global-search', handler);
    return () => window.removeEventListener('open-global-search', handler);
  }, [openSearch]);

  // Esc closes.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset narrow-mode overlay when viewport widens.
  useEffect(() => {
    if (!collapsed) setExpanded(false);
  }, [collapsed]);

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
    <>
      <div
        ref={triggerRef}
        style={
          collapsed
            ? { width: 'min(680px, calc(100vw - 220px))', flexShrink: 1, minWidth: 0 }
            : { width: '100%', flexShrink: 1, minWidth: 0 }
        }
        aria-controls={isOpen ? 'gs-popup' : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
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
        />
      </div>

      {isOpen &&
        createPortal(
          <div id="gs-popup" ref={popupRef} style={popupStyle}>
            <GlobalSearchPanel
              query={query}
              onQueryChange={setQuery}
              onClose={handleClose}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
