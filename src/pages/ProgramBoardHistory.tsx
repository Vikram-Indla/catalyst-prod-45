import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';

export default function ProgramBoardHistory() {
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedPIs, setSelectedPIs] = useState('');
  const [selectedEpic, setSelectedEpic] = useState('');
  const [textTags, setTextTags] = useState('');
  const [historyData, setHistoryData] = useState<any[]>([]);

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: epics } = useQuery({
    queryKey: ['epics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('epics').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleRunReport = async () => {
    // TODO: Implement actual history query logic
    const { data, error } = await supabase
      .from('feature_scheduling_history')
      .select('*, features(id, display_id, name)')
      .order('changed_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setHistoryData(data);
    }
  };

  const handleReset = () => {
    setSelectedPrograms([]);
    setFromDate('');
    setToDate('');
    setSelectedPIs('');
    setSelectedEpic('');
    setTextTags('');
    setHistoryData([]);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Program Board Feature History</h1>

        <Card className="p-6">
          <div className="space-y-5">
            {/* Program selector */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm text-foreground">Program:</label>
              <div className="flex-1 flex gap-2">
                <Select value="all" onValueChange={() => {}}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select All</SelectItem>
                    {programs?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="h-10 w-10">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Date range */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm text-foreground">Dates:</label>
              <div className="flex-1 flex items-center gap-3">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Program Increments */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm text-foreground">Program Increments:</label>
              <Input
                placeholder="Enter PI names..."
                value={selectedPIs}
                onChange={(e) => setSelectedPIs(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Epic selector */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm text-foreground">Epic:</label>
              <Select value={selectedEpic} onValueChange={setSelectedEpic}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Select All</SelectItem>
                  {epics?.map((epic) => (
                    <SelectItem key={epic.id} value={epic.id}>{epic.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Text/Tags */}
            <div className="flex items-center gap-4">
              <label className="w-40 text-sm text-foreground">Text/Tags:</label>
              <Input
                placeholder="Search by text or tags..."
                value={textTags}
                onChange={(e) => setTextTags(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
              <Button onClick={handleRunReport}>
                Run Report
              </Button>
            </div>
          </div>
        </Card>

        {/* Results Table */}
        {historyData.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Updated By</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData.map((record, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      {(record.features as any)?.display_id || (record.features as any)?.id}
                    </TableCell>
                    <TableCell className="text-primary hover:underline cursor-pointer">
                      {(record.features as any)?.name}
                    </TableCell>
                    <TableCell className="text-sm">Steve Elliott</TableCell>
                    <TableCell className="text-sm text-muted-foreground">Sprint 25</TableCell>
                    <TableCell className="text-sm text-muted-foreground">Sprint 25</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(record.changed_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
