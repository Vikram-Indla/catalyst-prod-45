import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrandedCheckbox } from '@/components/ui/branded-checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trash2, Search, AlertTriangle, Lock, Plus } from 'lucide-react';
import { StrategicSnapshot, useSnapshotConfiguration, generateQuarterOptions } from '@/hooks/useStrategicSnapshots';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { catalystToast } from '@/lib/catalystToast';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ManageQuartersPanelProps {
  snapshot: StrategicSnapshot;
  onBack: () => void;
  isAdmin?: boolean;
}

// Helper to determine if a quarter is in the past
function isQuarterInPast(quarter: string): boolean {
  const match = quarter.match(/Q(\d)\s+(\d{4})/);
  if (!match) return false;
  
  const q = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const currentQuarter = Math.floor(currentMonth / 3) + 1;
  
  if (year < currentYear) return true;
  if (year === currentYear && q < currentQuarter) return true;
  return false;
}

export function ManageQuartersPanel({ snapshot, onBack, isAdmin = false }: ManageQuartersPanelProps) {
  const { data: configuration } = useSnapshotConfiguration(snapshot.id);
  const queryClient = useQueryClient();
  
  const [assignedQuarters, setAssignedQuarters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  
  const isArchived = snapshot.status === 'ARCHIVED';
  const isActive = snapshot.status === 'ACTIVE';
  const allQuarters = useMemo(() => generateQuarterOptions(), []);

  useEffect(() => {
    if (configuration) {
      setAssignedQuarters(configuration.quarters || []);
      setSelectedToAdd([]);
      setSearchQuery('');
    }
  }, [configuration]);

  const availableQuarters = useMemo(() => {
    return allQuarters.filter(
      (q) => !assignedQuarters.includes(q) && q.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allQuarters, assignedQuarters, searchQuery]);

  const handleRemoveQuarter = async (quarter: string) => {
    if (isArchived) return;
    setSaving(true);
    try {
      const newQuarters = assignedQuarters.filter((q) => q !== quarter);
      const { error } = await supabase
        .from('snapshot_configurations')
        .upsert(
          { snapshot_id: snapshot.id, quarters: newQuarters },
          { onConflict: 'snapshot_id' }
        );
      
      if (error) throw error;
      
      setAssignedQuarters(newQuarters);
      queryClient.invalidateQueries({ queryKey: ['snapshot-configuration', snapshot.id] });
      queryClient.invalidateQueries({ queryKey: ['strategic-snapshots'] });
      catalystToast.success('Quarter Removed', 'Quarter removed from snapshot');
    } catch (err: any) {
      catalystToast.error('Error', err.message || 'Failed to remove quarter');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectQuarter = (quarter: string) => {
    if (isArchived) return;
    
    // For active snapshots, non-admins cannot select past quarters
    if (isActive && !isAdmin && isQuarterInPast(quarter)) {
      catalystToast.error('Restricted', 'Only admins can select past quarters for active snapshots');
      return;
    }
    
    setSelectedToAdd((prev) =>
      prev.includes(quarter) ? prev.filter((q) => q !== quarter) : [...prev, quarter]
    );
  };

  const handleAddSelected = async () => {
    if (isArchived || selectedToAdd.length === 0) return;
    setSaving(true);
    try {
      const newQuarters = [...assignedQuarters, ...selectedToAdd];
      const { error } = await supabase
        .from('snapshot_configurations')
        .upsert(
          { snapshot_id: snapshot.id, quarters: newQuarters },
          { onConflict: 'snapshot_id' }
        );
      
      if (error) throw error;
      
      setAssignedQuarters(newQuarters);
      setSelectedToAdd([]);
      queryClient.invalidateQueries({ queryKey: ['snapshot-configuration', snapshot.id] });
      queryClient.invalidateQueries({ queryKey: ['strategic-snapshots'] });
      catalystToast.success('Quarters Added', `${selectedToAdd.length} quarter(s) added to snapshot`);
    } catch (err: any) {
      catalystToast.error('Error', err.message || 'Failed to add quarters');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-brand-primary">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="text-base font-semibold text-foreground">Manage Quarters</h3>
          <p className="text-xs text-muted-foreground">{snapshot.name}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto mt-4 space-y-6">
        {/* Assigned Quarters Section */}
        <div className="space-y-3">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Assigned Quarters ({assignedQuarters.length})
          </Label>
          {assignedQuarters.length === 0 ? (
            <div className="p-6 border-2 border-dashed border-border rounded-lg text-center">
              <p className="text-sm text-muted-foreground italic">No quarters assigned yet.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {assignedQuarters.map((quarter) => (
                <div
                  key={quarter}
                  className="flex items-center justify-between p-3 bg-background border border-border rounded-lg"
                >
                  <span className="text-sm font-medium">{quarter}</span>
                  {!isArchived && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveQuarter(quarter)}
                      disabled={saving}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {assignedQuarters.length === 0 && !isArchived && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-brand-primary/10">
              <AlertTriangle className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
              <span className="text-[13px] text-brand-primary">At least 1 quarter is recommended for activation.</span>
            </div>
          )}
        </div>

        {/* Add Quarters Section */}
        {!isArchived && (
          <div className="space-y-3">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Add Quarters</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quarters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[200px] border border-border rounded-lg">
              <div className="p-2 space-y-1">
                {availableQuarters.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchQuery ? 'No matching quarters' : 'All quarters assigned'}
                  </p>
                ) : (
                  availableQuarters.map((quarter) => {
                    const isPast = isQuarterInPast(quarter);
                    const isDisabled = isActive && !isAdmin && isPast;
                    
                    return (
                      <TooltipProvider key={quarter}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <label
                              className={cn(
                                'flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors',
                                isDisabled 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : 'cursor-pointer',
                                selectedToAdd.includes(quarter)
                                  ? 'bg-brand-primary/10 border border-brand-primary/30'
                                  : !isDisabled && 'hover:bg-muted/50 border border-transparent'
                              )}
                            >
                              <BrandedCheckbox
                                checked={selectedToAdd.includes(quarter)}
                                onChange={() => toggleSelectQuarter(quarter)}
                                disabled={isDisabled}
                              />
                              <span className="text-sm flex-1">{quarter}</span>
                              {isDisabled && (
                                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </label>
                          </TooltipTrigger>
                          {isDisabled && (
                            <TooltipContent side="right">
                              <p>Only admins can select past quarters</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })
                )}
              </div>
            </ScrollArea>
            <Button
              size="sm"
              className="bg-brand-primary hover:bg-brand-primary-hover text-white"
              onClick={handleAddSelected}
              disabled={selectedToAdd.length === 0 || saving}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Selected ({selectedToAdd.length})
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 mt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {assignedQuarters.length} quarter{assignedQuarters.length !== 1 ? 's' : ''} assigned
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
