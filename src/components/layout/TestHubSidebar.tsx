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
  Database,
  Package,
  Shield,
  UserCheck,
} from '@/lib/atlaskit-icons';
import { SidebarBase, SidebarConfig, SidebarSection } from './SidebarBase';

interface TestHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const testHubSidebarConfig: SidebarConfig = {
  badge: 'TH',
  label: 'Test Hub',
  sections: [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', title: 'Dashboard', path: '/test/dashboard', icon: BarChart3, exact: true },
        { id: 'my-scope', title: 'My Scope', path: '/test/my-scope', icon: UserCheck, exact: true },
      ],
    },
    {
      title: 'Test Assets',
      items: [
        { id: 'repository', title: 'Test Repository', path: '/test/repository', icon: FolderTree, exact: false },
        { id: 'shared-steps', title: 'Shared Steps', path: '/test/shared-steps', icon: Library, exact: false },
        { id: 'test-sets', title: 'Test Sets', path: '/test/test-sets', icon: Layers, exact: false },
      ],
    },
    {
      title: 'Execution',
      items: [
        { id: 'cycles', title: 'Test Cycles', path: '/test/cycles', icon: RefreshCw, exact: false },
        { id: 'test-plans', title: 'Test Plans', path: '/test/test-plans', icon: ClipboardList, exact: false },
        { id: 'execution', title: 'Execution Hub', path: '/test/execution', icon: Play, exact: false },
        { id: 'runs', title: 'Test Runs', path: '/test/runs', icon: Beaker, exact: false },
        { id: 'environments', title: 'Environments', path: '/test/environments', icon: Server, exact: false },
      ],
    },
    {
      title: 'Quality',
      items: [
        { id: 'defects', title: 'Defects', path: '/test/defects', icon: Bug, exact: false },
        { id: 'requirements', title: 'Requirements', path: '/test/requirements', icon: Target, exact: false },
        { id: 'coverage-matrix', title: 'Coverage Matrix', path: '/test/coverage-matrix', icon: LayoutGrid, exact: false },
        { id: 'traceability', title: 'Traceability', path: '/test/traceability', icon: GitBranch, exact: false },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { id: 'reports', title: 'Reports', path: '/test/reports', icon: BarChart3, exact: false },
        { id: 'tags', title: 'Tags', path: '/test/tags', icon: Tags, exact: false },
        { id: 'activity', title: 'Activity', path: '/test/activity', icon: Activity, exact: false },
        { id: 'import-export', title: 'Import/Export', path: '/test/import-export', icon: Database, exact: false },
      ],
    },
  ],
  footerItem: {
    id: 'settings',
    title: 'Settings',
    path: '/test/settings',
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
