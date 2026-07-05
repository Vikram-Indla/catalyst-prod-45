/**
 * parseWikiPath — extract the workspace/page slugs from a /wiki pathname.
 * Used by surfaces (the sidebar) that render outside the routed <Outlet/>
 * and therefore can't rely on useParams.
 */
export interface WikiPathParts {
  workspaceSlug?: string;
  pageSlug?: string;
}

const RESERVED = new Set(['_sandbox']);

export function parseWikiPath(pathname: string): WikiPathParts {
  const m = pathname.match(/^\/wiki\/([^/?#]+)(?:\/([^/?#]+))?/);
  if (!m) return {};
  const workspaceSlug = decodeURIComponent(m[1]);
  if (RESERVED.has(workspaceSlug)) return {};
  return {
    workspaceSlug,
    pageSlug: m[2] ? decodeURIComponent(m[2]) : undefined,
  };
}
