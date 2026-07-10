/**
 * useCreateIdeaParam — `?create=idea` deep-link handling (D6, Phase 2 S2).
 *
 * Same pattern as EpicsPage.tsx:107 (`?create=true` → open + delete param
 * with { replace: true }) — the repo has no shared abstraction for this, so
 * the ideation pages share this one hook instead of three copies.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useCreateIdeaParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('create') === 'idea') {
      setIsOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
}
