import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getJiraIconUrl } from '@/lib/jira-issue-type-icons';

const DEFAULT_FAVICON = '/favicon.ico';

export function useDynamicFavicon(issueType: string | null | undefined) {
  const location = useLocation();
  const isBrowseRoute = location.pathname.startsWith('/browse/');

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      || document.createElement('link');
    link.rel = 'icon';

    if (isBrowseRoute && issueType) {
      link.type = 'image/svg+xml';
      link.href = getJiraIconUrl(issueType, 16);
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
