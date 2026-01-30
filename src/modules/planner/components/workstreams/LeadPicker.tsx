// ============================================================================
// LEAD PICKER — Matches Task Board Modal Assignee style
// Clean, simple Popover-based dropdown for workstream lead assignment
// ============================================================================

import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useResourceInventory } from '../../hooks/useResourceInventory';
import { getWorkstreamColor } from '@/lib/workstream-colors';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface LeadPickerProps {
  value: string | null;  // Current lead ID (resource_inventory.id)
  currentLeadInfo?: { id: string; name: string; initials?: string } | null;
  workstreamColor?: string;
  workstreamName?: string;
  onChange: (leadId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getInitials = (name: string | null): string => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

const getColorFromName = (name: string): string => {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#2563eb'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LeadPicker({
  value,
  currentLeadInfo,
  workstreamColor,
  workstreamName,
  onChange,
  placeholder = 'Assign lead...',
  disabled = false,
  className
}: LeadPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  const { data: resources = [], isLoading } = useResourceInventory();

  // Focus search input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Find display lead from resources or use currentLeadInfo
  const displayLead = useMemo(() => {
    if (value) {
      const found = resources.find(r => r.id === value);
      if (found) {
        return { id: found.id, name: found.name, initials: found.initials };
      }
    }
    return currentLeadInfo || null;
  }, [value, resources, currentLeadInfo]);

  // Get workstream colors for avatar
  const wsColors = workstreamName ? getWorkstreamColor(workstreamName) : null;
  const avatarColor = workstreamColor || wsColors?.hex || (displayLead ? getColorFromName(displayLead.name) : '#64748b');

  // Filter resources by search
  const filteredResources = useMemo(() => {
    if (!search.trim()) return resources;
    const lower = search.toLowerCase();
    return resources.filter(r => 
      r.name?.toLowerCase().includes(lower) || 
      r.email?.toLowerCase().includes(lower)
    );
  }, [resources, search]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <button 
          className={cn(
            "inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border",
            "bg-background hover:bg-muted/50 transition-colors text-sm",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
        >
          {displayLead ? (
            <>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {displayLead.initials || getInitials(displayLead.name)}
              </div>
              <span className="text-foreground truncate max-w-[140px]">{displayLead.name}</span>
            </>
          ) : (
            <>
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{placeholder}</span>
            </>
          )}
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-64 p-0 z-[99999] bg-popover border border-border shadow-lg" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div className="p-2 border-b border-border">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        
        {/* Options List */}
        <div className="max-h-[240px] overflow-y-auto p-1.5">
          {/* Unassigned Option */}
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
              !value ? "bg-muted font-semibold" : "hover:bg-muted/50"
            )}
          >
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
              ?
            </div>
            <span className="text-muted-foreground">Unassigned</span>
            {!value && <Check className="w-4 h-4 ml-auto text-primary" />}
          </button>
          
          {/* Loading State */}
          {isLoading && (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              Loading...
            </div>
          )}
          
          {/* Resources List */}
          {!isLoading && filteredResources.map((resource) => {
            const resourceColor = getColorFromName(resource.name);
            return (
              <button
                key={resource.id}
                onClick={() => { onChange(resource.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  value === resource.id ? "bg-muted font-semibold" : "hover:bg-muted/50"
                )}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                  style={{ backgroundColor: resourceColor }}
                >
                  {resource.initials || getInitials(resource.name)}
                </div>
                <span className="truncate">{resource.name || 'Unnamed'}</span>
                {value === resource.id && <Check className="w-4 h-4 ml-auto text-primary flex-shrink-0" />}
              </button>
            );
          })}
          
          {/* Empty State */}
          {!isLoading && filteredResources.length === 0 && search && (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              No results found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
