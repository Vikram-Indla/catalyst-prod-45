/**
 * TESTS SIDEBAR
 * Navigation sidebar for the global Tests module
 * 
 * SCOPE ENFORCEMENT:
 * - Test Library, Cases, Sets, Cycles, Executions are HIDDEN at Program/Enterprise scope
 * - Only Overview, Reports, and Admin visible at aggregate scopes
 * - Full navigation available only at Project scope
 */

import React from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ListChecks, 
  Package, 
  RefreshCcw, 
  Play, 
  BarChart3, 
  Settings,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface TestsSidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  projectOnly?: boolean; // Items marked projectOnly are hidden at program/enterprise scope
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '' },
  { id: 'cases', label: 'Cases', icon: ListChecks, path: 'cases', projectOnly: true },
  { id: 'sets', label: 'Sets', icon: Package, path: 'sets', projectOnly: true },
  { id: 'cycles', label: 'Cycles', icon: RefreshCcw, path: 'cycles', projectOnly: true },
  { id: 'executions', label: 'Executions', icon: Play, path: 'executions', projectOnly: true },
  { id: 'traceability', label: 'Traceability', icon: GitBranch, path: 'traceability', projectOnly: true },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: 'reports' },
  { id: 'admin', label: 'Admin', icon: Settings, path: 'admin' },
];

export function TestsSidebar({ expanded, onToggle }: TestsSidebarProps) {
  const [searchParams] = useSearchParams();
  
  // Determine scope - test operations only available at project level
  const scopeType = searchParams.get('scopeType') || 'project';
  const isProjectScope = scopeType === 'project';
  
  // Build URL preserving scope params
  const buildUrl = (path: string) => {
    const base = path ? `/tests/${path}` : '/tests';
    const scopeId = searchParams.get('scopeId');
    
    if (scopeType) {
      const params = new URLSearchParams();
      params.set('scopeType', scopeType);
      if (scopeId) params.set('scopeId', scopeId);
      return `${base}?${params.toString()}`;
    }
    return base;
  };

  // Filter nav items based on scope
  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.projectOnly && !isProjectScope) {
      return false; // Hide project-only items at program/enterprise scope
    }
    return true;
  });

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'h-full flex flex-col border-r border-border-default bg-surface-2 transition-all duration-200',
          expanded ? 'w-52' : 'w-14'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-4 border-b border-border-default',
          expanded ? 'justify-between' : 'justify-center'
        )}>
          {expanded && (
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-accent-primary" />
              <span className="font-semibold text-text-primary">Tests</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggle}
          >
            {expanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Scope Indicator for non-project */}
        {!isProjectScope && expanded && (
          <div className="px-3 py-2 border-b border-border-default bg-warning/5">
            <div className="flex items-center gap-2 text-warning">
              <Lock className="h-3.5 w-3.5" />
              <span className="c-caption font-medium">Read-only View</span>
            </div>
            <p className="c-caption text-text-muted mt-1">
              Select a project to manage tests
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-2 px-2 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const linkContent = (
              <NavLink
                key={item.id}
                to={buildUrl(item.path)}
                end={item.path === ''}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent-subtle text-accent-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-3',
                    !expanded && 'justify-center px-2'
                  )
                }
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {expanded && <span>{item.label}</span>}
              </NavLink>
            );

            if (!expanded) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <React.Fragment key={item.id}>{linkContent}</React.Fragment>;
          })}
        </nav>
      </aside>
    </TooltipProvider>
  );
}
