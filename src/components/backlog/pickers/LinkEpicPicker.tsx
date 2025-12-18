/**
 * =====================================================
 * Link Epic Picker - Multi-Select Enterprise Picker
 * =====================================================
 * 
 * Enhanced picker with search, filters, multi-select,
 * and sticky footer. NO HEALTH CONCEPT.
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, Layers, Check
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LinkEpicPickerProps {
  open: boolean;
  onClose: () => void;
  themeId: string | undefined;
  linkedEpicIds: string[];
  onLinked: () => void;
}

// Epic states
const EPIC_STATES: Record<string, { label: string; color: string }> = {
  'funnel': { label: 'Funnel', color: 'var(--text-muted)' },
  'candidate': { label: 'Candidate', color: 'var(--status-info)' },
  'analysis': { label: 'Analysis', color: 'var(--status-warning)' },
  'backlog': { label: 'Backlog', color: 'var(--brand-primary)' },
  'implementing': { label: 'Implementing', color: 'var(--status-success)' },
  'done': { label: 'Done', color: 'var(--text-muted)' },
};

export function LinkEpicPicker({ 
  open, 
  onClose, 
  themeId, 
  linkedEpicIds, 
  onLinked 
}: LinkEpicPickerProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when dialog opens/closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedIds(new Set());
      setSearch('');
      setStateFilter('all');
      onClose();
    }
  };

  // Fetch available epics
  const { data: epics = [], isLoading } = useQuery({
    queryKey: ['available-epics-picker', themeId],
    queryFn: async () => {
      if (!themeId) return [];
      
      // Get epics not linked to any theme
      const { data, error } = await supabase
        .from('epics')
        .select('id, name, epic_key, state, owner_id')
        .is('theme_id', null)
        .order('name');
      
      if (error) throw error;
      
      // Deduplicate by ID
      const seen = new Set<string>();
      const unique = (data || []).filter(epic => {
        if (seen.has(epic.id)) return false;
        seen.add(epic.id);
        return true;
      });
      
      return unique;
    },
    enabled: open && !!themeId,
  });

  // Filter epics
  const filteredEpics = useMemo(() => {
    let result = [...epics];
    
    // Filter out already linked
    result = result.filter(epic => !linkedEpicIds.includes(epic.id));
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(epic => 
        epic.name?.toLowerCase().includes(searchLower) ||
        epic.epic_key?.toLowerCase().includes(searchLower)
      );
    }
    
    // State filter
    if (stateFilter && stateFilter !== 'all') {
      result = result.filter(epic => epic.state === stateFilter);
    }
    
    return result;
  }, [epics, linkedEpicIds, search, stateFilter]);

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Link mutation
  const linkMutation = useMutation({
    mutationFn: async (epicIds: string[]) => {
      if (!themeId) throw new Error('No theme selected');
      
      for (const epicId of epicIds) {
        const { error } = await supabase
          .from('epics')
          .update({ theme_id: themeId })
          .eq('id', epicId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      const count = selectedIds.size;
      toast.success(`${count} epic${count > 1 ? 's' : ''} linked`);
      queryClient.invalidateQueries({ queryKey: ['theme-epics', themeId] });
      queryClient.invalidateQueries({ queryKey: ['available-epics-picker'] });
      onLinked();
      handleOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to link epics');
    },
  });

  const handleLink = () => {
    if (selectedIds.size === 0) return;
    linkMutation.mutate(Array.from(selectedIds));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-lg flex flex-col max-h-[80vh]"
        style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--border-default)' }}
      >
        <DialogHeader style={{ borderBottom: '1px solid var(--border-subtle)' }} className="pb-4 shrink-0">
          <DialogTitle className="text-[15px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Layers size={16} style={{ color: 'var(--secondary-bronze)' }} />
            Link Epics
          </DialogTitle>
          <DialogDescription className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Select epics to align with this theme
          </DialogDescription>
        </DialogHeader>
        
        {/* Search and Filters */}
        <div className="py-3 space-y-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <Input
              placeholder="Search epics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-[12px] pl-9"
              style={{ backgroundColor: 'var(--surface-subtle)', borderColor: 'var(--border-subtle)' }}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger 
                className="h-8 text-[11px] flex-1"
                style={{ backgroundColor: 'var(--surface-subtle)', borderColor: 'var(--border-subtle)' }}
              >
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent className="z-[500]">
                <SelectItem value="all">All States</SelectItem>
                {Object.entries(EPIC_STATES).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Epics List */}
        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <div className="space-y-1 py-2">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div 
                    key={i} 
                    className="h-14 rounded-lg animate-pulse"
                    style={{ backgroundColor: 'var(--surface-subtle)' }}
                  />
                ))}
              </div>
            ) : filteredEpics.length === 0 ? (
              <div className="py-8 text-center">
                <Layers size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {epics.length === 0 ? 'No unlinked epics available' : 'No matching epics'}
                </p>
              </div>
            ) : (
              filteredEpics.map((epic) => {
                const isLinked = linkedEpicIds.includes(epic.id);
                const isSelected = selectedIds.has(epic.id);
                const stateInfo = EPIC_STATES[epic.state || 'funnel'] || EPIC_STATES['funnel'];
                
                return (
                  <div 
                    key={epic.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
                      isLinked && "opacity-50 cursor-not-allowed"
                    )}
                    style={{ 
                      backgroundColor: isSelected ? 'var(--row-selected)' : 'var(--surface-subtle)',
                      border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                    }}
                    onClick={() => !isLinked && toggleSelection(epic.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isLinked}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span 
                          className="text-[10px] font-mono"
                          style={{ color: 'var(--secondary-bronze)' }}
                        >
                          {epic.epic_key || 'E-???'}
                        </span>
                        {epic.state && (
                          <span 
                            className="text-[9px] px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--surface-bg)', color: stateInfo.color }}
                          >
                            {stateInfo.label}
                          </span>
                        )}
                        {isLinked && (
                          <span 
                            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                            style={{ backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)' }}
                          >
                            Linked
                          </span>
                        )}
                      </div>
                      <p 
                        className="text-[12px] font-medium truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {epic.name}
                      </p>
                    </div>
                    {isSelected && (
                      <Check size={14} style={{ color: 'var(--brand-primary)' }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Sticky Footer */}
        <DialogFooter 
          className="pt-4 shrink-0 flex items-center justify-between gap-2"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {selectedIds.size > 0 && `${selectedIds.size} selected`}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              className="text-[12px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLink}
              disabled={selectedIds.size === 0 || linkMutation.isPending}
              className="text-[12px]"
              style={{ 
                backgroundColor: selectedIds.size > 0 ? 'var(--brand-primary)' : undefined, 
                color: selectedIds.size > 0 ? 'white' : undefined 
              }}
            >
              {linkMutation.isPending ? 'Linking...' : `Link Selected (${selectedIds.size})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
