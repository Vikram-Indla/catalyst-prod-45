import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SpendDrilldownModalProps {
  epicId: string;
  spendType: 'accepted' | 'forecasted' | 'estimated';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpendDrilldownModal({ epicId, spendType, open, onOpenChange }: SpendDrilldownModalProps) {
  const [selectedPIId, setSelectedPIId] = useState<string>('');

  const getSpendTypeLabel = () => {
    switch (spendType) {
      case 'accepted': return 'Accepted Spend';
      case 'forecasted': return 'Forecasted Spend';
      case 'estimated': return 'Estimated Spend';
      default: return 'Spend';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{getSpendTypeLabel()} Breakdown</DialogTitle>
          <DialogDescription>
            Story-level spend details for this epic
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="pi-filter">Filter by Program Increment</Label>
            <Select value={selectedPIId} onValueChange={setSelectedPIId}>
              <SelectTrigger id="pi-filter" className="mt-2">
                <SelectValue placeholder="All PIs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All PIs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-semibold">Total Spend:</span>
            <span className="text-2xl font-bold">$0</span>
          </div>

          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Story ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Sprint</TableHead>
                  <TableHead className="text-right">Spend/Point</TableHead>
                  <TableHead className="text-right">Estimate</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No stories found
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
