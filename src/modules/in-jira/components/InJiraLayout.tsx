/**
 * In-Jira Layout Component
 * Main layout wrapper for the In-Jira module with tab navigation
 */

import React from 'react';
import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  List, 
  Layers, 
  Kanban, 
  GitBranch, 
  Package,
  Settings,
  Plus,
  FlaskConical,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InJiraProvider, useInJira } from '../context/InJiraContext';
import { IssueDrawer } from './IssueDrawer';
import { CreateIssueModal } from './CreateIssueModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermission } from '@/hooks/usePermission';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const TABS: Tab[] = [
  { id: 'summary', label: 'Summary', icon: <LayoutDashboard className="h-4 w-4" />, path: 'summary' },
  { id: 'list', label: 'List', icon: <List className="h-4 w-4" />, path: 'list' },
  { id: 'all-work', label: 'All work', icon: <Layers className="h-4 w-4" />, path: 'all-work' },
  { id: 'kanban', label: 'Kanban', icon: <Kanban className="h-4 w-4" />, path: 'boards/kanban' },
  { id: 'scrum', label: 'Scrum', icon: <GitBranch className="h-4 w-4" />, path: 'boards/scrum' },
  { id: 'releases', label: 'Releases', icon: <Package className="h-4 w-4" />, path: 'releases' },
];

interface TestTab {
  id: string;
  label: string;
  path: string;
  requiresAdmin?: boolean;
}

const TEST_TABS: TestTab[] = [
  { id: 'tests', label: 'Command Center', path: 'tests' },
  { id: 'cases', label: 'Test Cases', path: 'tests/cases' },
  { id: 'sets', label: 'Test Sets', path: 'tests/sets' },
  { id: 'cycles', label: 'Test Cycles', path: 'tests/cycles' },
  { id: 'executions', label: 'Executions', path: 'tests/executions' },
  { id: 'traceability', label: 'Traceability', path: 'tests/traceability' },
  { id: 'reports', label: 'Reports', path: 'tests/reports' },
  { id: 'admin', label: 'Admin', path: 'tests/admin', requiresAdmin: true },
];

function InJiraLayoutContent() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { openCreateModal } = useInJira();
  const { hasPermission } = usePermission('test_cases', 'configure', 'program', projectKey);

  const getActiveTab = (): string => {
    const pathParts = location.pathname.split('/');
    const projectIndex = pathParts.findIndex(p => p === 'project');
    
    if (projectIndex === -1) return 'summary';
    
    // Get the path after project/:projectKey
    const subPath = pathParts.slice(projectIndex + 2).join('/');
    
    if (subPath.startsWith('tests')) return 'tests';
    if (subPath.startsWith('boards/kanban')) return 'kanban';
    if (subPath.startsWith('boards/scrum')) return 'scrum';
    if (subPath === 'release-management') return 'releases';
    
    const tab = TABS.find(t => subPath.startsWith(t.path));
    return tab?.id || 'summary';
  };

  const getActiveTestTab = (): string | null => {
    const pathParts = location.pathname.split('/');
    const projectIndex = pathParts.findIndex(p => p === 'project');
    if (projectIndex === -1) return null;
    
    const subPath = pathParts.slice(projectIndex + 2).join('/');
    if (!subPath.startsWith('tests')) return null;
    
    const testTab = TEST_TABS.find(t => subPath === t.path || subPath.startsWith(t.path + '/'));
    return testTab?.id || 'tests';
  };

  const activeTab = getActiveTab();
  const activeTestTab = getActiveTestTab();

  const handleTabClick = (path: string) => {
    navigate(`/project/${projectKey}/${path}`);
  };

  // Keyboard shortcut handler
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 'c' key to open create modal (when not in input)
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
          openCreateModal({ projectKey: projectKey || '' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectKey, openCreateModal]);

  return (
    <div className="flex flex-col h-full bg-surface-1">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-default bg-surface-1">
        {/* Breadcrumb */}
        <nav className="text-sm text-text-tertiary mb-2 flex items-center gap-1.5">
          <span 
            className="hover:text-text-primary cursor-pointer transition-colors"
            onClick={() => navigate('/projects')}
          >
            Projects
          </span>
          <span className="text-text-quaternary">/</span>
          <span className="text-text-secondary font-medium">{projectKey}</span>
          <span className="text-text-quaternary">/</span>
          <span className="text-text-primary font-medium">In-Jira</span>
        </nav>

        {/* Title Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-text-primary">
              {projectKey}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={() => openCreateModal({ projectKey: projectKey || '' })}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Create
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => navigate(`/project/${projectKey}/settings`)}
            >
              <Settings className="h-4 w-4 text-text-tertiary" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border-default bg-surface-1">
        <div className="flex items-center px-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.path)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-accent-primary text-accent-primary"
                  : "border-transparent text-text-tertiary hover:text-text-primary hover:border-border-hover"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          
          {/* Tests Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === 'tests'
                    ? "border-accent-primary text-accent-primary"
                    : "border-transparent text-text-tertiary hover:text-text-primary hover:border-border-hover"
                )}
              >
                <FlaskConical className="h-4 w-4" />
                Tests
                <ChevronDown className="h-3 w-3 ml-0.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {TEST_TABS.filter(tab => !tab.requiresAdmin || hasPermission).map((tab) => (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => handleTabClick(tab.path)}
                  className={cn(
                    activeTestTab === tab.id && "bg-accent-subtle text-accent-primary"
                  )}
                >
                  {tab.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <button
            className="flex items-center justify-center w-8 h-8 ml-1 text-text-tertiary hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
            title="Add tab"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      {/* Global Overlays */}
      <IssueDrawer />
      <CreateIssueModal />
    </div>
  );
}

export function InJiraLayout() {
  return (
    <InJiraProvider>
      <InJiraLayoutContent />
    </InJiraProvider>
  );
}

export default InJiraLayout;
