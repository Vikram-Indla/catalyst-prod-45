/**
 * WorkItemsTab — Profile drawer work items tab
 * Stage A: Shell only
 */

import { useEffect } from 'react';

export function WorkItemsTab() {
  useEffect(() => { console.log('[R360] WorkItemsTab mounted'); }, []);
  return <div data-component="WorkItemsTab" />;
}
