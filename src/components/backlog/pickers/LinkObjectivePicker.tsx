/**
 * =====================================================
 * Link Objective Picker - Multi-Select Enterprise Picker
 * =====================================================
 * 
 * Enhanced picker with search, filters, multi-select,
 * and sticky footer. NO HEALTH CONCEPT.
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, Target, Check, X
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

interface LinkObjectivePickerProps {
  open: boolean;
  onClose: () => void;
  themeId: string | undefined;
  linkedObjectiveIds: string[];
  onLinked: () => void;
}

// Objective statuses (NO HEALTH)
const OBJECTIVE_STATUSES = ['draft', 'active', 'completed', 'cancelled'];

export function LinkObjectivePicker({ 
  open, 
  onClose, 
  themeId, 
  linkedObjectiveIds, 
  onLinked 
}: LinkObjectivePickerProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when dialog opens/closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedIds(new Set());
      setSearch('');
      setStatusFilter('all');
      onClose();
    }
  };

  // Fetch available objectives (NO HEALTH FIELD)
  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['available-objectives-picker', themeId],
    queryFn: async () => {
      if (!themeId) return [];
      
      // Get objectives not linked to any theme
      const { data: unlinked, error: unlinkedError } = await supabase
        .from('objectives')
        .select('id, name, status, overall_progress, owner_id')
        .is('theme_id', null)
        .order('name');
      
      if (unlinkedError) throw unlinkedError;
      
      // Deduplicate by ID
      const seen = new Set<string>();
      const unique = (unlinked || []).filter(obj => {
        if (seen.has(obj.id)) return false;
        seen.add(obj.id);
        return true;
      });
      
      return unique;
    },
    enabled: open && !!themeId,
  });

  // Filter objectives
  const filteredObjectives = useMemo(() => {
    let result = [...objectives];
    
    // Filter out already linked
    result = result.filter(obj => !linkedObjectiveIds.includes(obj.id));
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(obj => 
        obj.name?.toLowerCase().includes(searchLower)
      );
    }
    
    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter(obj => obj.status === statusFilter);
    }
    
    return result;
  }, [objectives, linkedObjectiveIds, search, statusFilter]);

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
    mutationFn: async (objectiveIds: string[]) => {
      if (!themeId) throw new Error('No theme selected');
      
      for (const objectiveId of objectiveIds) {
        const { error } = await supabase
          .from('objectives')
          .update({ theme_id: themeId })
          .eq('id', objectiveId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      const count = selectedIds.size;
      toast.success(`${count} objective${count > 1 ? 's' : ''} linked`);
      queryClient.invalidateQueries({ queryKey: ['theme-objectives', themeId] });
      queryClient.invalidateQueries({ queryKey: ['available-objectives-picker'] });
      onLinked();
      handleOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to link objectives');
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
            <Target size={16} style={{ color: 'var(--brand-gold)' }} />
            Link Objectives
          </DialogTitle>
          <DialogDescription className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Select objectives to link to this theme
          </DialogDescription>
        </DialogHeader>
        
        {/* Search and Filters */}
        <div className="py-3 space-y-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <Input
              placeholder="Search objectives..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-[12px] pl-9"
              style={{ backgroundColor: 'var(--surface-subtle)', borderColor: 'var(--border-subtle)' }}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger 
                className="h-8 text-[11px] flex-1"
                style={{ backgroundColor: 'var(--surface-subtle)', borderColor: 'var(--border-subtle)' }}
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="z-[500]">
                <SelectItem value="all">All Statuses</SelectItem>
                {OBJECTIVE_STATUSES.map(status => (
                  <SelectItem key={status} value={status} className="capitalize">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Objectives List */}
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
            ) : filteredObjectives.length === 0 ? (
              <div className="py-8 text-center">
                <Target size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {objectives.length === 0 ? 'No unlinked objectives available' : 'No matching objectives'}
                </p>
              </div>
            ) : (
              filteredObjectives.map((objective) => {
                const isLinked = linkedObjectiveIds.includes(objective.id);
                const isSelected = selectedIds.has(objective.id);
                
                return (
                  <div 
                    key={objective.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
                      isLinked && "opacity-50 cursor-not-allowed"
                    )}
                    style={{ 
                      backgroundColor: isSelected ? 'var(--row-selected)' : 'var(--surface-subtle)',
                      border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                    }}
                    onClick={() => !isLinked && toggleSelection(objective.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isLinked}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span 
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary"
                        >
                          OBJ
                        </span>
                        {objective.status && (
                          <span 
                            className="text-[9px] px-1.5 py-0.5 rounded capitalize"
                            style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-muted)' }}
                          >
                            {objective.status}
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
                        {objective.name}
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
