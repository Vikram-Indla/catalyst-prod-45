/**
 * ProjectSidebar — Project module sidebar using SidebarBase
 * 
 * Uses the shared SidebarBase component for consistent styling across all non-admin sidebars.
 * Matches the Enterprise sidebar pattern with blue gradient badge.
 */

import { 
  Home,
  Box,
  Layers,
  BookOpen,
  Map,
  GitBranch,
  FlaskConical,
  FileText,
  Settings,
  Columns3,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface ProjectSidebarProps {
  projectId: string;
  projectName?: string;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function ProjectSidebar({ 
  projectId, 
  projectName,
  expanded, 
  onToggle, 
  className 
}: ProjectSidebarProps) {
  // Generate badge from project name (first 2 letters) or default to "PJ"
  const badge = projectName 
    ? projectName.substring(0, 2).toUpperCase() 
    : 'PJ';

  const projectSidebarConfig: SidebarConfig = {
    badge,
    label: projectName || 'Project',
    items: [
      { id: 'project-room', title: 'Project Room', path: `/projects/${projectId}/work`, icon: Home, exact: true },
      { id: 'epic-backlog', title: 'Epic Backlog', path: `/projects/${projectId}/backlog/epics`, icon: Box, exact: false },
      { id: 'feature-backlog', title: 'Feature Backlog', path: `/projects/${projectId}/backlog/features`, icon: Layers, exact: false },
      { id: 'story-backlog', title: 'Story Backlog', path: `/projects/${projectId}/backlog/stories`, icon: BookOpen, exact: false },
      { id: 'board', title: 'Board', path: `/projects/${projectId}/boards`, icon: Columns3, exact: false },
      { id: 'roadmap', title: 'Roadmap', path: `/projects/${projectId}/roadmap`, icon: Map, exact: false },
      { id: 'dependencies', title: 'Dependencies', path: `/projects/${projectId}/dependencies`, icon: GitBranch, exact: false },
      { id: 'tests', title: 'Tests', path: `/projects/${projectId}/tests`, icon: FlaskConical, exact: false },
      { id: 'reports', title: 'Reports', path: `/projects/${projectId}/reports`, icon: FileText, exact: false },
    ],
    footerItem: {
      id: 'settings',
      title: 'Project Settings',
      path: `/projects/${projectId}/settings`,
      icon: Settings,
      exact: true,
    },
  };

  return (
    <SidebarBase
      config={projectSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
