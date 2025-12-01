import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EstimationConversion {
  id: string;
  work_item_type: string;
  tshirt_size: string;
  member_weeks: number;
  sort_order: number;
}

interface EstimationConversionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EstimationConversionsModal({ open, onOpenChange }: EstimationConversionsModalProps) {
  const [workItemType, setWorkItemType] = useState<'epic' | 'feature'>('epic');
  const [conversions, setConversions] = useState<EstimationConversion[]>([]);
  const [pointsPerWeek, setPointsPerWeek] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadConversions();
    }
  }, [open, workItemType]);

  const loadConversions = async () => {
    const { data, error } = await supabase
      .from('estimation_conversions')
      .select('*')
      .eq('work_item_type', workItemType)
      .order('sort_order');

    if (error) {
      toast.error('Failed to load conversions');
      return;
    }

    setConversions(data || []);
  };

  const calculateDerivedValues = (memberWeeks: number) => {
    const teamWeeks = (memberWeeks / 6).toFixed(1);
    const ftePerMonth = (memberWeeks / 4).toFixed(1);
    const storyPoints = Math.round(memberWeeks * pointsPerWeek);
    return { teamWeeks, ftePerMonth, storyPoints };
  };

  const handleMemberWeeksChange = (id: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    setConversions(prev => prev.map(c =>
      c.id === id ? { ...c, member_weeks: numValue } : c
    ));
  };

  const handleAddSize = () => {
    const newConversion: EstimationConversion = {
      id: `new-${Date.now()}`,
      work_item_type: workItemType,
      tshirt_size: 'New Size',
      member_weeks: 1,
      sort_order: conversions.length + 1
    };
    setConversions([...conversions, newConversion]);
  };

  const handleDeleteSize = (id: string) => {
    setConversions(prev => prev.filter(c => c.id !== id));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Delete all existing conversions for this work item type
      await supabase
        .from('estimation_conversions')
        .delete()
        .eq('work_item_type', workItemType);

      // Insert updated conversions
      const { error } = await supabase
        .from('estimation_conversions')
        .insert(conversions.map(c => ({
          work_item_type: c.work_item_type,
          tshirt_size: c.tshirt_size,
          member_weeks: c.member_weeks,
          sort_order: c.sort_order
        })));

      if (error) throw error;

      toast.success('Estimation conversions saved successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to save conversions: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Estimation Conversions</DialogTitle>
          <DialogDescription className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5" />
            <span>
              Configure your estimation system conversions for each work item type. These settings apply to all portfolios. 
              Conversions are used to calculate point-based load, estimated costs, and progress values.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Work Item Type Selection */}
          <div className="space-y-2">
            <Label>Work Item</Label>
            <Select value={workItemType} onValueChange={(v) => setWorkItemType(v as 'epic' | 'feature')}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="epic">Epic</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Points Per Week Configuration */}
          <div className="space-y-2">
            <Label>1 person working for 1 week delivers how many story points?</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min="1"
                max="20"
                value={pointsPerWeek}
                onChange={(e) => setPointsPerWeek(parseInt(e.target.value) || 5)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                1 MW = {pointsPerWeek} story points or 1 story point = {(1 / pointsPerWeek).toFixed(2)} MW
              </span>
            </div>
          </div>

          {/* Conversions Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>T-shirt Size</TableHead>
                  <TableHead>Member Weeks</TableHead>
                  <TableHead>Team Weeks</TableHead>
                  <TableHead>FTE/mo</TableHead>
                  <TableHead>Story Points</TableHead>
                  <TableHead>Sort</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversions.map((conversion) => {
                  const { teamWeeks, ftePerMonth, storyPoints } = calculateDerivedValues(conversion.member_weeks);
                  return (
                    <TableRow key={conversion.id}>
                      <TableCell>
                        <Input
                          value={conversion.tshirt_size}
                          onChange={(e) => setConversions(prev => prev.map(c =>
                            c.id === conversion.id ? { ...c, tshirt_size: e.target.value } : c
                          ))}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={conversion.member_weeks}
                          onChange={(e) => handleMemberWeeksChange(conversion.id, e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{teamWeeks}</TableCell>
                      <TableCell className="text-muted-foreground">{ftePerMonth}</TableCell>
                      <TableCell className="text-muted-foreground">{storyPoints}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={conversion.sort_order}
                          onChange={(e) => setConversions(prev => prev.map(c =>
                            c.id === conversion.id ? { ...c, sort_order: parseInt(e.target.value) || 1 } : c
                          ))}
                          className="w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSize(conversion.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Button variant="outline" size="sm" onClick={handleAddSize} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add new size
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
