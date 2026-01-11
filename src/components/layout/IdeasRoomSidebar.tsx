// ============================================================
// IDEAS ROOM SIDEBAR
// ============================================================

import { 
  Sparkles, 
  LayoutDashboard, 
  List, 
  Target, 
  BarChart3, 
  Megaphone,
  Plus,
  Settings2
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface IdeasRoomSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const IDEAS_NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Ideas Hub': LayoutDashboard,
  'All Ideas': List,
  'Submit Idea': Plus,
  'Initiatives': Megaphone,
  'Scoring': Target,
  'Priority Matrix': BarChart3,
};

const ideasSidebarConfig: SidebarConfig = {
  badge: 'Ideas',
  label: 'Improvement Ideas',
  items: [
    { id: 'Ideas Hub', title: 'Ideas Hub', path: '/industry/ideas/hub', exact: true },
    { id: 'All Ideas', title: 'All Ideas', path: '/industry/ideas/all', exact: false },
    { id: 'Submit Idea', title: 'Submit Idea', path: '/industry/ideas/submit', exact: true },
    { id: 'Initiatives', title: 'Initiatives', path: '/industry/ideas/initiatives', exact: false },
    { id: 'Scoring', title: 'Scoring Queue', path: '/industry/ideas/scoring', exact: true },
    { id: 'Priority Matrix', title: 'Priority Matrix', path: '/industry/ideas/matrix', exact: true },
  ],
};

export function IdeasRoomSidebar({ expanded, onToggle, className }: IdeasRoomSidebarProps) {
  const { isAdmin } = useUserRole();

  const configWithSettings: SidebarConfig = {
    ...ideasSidebarConfig,
    footerItem: isAdmin ? {
      id: 'ideas-settings',
      title: 'Ideas Settings',
      path: '/admin/ideas',
      icon: Settings2,
      exact: true,
    } : undefined,
  };

  return (
    <SidebarBase
      config={configWithSettings}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
      iconResolver={(itemId) => IDEAS_NAV_ICONS[itemId]}
    />
  );
}
