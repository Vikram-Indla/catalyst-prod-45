import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Browser tab title resolver for Catalyst.
 *
 * Identity ladder (most specific wins):
 *   1. Issue       →  "BAU-5389 — Convert to subtask · Catalyst"
 *   2. Project     →  "MOIM — Industrial Strategy · Catalyst"
 *   3. pageName    →  "Home · Catalyst"
 *   4. (nothing)   →  "Catalyst"
 *
 * Hub labels (StrategyHub, ProjectHub, …) are intentionally never rendered
 * in the tab — the tab is reserved for user-meaningful identity.
 *
 * Call this hook ONCE in CatalystShell or the top-level layout.
 * Do NOT call it inside individual page components.
 */
export interface CatalystTitleInput {
  /** Current issue view (full-page or modal). Takes precedence over project/page. */
  issue?: { key?: string | null; title?: string | null } | null;
  /** Active project context. Takes precedence over pageName. */
  project?: { key?: string | null; name?: string | null } | null;
  /** Friendly page name fallback (e.g. "Home", "Wiki", "Admin"). */
  pageName?: string | null;
}

export function useCatalystTitle(input: CatalystTitleInput = {}) {
  const location = useLocation();
  const { issue, project, pageName } = input;

  const issueKey = issue?.key ?? null;
  const issueTitle = issue?.title ?? null;
  const projectKey = project?.key ?? null;
  const projectName = project?.name ?? null;

  useEffect(() => {
    let identity: string | null = null;

    if (issueKey) {
      identity = issueTitle ? `${issueKey} — ${issueTitle}` : issueKey;
    } else if (projectKey && projectName) {
      identity = `${projectKey} — ${projectName}`;
    } else if (projectKey) {
      identity = projectKey;
    } else if (projectName) {
      identity = projectName;
    } else if (pageName) {
      identity = pageName;
    }

    document.title = identity ? `${identity} · Catalyst` : 'Catalyst';
  }, [issueKey, issueTitle, projectKey, projectName, pageName, location.pathname]);
}
