/**
 * BehaviouralTab — Profile drawer behavioural analysis tab
 * Stage A: Shell only
 */

import { useEffect } from 'react';

export function BehaviouralTab() {
  useEffect(() => { console.log('[R360] BehaviouralTab mounted'); }, []);
  return <div data-component="BehaviouralTab" />;
}
