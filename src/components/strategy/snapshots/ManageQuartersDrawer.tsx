import { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetBody } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X, Trash2, Search, AlertTriangle } from 'lucide-react';
import { StrategicSnapshot, useSnapshotConfiguration, generateQuarterOptions } from '@/hooks/useStrategicSnapshots';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { catalystToast } from '@/lib/catalystToast';
import { cn } from '@/lib/utils';

interface ManageQuartersDrawerProps {
  open: boolean;
  onClose: () => void;
  snapshot: StrategicSnapshot;
}

export function ManageQuartersDrawer({ open, onClose, snapshot }: ManageQuartersDrawerProps) {
  const { data: configuration } = useSnapshotConfiguration(snapshot.id);
  const queryClient = useQueryClient();
  
  const [assignedQuarters, setAssignedQuarters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  
  const isArchived = snapshot.status === 'ARCHIVED';
  const allQuarters = useMemo(() => generateQuarterOptions(), []);

  useEffect(() => {
    if (open && configuration) {
      setAssignedQuarters(configuration.quarters || []);
      setSelectedToAdd([]);
      setSearchQuery('');
    }
  }, [open, configuration]);

  const availableQuarters = useMemo(() => {
    return allQuarters.filter(
      (q) => !assignedQuarters.includes(q) && q.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allQuarters, assignedQuarters, searchQuery]);

  const handleRemoveQuarter = (quarter: string) => {
    if (isArchived) return;
    setAssignedQuarters((prev) => prev.filter((q) => q !== quarter));
  };

  const toggleSelectQuarter = (quarter: string) => {
    if (isArchived) return;
    setSelectedToAdd((prev) =>
      prev.includes(quarter) ? prev.filter((q) => q !== quarter) : [...prev, quarter]
    );
  };

  const handleAddSelected = () => {
    if (isArchived || selectedToAdd.length === 0) return;
    setAssignedQuarters((prev) => [...prev, ...selectedToAdd]);
    setSelectedToAdd([]);
  };

  const handleApply = async () => {
    if (isArchived) return;
    setSaving(true);
    try {
      // Include any pending selections in the final save
      const finalQuarters = [...assignedQuarters, ...selectedToAdd];
      
      const { error } = await supabase
        .from('snapshot_configurations')
        .update({ quarters: finalQuarters })
        .eq('snapshot_id', snapshot.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['snapshot-configuration', snapshot.id] });
      queryClient.invalidateQueries({ queryKey: ['strategic-snapshots'] });
      catalystToast.success('Success', 'Quarters updated');
      onClose();
    } catch (err: any) {
      catalystToast.error('Error', err.message || 'Failed to update quarters');
    } finally {
      setSaving(false);
    }
  };

  // Include pending selections in the count and change detection
  const totalSelected = assignedQuarters.length + selectedToAdd.length;
  
  const hasChanges = useMemo(() => {
    const original = configuration?.quarters || [];
    const finalQuarters = [...assignedQuarters, ...selectedToAdd];
    if (original.length !== finalQuarters.length) return true;
    return !original.every((q) => finalQuarters.includes(q));
  }, [configuration?.quarters, assignedQuarters, selectedToAdd]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" width="medium" className="flex flex-col" hideClose>
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Manage quarters</SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Snapshot: {snapshot.name}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md border-brand-gold/30"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {isArchived && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-muted rounded-md">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Archived snapshots are read-only</span>
            </div>
          )}
        </SheetHeader>

        <SheetBody className="flex-1 overflow-hidden">
          <div className="space-y-6 h-full flex flex-col">
            {/* Assigned Quarters Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Assigned quarters</Label>
              {assignedQuarters.length === 0 ? (
                <div className="text-sm text-muted-foreground italic py-4 text-center border border-dashed rounded-md">
                  No quarters assigned yet.
                </div>
              ) : (
                <ScrollArea className="max-h-[180px]">
                  <div className="space-y-1">
                    {assignedQuarters.map((quarter) => (
                      <div
                        key={quarter}
                        className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
                      >
                        <span className="text-sm font-medium">{quarter}</span>
                        {!isArchived && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveQuarter(quarter)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {assignedQuarters.length === 0 && !isArchived && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  At least 1 quarter is recommended for activation.
                </p>
              )}
            </div>

            {/* Add Quarters Section */}
            {!isArchived && (
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <Label className="text-sm font-medium">Add quarters</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search quarters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="flex-1 min-h-[150px] max-h-[200px] border rounded-md">
                  <div className="p-2 space-y-1">
                    {availableQuarters.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {searchQuery ? 'No matching quarters' : 'All quarters assigned'}
                      </p>
                    ) : (
                      availableQuarters.map((quarter) => (
                        <label
                          key={quarter}
                          className={cn(
                            'flex items-center gap-3 py-2 px-3 rounded-md cursor-pointer transition-colors',
                            selectedToAdd.includes(quarter)
                              ? 'bg-brand-gold/10'
                              : 'hover:bg-muted/50'
                          )}
                        >
                          <Checkbox
                            checked={selectedToAdd.includes(quarter)}
                            onCheckedChange={() => toggleSelectQuarter(quarter)}
                          />
                          <span className="text-sm">{quarter}</span>
                        </label>
                      ))
                    )}
                  </div>
                </ScrollArea>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddSelected}
                  disabled={selectedToAdd.length === 0}
                  className="self-start"
                >
                  Add selected ({selectedToAdd.length})
                </Button>
              </div>
            )}
          </div>
        </SheetBody>

        <SheetFooter className="border-t pt-4 flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {totalSelected} quarter{totalSelected !== 1 ? 's' : ''} selected
          </Badge>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {!isArchived && (
              <Button onClick={handleApply} disabled={saving || !hasChanges}>
                {saving ? 'Applying...' : 'Apply'}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
