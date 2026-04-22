import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import SearchIcon from '@atlaskit/icon/glyph/search';
import { IconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import Textfield from '@atlaskit/textfield';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { GlobalSearchPanel } from '@/components/global-search/GlobalSearchPanel';

// GlobalSearch — correctly anchored search trigger.
//
// Popup positioning uses useLayoutEffect (fires before paint) so the
// position is calculated and applied in the same synchronous flush as the
// first render that shows the popup. popupStyle starts null; the portal is
// not rendered until it is set, guaranteeing the popup never appears at the
// default x=0 position.
//
// Field width: flex 1 1 0 / max 560px.
// Dropdown: width = trigger width (set by the portal container).

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
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties | null>(null);

  const handleClose = () => {
    closeSearch();
    if (collapsed) setExpanded(false);
  };

  // useLayoutEffect fires BEFORE paint — guarantees correct position on first
  // visible frame. The portal is not mounted until popupStyle is non-null.
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setPopupStyle(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const w = rect.width;
    // Clamp so the popup never overflows the right viewport edge.
    const left = Math.max(8, Math.min(rect.left, vw - w - 8));
    setPopupStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left,
      width: w,
      zIndex: 800,
    });
  }, [isOpen]);

  // Click-outside closes the popup.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !popupRef.current?.contains(t)) {
        handleClose();
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cmd/Ctrl+K from anywhere.
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
            ? { width: 'min(560px, calc(100vw - 220px))', flexShrink: 1, minWidth: 0 }
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

      {/* Portal only mounts when popupStyle is ready — no x=0 flash */}
      {isOpen &&
        popupStyle &&
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
