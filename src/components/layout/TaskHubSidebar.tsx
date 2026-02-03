/**
 * TaskHubSidebar — TaskHub module sidebar using SidebarBase
 * 
 * Uses the shared SidebarBase component for consistent styling across all non-admin sidebars.
 * Includes navigation for Task¹⁰, My Tasks, Workstreams, and Calendar.
 */

import { 
  LayoutList,
  ListTodo,
  Layers,
  CalendarDays,
  Settings,
} from 'lucide-react';
import { SidebarBase, SidebarConfig } from './SidebarBase';

interface TaskHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

const taskHubSidebarConfig: SidebarConfig = {
  badge: 'TH',
  label: 'TaskHub',
  items: [
    { id: 'task10', title: 'Task¹⁰', path: '/taskhub/task10', icon: LayoutList, exact: false },
    { id: 'my-tasks', title: 'My Tasks', path: '/taskhub/my-tasks', icon: ListTodo, exact: false },
    { id: 'workstreams', title: 'Workstreams', path: '/taskhub/workstreams', icon: Layers, exact: false },
    { id: 'calendar', title: 'Calendar', path: '/taskhub/calendar', icon: CalendarDays, exact: false },
  ],
  footerItem: {
    id: 'settings',
    title: 'TaskHub Settings',
    path: '/taskhub/settings',
    icon: Settings,
    exact: true,
  },
};

export function TaskHubSidebar({ expanded, onToggle, className }: TaskHubSidebarProps) {
  return (
    <SidebarBase
      config={taskHubSidebarConfig}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
