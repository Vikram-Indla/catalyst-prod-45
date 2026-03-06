/**
 * ResourceMainArea — main content area
 * Stage A: Shell only
 */

import { useEffect } from 'react';

interface ResourceMainAreaProps {
  selectedResourceId: string | null;
}

export function ResourceMainArea({ selectedResourceId }: ResourceMainAreaProps) {
  useEffect(() => { console.log('[R360] ResourceMainArea mounted'); }, []);
  return <div data-component="ResourceMainArea" />;
}
