import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface FeatureHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  piId: string;
}

export function FeatureHistoryDialog({ open, onOpenChange, programId, piId }: FeatureHistoryDialogProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchText, setSearchText] = useState('');

  const { data: historyRecords, refetch } = useQuery({
    queryKey: ['feature-scheduling-history', programId, piId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('feature_scheduling_history')
        .select(`
          *,
          feature:features(id, display_id, name),
          start_sprint:iterations!feature_scheduling_history_start_sprint_id_fkey(id, name),
          end_sprint:iterations!feature_scheduling_history_end_sprint_id_fkey(id, name),
          user:profiles(full_name, email)
        `)
        .order('changed_at', { ascending: false });

      if (startDate) {
        query = query.gte('changed_at', startDate);
      }
      if (endDate) {
        query = query.lte('changed_at', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!programId && !!piId,
  });

  const filteredRecords = historyRecords?.filter(record => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      record.feature?.name?.toLowerCase().includes(searchLower) ||
      record.feature?.display_id?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal text-muted-foreground">Program Board Feature History</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
            <div className="space-y-2">
              <Label>Date Range:</Label>
              <div className="flex gap-2 items-center">
                <Input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <Input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Search Features:</Label>
              <Input 
                placeholder="Search by ID or name..." 
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="text-sm"
              />
            </div>
            
            <div className="col-span-2 flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSearchText('');
                }}
                size="sm"
              >
                Reset
              </Button>
              <Button onClick={() => refetch()} size="sm">Refresh</Button>
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            {filteredRecords && filteredRecords.length > 0 ? (
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Feature ID</th>
                    <th className="text-left p-3 text-sm font-medium">Feature Name</th>
                    <th className="text-left p-3 text-sm font-medium">Changed By</th>
                    <th className="text-left p-3 text-sm font-medium">Start Sprint</th>
                    <th className="text-left p-3 text-sm font-medium">End Sprint</th>
                    <th className="text-left p-3 text-sm font-medium">Changed At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="border-t hover:bg-muted/50">
                      <td className="p-3 text-sm text-primary font-medium">
                        {record.feature?.display_id || record.feature_id?.slice(0, 8)}
                      </td>
                      <td className="p-3 text-sm text-primary max-w-xs truncate">
                        {record.feature?.name || 'Unknown'}
                      </td>
                      <td className="p-3 text-sm">
                        {record.user?.full_name || record.user?.email || 'System'}
                      </td>
                      <td className="p-3 text-sm text-primary">
                        {record.start_sprint?.name || '-'}
                      </td>
                      <td className="p-3 text-sm text-primary">
                        {record.end_sprint?.name || '-'}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {record.changed_at ? format(new Date(record.changed_at), 'MMM d, yyyy h:mm a') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <p className="text-sm">No history records found</p>
                <p className="text-xs mt-1">Adjust filters and click Refresh to search</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
