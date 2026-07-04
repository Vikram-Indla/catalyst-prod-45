/**
 * WikiSidebar — /wiki hub sidebar (CAT-DOCS-NOTION-20260704-001).
 *
 * The Wiki is a library of workspaces (one per project, per product,
 * plus Organization). This sidebar lists them grouped by container type;
 * the page tree itself lives inside the workspace surface.
 */
import { useMemo } from 'react';
import { Home, Layers, Package, Building2 } from '@/lib/atlaskit-icons';
import { SidebarBase, SidebarConfig } from './SidebarBase';
import { useWikiWorkspaces } from '@/hooks/useWiki';
import { Routes } from '@/lib/routes';

interface WikiSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function WikiSidebar({ expanded, onToggle, className }: WikiSidebarProps) {
  const { data: workspaces } = useWikiWorkspaces();

  const config: SidebarConfig = useMemo(() => {
    const byType = (type: string) => (workspaces ?? []).filter((w) => w.container_type === type);
    const item = (w: { id: string; name: string; slug: string }, icon: typeof Layers) => ({
      id: w.id,
      title: w.name,
      path: Routes.wiki.workspace(w.slug),
      icon,
    });

    return {
      badge: 'WK',
      label: 'Wiki',
      sections: [
        {
          title: 'Wiki',
          items: [{ id: 'home', title: 'Home', path: Routes.wiki.root(), icon: Home, exact: true }],
        },
        ...(byType('project').length
          ? [{ title: 'Project workspaces', items: byType('project').map((w) => item(w, Layers)) }]
          : []),
        ...(byType('product').length
          ? [{ title: 'Product workspaces', items: byType('product').map((w) => item(w, Package)) }]
          : []),
        ...(byType('organization').length
          ? [{ title: 'Organization', items: byType('organization').map((w) => item(w, Building2)) }]
          : []),
      ],
    };
  }, [workspaces]);

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
