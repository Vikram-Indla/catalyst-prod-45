/**
 * WikiSidebar — /wiki hub sidebar (CAT-DOCS-NOTION-20260704-001).
 *
 * Single Notion-style sidebar (no double panel):
 *  - at /wiki (home): the workspace directory grouped by container type.
 *  - inside a workspace (/wiki/:slug…): the workspace's live page tree,
 *    rendered as SidebarBase children via WikiTreeNav.
 */
import { useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Home, Building2, Search } from '@/lib/atlaskit-icons';
import { SidebarBase, SidebarConfig } from './SidebarBase';
import { WikiTreeNav } from '@/components/wiki-hub/WikiTreeNav';
import { parseWikiPath } from '@/components/wiki-hub/wikiPath';
import { useWikiWorkspaces, useWorkspaceContainerMeta } from '@/hooks/useWiki';
import { Routes } from '@/lib/routes';
import { ProjectIcon } from '@/components/shared/ProjectIcon';
import { getProductAvatarUrl } from '@/components/icons';

interface WikiSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function WikiSidebar({ expanded, onToggle, className }: WikiSidebarProps) {
  // The sidebar renders as a sibling of the routed <Outlet/>, so useParams
  // can't see :workspaceSlug — parse the pathname instead.
  const { pathname } = useLocation();
  const { workspaceSlug } = parseWikiPath(pathname);
  const { data: workspaces } = useWikiWorkspaces();
  const { data: containerMeta } = useWorkspaceContainerMeta();

  const inWorkspace = !!workspaceSlug;

  const config: SidebarConfig = useMemo(() => {
    if (inWorkspace) {
      // Minimal config — the tree is injected as children below.
      return { badge: 'DX', label: 'Docex', sections: [] };
    }

    const byType = (type: string) => (workspaces ?? []).filter((w) => w.container_type === type);

    // Per-entity canonical icon — SAME resolution ContextSwitcher's ItemRow
    // uses, so a project/product's Wiki-sidebar icon matches its Project Hub /
    // Product Hub icon exactly instead of one shared per-container-type glyph.
    const item = (w: { id: string; name: string; slug: string; container_type: string; container_id: string | null }) => {
      let iconNode: ReactNode = (
        <Building2 className="h-[20px] w-[20px]" style={{ color: 'var(--ds-icon)' }} />
      );
      if (w.container_type === 'project' && w.container_id) {
        const projectKey = containerMeta?.projectKeyById.get(w.container_id);
        iconNode = <ProjectIcon size="small" projectKey={projectKey} name={w.name} />;
      } else if (w.container_type === 'product' && w.container_id) {
        const product = containerMeta?.productById.get(w.container_id);
        iconNode = (
          <ProjectIcon
            size="small"
            projectKey={product?.code}
            avatarUrl={product?.code ? getProductAvatarUrl(product.code) : undefined}
            color={product?.color}
            name={w.name}
          />
        );
      }
      return {
        id: w.id,
        title: w.name,
        path: Routes.wiki.workspace(w.slug),
        iconNode,
      };
    };

    return {
      badge: 'DX',
      label: 'Docex',
      sections: [
        {
          title: 'Docex',
          items: [
            { id: 'home', title: 'Home', path: Routes.docex.root(), icon: Home, exact: true },
            { id: 'search', title: 'Search', path: Routes.docex.search(), icon: Search, exact: true },
          ],
        },
        ...(byType('project').length
          ? [{ title: 'Project workspaces', items: byType('project').map(item) }]
          : []),
        ...(byType('product').length
          ? [{ title: 'Product workspaces', items: byType('product').map(item) }]
          : []),
        ...(byType('organization').length
          ? [{ title: 'Organization', items: byType('organization').map(item) }]
          : []),
      ],
    };
  }, [inWorkspace, workspaces, containerMeta]);

  return (
    <SidebarBase config={config} expanded={expanded} onToggle={onToggle} className={className}>
      {inWorkspace ? <WikiTreeNav /> : null}
    </SidebarBase>
  );
}
