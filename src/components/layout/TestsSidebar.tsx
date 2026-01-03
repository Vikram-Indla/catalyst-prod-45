/**
 * TESTS SIDEBAR
 * Navigation sidebar for the global Tests module
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TestsSidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '' },
  { id: 'cases', label: 'Cases', icon: ListChecks, path: 'cases' },
  { id: 'sets', label: 'Sets', icon: Package, path: 'sets' },
  { id: 'cycles', label: 'Cycles', icon: RefreshCcw, path: 'cycles' },
  { id: 'executions', label: 'Executions', icon: Play, path: 'executions' },
  { id: 'traceability', label: 'Traceability', icon: GitBranch, path: 'traceability' },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: 'reports' },
  { id: 'admin', label: 'Admin', icon: Settings, path: 'admin' },
];

export function TestsSidebar({ expanded, onToggle }: TestsSidebarProps) {
  const [searchParams] = useSearchParams();
  
  // Build URL preserving scope params
  const buildUrl = (path: string) => {
    const base = path ? `/tests/${path}` : '/tests';
    const scopeType = searchParams.get('scopeType');
    const scopeId = searchParams.get('scopeId');
    
    if (scopeType) {
      const params = new URLSearchParams();
      params.set('scopeType', scopeType);
      if (scopeId) params.set('scopeId', scopeId);
      return `${base}?${params.toString()}`;
    }
    return base;
  };

  return (
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

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
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

          return linkContent;
        })}
      </nav>
    </aside>
  );
}
