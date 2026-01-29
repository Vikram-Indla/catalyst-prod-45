// ============================================================
// INLINE LEAD SELECT - Workstreams V10
// Searchable dropdown for assigning a lead from resource_inventory
// Only shows when no lead is currently assigned
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { Check, Search, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResourceInventory, Resource } from '../../hooks/useResourceInventory';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface InlineLeadSelectProps {
  workstreamId: string;
  workstreamColor: string;
  currentLead?: { id: string; name: string; initials: string } | null;
  onAssignLead: (userId: string) => void;
  disabled?: boolean;
}

export function InlineLeadSelect({
  workstreamId,
  workstreamColor,
  currentLead,
  onAssignLead,
  disabled = false,
}: InlineLeadSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { data: resources = [], isLoading } = useResourceInventory();
  
  // Focus search input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filter resources based on search
  const filteredResources = resources.filter(r => {
    if (!search) return true;
    const lowerSearch = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(lowerSearch) ||
      r.email?.toLowerCase().includes(lowerSearch) ||
      r.role?.toLowerCase().includes(lowerSearch)
    );
  });

  const handleSelect = (resource: Resource) => {
    if (resource.profile_id) {
      onAssignLead(resource.profile_id);
      setOpen(false);
      setSearch('');
    }
  };

  // If a lead is already assigned, just display their info
  if (currentLead) {
    return (
      <div className="ws-row-lead">
        <div 
          className="ws-avatar ws-avatar-sm" 
          style={{ background: workstreamColor }}
        >
          {currentLead.initials}
        </div>
        <span>{currentLead.name}</span>
      </div>
    );
  }

  // No lead assigned - show clickable "Unassigned" to trigger selection
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "ws-row-unassigned inline-flex items-center gap-1.5 px-2 py-1 -mx-2 rounded-md",
            "hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setOpen(true);
          }}
          disabled={disabled}
        >
          <User className="w-3.5 h-3.5 opacity-50" />
          <span>Unassigned</span>
          <ChevronDown className="w-3 h-3 opacity-40" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-0 z-[9999] bg-popover text-popover-foreground border border-border shadow-lg" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {/* Resource List */}
        <div className="max-h-64 overflow-y-auto py-1">
          {isLoading ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              Loading resources...
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              {search ? 'No matching resources' : 'No resources available'}
            </div>
          ) : (
            filteredResources.map((resource) => (
              <button
                key={resource.id}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left",
                  "hover:bg-muted/60 transition-colors",
                  "focus:outline-none focus:bg-muted/60",
                  !resource.profile_id && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleSelect(resource)}
                disabled={!resource.profile_id}
              >
                {/* Avatar */}
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0"
                  style={{ background: workstreamColor }}
                >
                  {resource.initials}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {resource.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {resource.role}
                    {resource.department && ` · ${resource.department}`}
                  </div>
                </div>

                {/* Capacity indicator */}
                <div className="text-xs text-muted-foreground shrink-0">
                  {resource.capacity}%
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-3 py-2 border-t border-border bg-muted">
          <p className="text-xs text-muted-foreground">
            Select a resource to assign as lead
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
