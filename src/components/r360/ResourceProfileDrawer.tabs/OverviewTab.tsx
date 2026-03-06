/**
 * OverviewTab — Profile drawer overview tab
 * Stage A: Shell only
 */

import { useEffect } from 'react';

export function OverviewTab() {
  useEffect(() => { console.log('[R360] OverviewTab mounted'); }, []);
  return <div data-component="OverviewTab" />;
}
