/**
 * Capacity Presentation Shell
 * Clean presentation wrapper that hides navigation and provides controls
 */

import { ReactNode, useEffect, useCallback } from 'react';
import { X, Download, Clock, FileText, LayoutGrid, Table2, CalendarDays, Briefcase, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';
import { useCapacityViewStore, type PrimaryView, type ResourceViewMode } from '@/stores/capacityViewStore';
import { format } from 'date-fns';

interface CapacityPresentationShellProps {
  children: ReactNode;
  onExit: () => void;
  onExport?: () => void;
}

export function CapacityPresentationShell({ 
  children, 
  onExit,
  onExport 
}: CapacityPresentationShellProps) {
  const { 
    primaryView, 
    resourceView,
    filters,
    setPrimaryView,
    setResourceView,
  } = useCapacityViewStore();

  // Handle ESC key to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  // Get current tab label for display
  const getCurrentTabLabel = useCallback(() => {
    if (primaryView === 'contracts') return 'Contracts';
    if (primaryView === 'projects') return 'Projects';
    
    // Resources view modes
    switch (resourceView) {
      case 'table': return 'Resources';
      case 'cards': return 'Allocations';
      case 'timeline': return 'Gantt';
      case 'heatmap': return 'Heatmap';
      default: return 'Resources';
    }
  }, [primaryView, resourceView]);

  // Tab configuration matching SleekCapacityHeader
  const tabs = [
    { 
      id: 'resources', 
      label: 'Resources', 
      icon: Table2,
      isActive: primaryView === 'resources' && resourceView === 'table',
      onClick: () => {
        setPrimaryView('resources');
        setResourceView('table');
      }
    },
    { 
      id: 'projects', 
      label: 'Projects', 
      icon: Briefcase,
      isActive: primaryView === 'projects',
      onClick: () => setPrimaryView('projects')
    },
    { 
      id: 'allocations', 
      label: 'Allocations', 
      icon: LayoutGrid,
      isActive: primaryView === 'resources' && resourceView === 'cards',
      onClick: () => {
        setPrimaryView('resources');
        setResourceView('cards');
      }
    },
    { 
      id: 'gantt', 
      label: 'Gantt', 
      icon: CalendarDays,
      isActive: primaryView === 'resources' && resourceView === 'timeline',
      onClick: () => {
        setPrimaryView('resources');
        setResourceView('timeline');
      }
    },
    { 
      id: 'contracts', 
      label: 'Contracts', 
      icon: FileText,
      isActive: primaryView === 'contracts',
      onClick: () => setPrimaryView('contracts')
    },
  ];

  // Filter summary
  const getFilterSummary = () => {
    const parts: string[] = [];
    
    if (filters.departmentFilter !== 'all') {
      parts.push(`Track: ${filters.departmentFilter.charAt(0).toUpperCase() + filters.departmentFilter.slice(1)}`);
    }
    if (filters.activeFilter !== 'all') {
      const filterLabels: Record<string, string> = {
        available: 'Available',
        atCapacity: 'At Capacity',
        over: 'Over-Allocated',
      };
      parts.push(filterLabels[filters.activeFilter] || filters.activeFilter);
    }
    if (filters.groupBy !== 'none') {
      parts.push(`Grouped by ${filters.groupBy}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const filterSummary = getFilterSummary();

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      {/* Top Bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-card border-b border-border">
        {/* Left: Logo + Context */}
        <div className="flex items-center gap-4">
          <Logo variant="dark" size="md" />
          
          <div className="w-px h-6 bg-border" />
          
          {/* Current Context Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Capacity Planning
            </span>
            {filterSummary && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {filterSummary}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Center: Tab Strip */}
        <div className="flex items-center bg-muted/80 rounded-2xl p-1.5 gap-1 shadow-inner border border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={tab.onClick}
                className={cn(
                  'relative flex items-center gap-2.5 px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-200',
                  tab.isActive 
                    ? 'bg-card text-emerald-600 shadow-md border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                )}
              >
                <Icon className={cn(
                  "w-4 h-4",
                  tab.isActive ? "text-emerald-600" : ""
                )} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Timestamp */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{format(new Date(), 'MMM d, yyyy h:mm a')}</span>
          </div>
          
          <div className="w-px h-6 bg-border" />
          
          {/* Export Button */}
          {onExport && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onExport}
              className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
          )}
          
          {/* Exit Button */}
          <Button 
            size="sm" 
            onClick={onExit}
            className="gap-1.5 h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <X className="h-3.5 w-3.5" />
            Exit Present
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-muted/30 flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col">
          {children}
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-card/90 backdrop-blur-sm rounded-lg border border-border shadow-sm text-xs text-muted-foreground">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">ESC</kbd>
        <span>to exit</span>
      </div>
    </div>
  );
}
