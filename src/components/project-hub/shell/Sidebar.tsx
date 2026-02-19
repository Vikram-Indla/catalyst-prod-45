import { useParams } from 'react-router-dom';
import { SidebarModuleNav } from './SidebarModuleNav';
import { SidebarProjectNav } from './SidebarProjectNav';
import { ProjectEntry } from './ProjectSwitcher';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  projects: ProjectEntry[];
  currentProject?: { key: string; name: string; color: string } | null;
}

export function Sidebar({ collapsed, onToggle, projects, currentProject }: SidebarProps) {
  const params = useParams<{ key?: string }>();
  const isProjectView = !!params.key && !!currentProject;

  if (isProjectView && currentProject) {
    return (
      <SidebarProjectNav
        projectKey={currentProject.key}
        projectName={currentProject.name}
        projectColor={currentProject.color}
        collapsed={collapsed}
        onToggle={onToggle}
        projects={projects}
      />
    );
  }

  return (
    <SidebarModuleNav
      collapsed={collapsed}
      onToggle={onToggle}
    />
  );
}
