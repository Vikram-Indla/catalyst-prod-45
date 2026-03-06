/**
 * ResourceSidebar — 232px resource list sidebar
 * Stage A: Shell only
 */

import { useEffect } from 'react';

interface ResourceSidebarProps {
  selectedResourceId: string | null;
  onSelectResource: (id: string | null) => void;
}

export function ResourceSidebar({ selectedResourceId, onSelectResource }: ResourceSidebarProps) {
  useEffect(() => { console.log('[R360] ResourceSidebar mounted'); }, []);
  return <div data-component="ResourceSidebar" />;
}
