import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Sets the browser tab title using the Catalyst standard format:
 * "{pageName} · {hub} · Catalyst"
 *
 * Call this hook ONCE in CatalystShell or the top-level layout.
 * Do NOT call it inside individual page components.
 */
export function useCatalystTitle(
  pageName: string | undefined,
  hub: string | undefined
) {
  const location = useLocation();

  useEffect(() => {
    const page = pageName ?? 'Loading';
    const hubName = hub ?? 'Catalyst';

    if (hub) {
      document.title = `Catalyst · ${hubName} · ${page}`;
    } else {
      document.title = pageName ? `Catalyst · ${page}` : 'Catalyst';
    }
  }, [pageName, hub, location.pathname]);
}
