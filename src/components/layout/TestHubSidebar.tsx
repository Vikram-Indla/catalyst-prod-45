/**
 * TestHubSidebar — Test Hub module sidebar using SidebarBase
 * 
 * Test Case Repository navigation as per enterprise spec:
 * - Test Repository (folders, test cases)
 * - Shared Steps library
 * - Test Cycles & Execution
 * - Quality: Defects, Requirements, Traceability
 * - Reports & Analytics
 */

import { 
  FileText,
  RefreshCw,
  Bug,
  Settings,
  BarChart3,
  Layers,
  Play,
  Target,
  GitBranch,
  LayoutGrid,
  Library,
  FolderTree,
  ClipboardList,
  Beaker,
  Server,
  Tags,
  Activity,
} from 'lucide-react';
import { SidebarBase, SidebarConfig, SidebarSection } from './SidebarBase';

interface TestHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const testHubSidebarConfig: SidebarConfig = {
  badge: 'TH',
  label: 'TestHub',
  sections: [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', title: 'Dashboard', path: '/testhub/dashboard', icon: BarChart3, exact: true },
      ],
    },
    {
      title: 'Test Assets',
      items: [
        { id: 'repository', title: 'Test Repository', path: '/testhub/repository', icon: FolderTree, exact: false },
        { id: 'shared-steps', title: 'Shared Steps', path: '/testhub/shared-steps', icon: Library, exact: false },
        { id: 'test-sets', title: 'Test Sets', path: '/testhub/test-sets', icon: Layers, exact: false },
      ],
    },
    {
      title: 'Execution',
      items: [
        { id: 'cycles', title: 'Test Cycles', path: '/testhub/cycles', icon: RefreshCw, exact: false },
        { id: 'test-plans', title: 'Test Plans', path: '/testhub/test-plans', icon: ClipboardList, exact: false },
        { id: 'execution', title: 'Execution Hub', path: '/testhub/execution', icon: Play, exact: false },
        { id: 'runs', title: 'Test Runs', path: '/testhub/runs', icon: Beaker, exact: false },
        { id: 'environments', title: 'Environments', path: '/testhub/environments', icon: Server, exact: false },
      ],
    },
    {
      title: 'Quality',
      items: [
        { id: 'defects', title: 'Defects', path: '/testhub/defects', icon: Bug, exact: false },
        { id: 'requirements', title: 'Requirements', path: '/testhub/requirements', icon: Target, exact: false },
        { id: 'coverage-matrix', title: 'Coverage Matrix', path: '/testhub/coverage-matrix', icon: LayoutGrid, exact: false },
        { id: 'traceability', title: 'Traceability', path: '/testhub/traceability', icon: GitBranch, exact: false },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { id: 'reports', title: 'Reports', path: '/testhub/reports', icon: BarChart3, exact: false },
        { id: 'tags', title: 'Tags', path: '/testhub/tags', icon: Tags, exact: false },
        { id: 'activity', title: 'Activity', path: '/testhub/activity', icon: Activity, exact: false },
      ],
    },
  ],
  footerItem: {
    id: 'settings',
    title: 'Settings',
    path: '/testhub/settings',
    icon: Settings,
    exact: true,
  },
  showFavorites: true,
};

export function TestHubSidebar({ expanded, onToggle, className }: TestHubSidebarProps) {
  return (
    <SidebarBase
      config={testHubSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
