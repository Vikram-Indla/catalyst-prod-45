import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { WORK_TYPE_REGISTRY, normalizeWorkItemType } from '@/components/icons/icons.registry';

const DEFAULT_FAVICON = '/favicon.ico';

/** Canonical work-type icon asset URL (registry single source of truth). */
function faviconUrlForType(issueType: string): string {
  const t = normalizeWorkItemType(issueType) ?? 'task';
  return WORK_TYPE_REGISTRY[t].light;
}

export function useDynamicFavicon(issueType: string | null | undefined) {
  const location = useLocation();
  const isBrowseRoute = location.pathname.startsWith('/browse/');

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      || document.createElement('link');
    link.rel = 'icon';

    if (isBrowseRoute && issueType) {
      link.type = 'image/svg+xml';
      link.href = faviconUrlForType(issueType);
    } else {
      link.type = 'image/x-icon';
      link.href = DEFAULT_FAVICON;
    }

    if (!link.parentNode) document.head.appendChild(link);

    return () => {
      link.type = 'image/x-icon';
      link.href = DEFAULT_FAVICON;
    };
  }, [isBrowseRoute, issueType]);
}
