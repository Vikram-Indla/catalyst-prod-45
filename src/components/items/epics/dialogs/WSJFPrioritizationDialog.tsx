import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown } from 'lucide-react';

interface WSJFPrioritizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epics: any[];
}

export function WSJFPrioritizationDialog({
  open,
  onOpenChange,
  epics,
}: WSJFPrioritizationDialogProps) {
  const [sortBy, setSortBy] = useState<'wsjf' | 'name'>('wsjf');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedEpics = [...epics].sort((a, b) => {
    const aValue = sortBy === 'wsjf' ? (a.wsjf_score || 0) : a.name;
    const bValue = sortBy === 'wsjf' ? (b.wsjf_score || 0) : b.name;

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const toggleSort = (column: 'wsjf' | 'name') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const calculateWSJF = (epic: any) => {
    const bv = epic.business_value || 0;
    const tc = epic.time_criticality || 0;
    const rr = epic.risk_reduction || 0;
    const js = epic.job_size || 1;
    return js > 0 ? ((bv + tc + rr) / js).toFixed(2) : '0.00';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>WSJF Prioritization</DialogTitle>
          <DialogDescription>
            Weighted Shortest Job First prioritization for epics
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('name')}
                    className="h-8 px-2"
                  >
                    Name
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">BV</TableHead>
                <TableHead className="text-center">TC</TableHead>
                <TableHead className="text-center">RR</TableHead>
                <TableHead className="text-center">JS</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('wsjf')}
                    className="h-8 px-2"
                  >
                    WSJF Score
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEpics.length > 0 ? (
                sortedEpics.map((epic, index) => (
                  <TableRow key={epic.id}>
                    <TableCell className="font-medium text-center">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{epic.name}</TableCell>
                    <TableCell className="text-center">
                      {epic.business_value || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {epic.time_criticality || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {epic.risk_reduction || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {epic.job_size || 1}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="default" className="font-mono">
                        {calculateWSJF(epic)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No epics available for prioritization
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-sm text-muted-foreground px-1 py-2 border-t">
          <strong>Formula:</strong> WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Apply Rankings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
