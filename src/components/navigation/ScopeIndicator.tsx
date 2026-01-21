/**
 * Scope Indicator Pill
 * Shows current scope context in top nav, clickable to switch, clearable
 */

import { cn } from '@/lib/utils';
import { X, Building2, Briefcase, FolderKanban, ChevronDown } from 'lucide-react';
import { useSpacesScope, ScopeLevel } from './SpacesScopeContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState } from 'react';

interface ScopeIndicatorProps {
  className?: string;
}

const SCOPE_CONFIG: Record<ScopeLevel, { 
  icon: typeof Building2; 
  label: string; 
  colors: string;
  bgHover: string;
}> = {
  enterprise: {
    icon: Building2,
    label: 'Enterprise',
    colors: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700',
    bgHover: 'hover:bg-violet-200 dark:hover:bg-violet-800/40',
  },
  program: {
    icon: Briefcase,
    label: 'Program',
    colors: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    bgHover: 'hover:bg-blue-200 dark:hover:bg-blue-800/40',
  },
  project: {
    icon: FolderKanban,
    label: 'Project',
    colors: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
    bgHover: 'hover:bg-emerald-200 dark:hover:bg-emerald-800/40',
  },
};

export function ScopeIndicator({ className }: ScopeIndicatorProps) {
  const { currentScope, setScope, clearScope, getScopeLabel, enterprise, program, project } = useSpacesScope();
  const [open, setOpen] = useState(false);
  
  const config = SCOPE_CONFIG[currentScope];
  const Icon = config.icon;
  const scopeLabel = getScopeLabel();
  
  // Can only clear if not at enterprise level
  const canClear = currentScope !== 'enterprise';

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearScope();
  };

  const handleScopeSelect = (scope: ScopeLevel) => {
    setScope(scope);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs font-medium transition-colors",
            config.colors,
            config.bgHover,
            className
          )}
          aria-label={`Current scope: ${config.label} - ${scopeLabel}`}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="max-w-[120px] truncate">{config.label}: {scopeLabel}</span>
          {canClear ? (
            <button
              onClick={handleClear}
              className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              aria-label="Clear scope"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <ChevronDown className="w-3 h-3 ml-0.5" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
          Switch Scope
        </p>
        <div className="space-y-1">
          <button
            onClick={() => handleScopeSelect('enterprise')}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors",
              currentScope === 'enterprise' ? "bg-violet-100 dark:bg-violet-900/30" : "hover:bg-muted"
            )}
          >
            <Building2 className={cn("w-4 h-4", currentScope === 'enterprise' ? "text-violet-600" : "text-muted-foreground")} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{enterprise?.name || 'Enterprise'}</p>
              <p className="text-[10px] text-muted-foreground">Enterprise level</p>
            </div>
            {currentScope === 'enterprise' && (
              <span className="w-2 h-2 rounded-full bg-violet-500" />
            )}
          </button>

          <button
            onClick={() => handleScopeSelect('program')}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors",
              currentScope === 'program' ? "bg-blue-100 dark:bg-blue-900/30" : "hover:bg-muted"
            )}
          >
            <Briefcase className={cn("w-4 h-4", currentScope === 'program' ? "text-blue-600" : "text-muted-foreground")} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{program?.name || 'Digital Transformation'}</p>
              <p className="text-[10px] text-muted-foreground">Program level</p>
            </div>
            {currentScope === 'program' && (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </button>

          <button
            onClick={() => handleScopeSelect('project')}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors",
              currentScope === 'project' ? "bg-emerald-100 dark:bg-emerald-900/30" : "hover:bg-muted"
            )}
          >
            <FolderKanban className={cn("w-4 h-4", currentScope === 'project' ? "text-emerald-600" : "text-muted-foreground")} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{project?.name || 'Catalyst Platform'}</p>
              <p className="text-[10px] text-muted-foreground">Project level</p>
            </div>
            {currentScope === 'project' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
