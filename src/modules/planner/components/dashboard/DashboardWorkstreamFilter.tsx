// ============================================================
// DASHBOARD WORKSTREAM FILTER - V2 Implementation
// Dropdown to filter by "My Workstreams", "All", or specific
// Per V2 Spec: NO "This Sprint" option in time filter
// ============================================================

import { useState } from 'react';
import { Check, ChevronDown, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Workstream {
  id: string;
  name: string;
  color: string;
}

interface DashboardWorkstreamFilterProps {
  workstreams: Workstream[];
  selectedFilter: 'my' | 'all' | string; // 'my', 'all', or workstream ID
  onFilterChange: (filter: 'my' | 'all' | string) => void;
  canViewAll: boolean;
}

export function DashboardWorkstreamFilter({
  workstreams,
  selectedFilter,
  onFilterChange,
  canViewAll,
}: DashboardWorkstreamFilterProps) {
  const [open, setOpen] = useState(false);

  const getDisplayLabel = () => {
    if (selectedFilter === 'my') return 'My Workstreams';
    if (selectedFilter === 'all') return 'All Workstreams';
    
    const ws = workstreams.find(w => w.id === selectedFilter);
    return ws?.name || 'Select Workstream';
  };

  const getSelectedColor = () => {
    if (selectedFilter === 'my' || selectedFilter === 'all') return null;
    const ws = workstreams.find(w => w.id === selectedFilter);
    return ws?.color || null;
  };

  const selectedColor = getSelectedColor();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 text-xs font-medium"
        >
          {selectedColor && (
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: selectedColor }}
            />
          )}
          {!selectedColor && <Layers className="w-3.5 h-3.5 text-slate-500" />}
          <span>{getDisplayLabel()}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-48">
        {/* My Workstreams */}
        <DropdownMenuItem
          onClick={() => {
            onFilterChange('my');
            setOpen(false);
          }}
          className={cn(
            'flex items-center justify-between',
            selectedFilter === 'my' && 'bg-slate-100 dark:bg-slate-800'
          )}
        >
          <span>My Workstreams</span>
          {selectedFilter === 'my' && <Check className="w-4 h-4 text-blue-600" />}
        </DropdownMenuItem>
        
        {/* All Workstreams - only for management/admin */}
        {canViewAll && (
          <DropdownMenuItem
            onClick={() => {
              onFilterChange('all');
              setOpen(false);
            }}
            className={cn(
              'flex items-center justify-between',
              selectedFilter === 'all' && 'bg-slate-100 dark:bg-slate-800'
            )}
          >
            <span>All Workstreams</span>
            {selectedFilter === 'all' && <Check className="w-4 h-4 text-blue-600" />}
          </DropdownMenuItem>
        )}
        
        {workstreams.length > 0 && <DropdownMenuSeparator />}
        
        {/* Individual workstreams */}
        {workstreams.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => {
              onFilterChange(ws.id);
              setOpen(false);
            }}
            className={cn(
              'flex items-center justify-between',
              selectedFilter === ws.id && 'bg-slate-100 dark:bg-slate-800'
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: ws.color }}
              />
              <span>{ws.name}</span>
            </div>
            {selectedFilter === ws.id && <Check className="w-4 h-4 text-blue-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
