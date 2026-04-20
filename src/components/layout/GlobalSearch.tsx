import { useEffect, useRef, useState } from 'react';
import SearchIcon from '@atlaskit/icon/glyph/search';
import Textfield from '@atlaskit/textfield';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

export function GlobalSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const openSearch = useGlobalSearchStore((state) => state.open);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handler = () => {
      openSearch();
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener('open-global-search', handler);
    return () => window.removeEventListener('open-global-search', handler);
  }, [openSearch]);

  return (
    <Textfield
      ref={inputRef}
      elemBeforeInput={<SearchIcon label="" size="small" />}
      placeholder="Search"
      value={query}
      onChange={(event) => setQuery((event.target as HTMLInputElement).value)}
      onFocus={openSearch}
      style={{ width: 420 }}
      isCompact
      aria-label="Search"
    />
  );
}