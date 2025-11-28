import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

interface PullRankThemesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (rankingOption: string) => void;
}

/**
 * Pull Rank Dialog based on Jira Align spec:
 * https://help.jiraalign.com/hc/en-us/articles/115002917308-Prioritize-rank-work-items-in-the-backlog
 * 
 * Allows auto-ranking of themes by inheriting rank from parent items or by column values
 */
export function PullRankThemesDialog({ open, onOpenChange, onApply }: PullRankThemesDialogProps) {
  const [selectedRankingOption, setSelectedRankingOption] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const rankingOptions = [
    { 
      value: 'epic-portfolio-rank', 
      label: 'Use Epic (Portfolio Level) rank to sort Themes',
      description: 'Themes inherit ranking from their parent epics'
    },
    { 
      value: 'strategic-initiative-rank', 
      label: 'Use Strategic Initiative rank to sort Themes',
      description: 'Themes inherit ranking from their strategic initiatives'
    },
    { 
      value: 'column-value', 
      label: 'Rank by Column Value',
      description: 'Sort themes based on a selected column\'s values'
    },
  ];

  const handlePreview = () => {
    if (!selectedRankingOption) {
      toast.error('Please select a ranking option');
      return;
    }
    setShowPreview(true);
    toast.info('Generating ranking preview...');
  };

  const handleApply = () => {
    if (!selectedRankingOption) {
      toast.error('Please select a ranking option');
      return;
    }
    
    onApply(selectedRankingOption);
    toast.success('Theme ranking applied successfully');
    onOpenChange(false);
    
    // Reset state
    setSelectedRankingOption('');
    setShowPreview(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Pull Rank - Auto Ranking
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Automatically rank themes by inheriting rank from parent work items. Select a ranking option below:
          </p>

          {/* Ranking Options */}
          <div className="space-y-2">
            <Label>Ranking Method</Label>
            <Select value={selectedRankingOption} onValueChange={setSelectedRankingOption}>
              <SelectTrigger>
                <SelectValue placeholder="Select a ranking option" />
              </SelectTrigger>
              <SelectContent>
                {rankingOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedRankingOption && (
              <p className="text-xs text-muted-foreground">
                {rankingOptions.find(o => o.value === selectedRankingOption)?.description}
              </p>
            )}
          </div>

          {/* Important Note */}
          <div className="p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Important</p>
            <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
              Multiple themes may inherit the same rank from a parent item. Further manual ranking may be required to establish a complete priority order.
            </p>
          </div>

          {/* Preview Warning */}
          {showPreview && (
            <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Preview: Ranking will be applied based on the selected method. Click Apply to confirm.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!showPreview ? (
            <Button onClick={handlePreview}>
              Preview Ranking
            </Button>
          ) : (
            <Button onClick={handleApply}>
              Apply Ranking
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
