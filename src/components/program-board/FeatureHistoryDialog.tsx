import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useState } from 'react';

interface FeatureHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeatureHistoryDialog({ open, onOpenChange }: FeatureHistoryDialogProps) {
  const [showFilters, setShowFilters] = useState(true);
  const [results, setResults] = useState<any[]>([]);

  const handleRunReport = () => {
    // Mock results data
    setResults([
      { id: '136', title: 'G12: Hadoop Backup & Restore (Platform Le...', updatedBy: 'Steve Elliott', start: 'Sprint 25', end: 'Sprint 25', date: '8/3/2017 11:22:56 AM' },
      { id: '136', title: 'G12: Hadoop Backup & Restore (Platform Le...', updatedBy: 'Steve Elliott', start: 'Sprint 25', end: 'Sprint 25', date: '8/3/2017 11:27:16 AM' },
      { id: '1247', title: 'G12: Hadoop -Scorecard integration via new Ada...', updatedBy: 'Steve Elliott', start: 'HIP5', end: 'HIP5', date: '8/13/2017 10:30:38 AM' },
      { id: '1336', title: 'G12: BACKLOG Cont Training - Support 2 Modes of...', updatedBy: 'Steve Elliott', start: '', end: '', date: '7/23/2017 5:57:26 AM' },
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal text-muted-foreground">Program Board Feature History</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {showFilters && (
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label>Program:</Label>
                <div className="flex gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue placeholder="Select All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Select All</SelectItem>
                      <SelectItem value="online">Online Experience</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="default" className="flex-shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Dates:</Label>
                <div className="flex gap-2">
                  <Input type="date" />
                  <span className="self-center text-sm text-muted-foreground">to</span>
                  <Input type="date" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Program Increments:</Label>
                <Input placeholder="Enter PI..." />
              </div>
              
              <div className="space-y-2">
                <Label>Epic:</Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="Select All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 col-span-2">
                <Label>Text/Tags:</Label>
                <Input placeholder="Search by text or tags..." />
              </div>
              
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setResults([])}>Reset</Button>
                <Button onClick={handleRunReport}>Run Report</Button>
              </div>
            </div>
          )}
          
          {results.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">ID</th>
                    <th className="text-left p-3 text-sm font-medium">Title</th>
                    <th className="text-left p-3 text-sm font-medium">Updated By</th>
                    <th className="text-left p-3 text-sm font-medium">Start</th>
                    <th className="text-left p-3 text-sm font-medium">End</th>
                    <th className="text-left p-3 text-sm font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={idx} className="border-t hover:bg-muted/50">
                      <td className="p-3 text-sm text-primary font-medium">{result.id}</td>
                      <td className="p-3 text-sm text-primary">{result.title}</td>
                      <td className="p-3 text-sm">{result.updatedBy}</td>
                      <td className="p-3 text-sm text-primary">{result.start}</td>
                      <td className="p-3 text-sm text-primary">{result.end}</td>
                      <td className="p-3 text-sm">{result.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
