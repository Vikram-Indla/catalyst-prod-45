import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { ScopeSelector } from '@/components/shared/ScopeSelector';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ListScreenToolbar } from '@/components/shared/ListScreenToolbar';
import { RightDetailsPanel } from '@/components/shared/RightDetailsPanel';
import { format } from 'date-fns';

export default function ProgramIncrements() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedPI, setSelectedPI] = useState<any>(null);

  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments', selectedPortfolioId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('program_increments')
        .select('*, portfolios(name)');

      if (selectedPortfolioId) {
        query = query.eq('portfolio_id', selectedPortfolioId);
      }

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query.order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleRowClick = (pi: any) => {
    setSelectedPI(pi);
    setDetailsOpen(true);
  };

  const handleRowSelect = (piId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(piId)) {
      newSelected.delete(piId);
    } else {
      newSelected.add(piId);
    }
    setSelectedRows(newSelected);
  };

  const getPIStatus = (pi: any) => {
    const today = new Date();
    const start = new Date(pi.start_date);
    const end = new Date(pi.end_date);

    if (pi.state === 'closed') return { label: 'Closed', variant: 'outline' as const };
    if (today < start) return { label: 'Planned', variant: 'secondary' as const };
    if (today > end) return { label: 'Ended', variant: 'outline' as const };
    return { label: 'Active', variant: 'default' as const };
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Program Increments</h1>
        <p className="text-muted-foreground">Manage PI planning and execution cycles</p>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search PIs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <ScopeSelector value={selectedPortfolioId} onChange={setSelectedPortfolioId} />
      </div>

      <ListScreenToolbar selectedCount={selectedRows.size} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox />
            </TableHead>
            <TableHead>PI Name</TableHead>
            <TableHead>Portfolio</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {programIncrements?.map((pi) => {
            const status = getPIStatus(pi);
            return (
              <TableRow
                key={pi.id}
                className="cursor-pointer"
                onClick={() => handleRowClick(pi)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedRows.has(pi.id)}
                    onCheckedChange={() => handleRowSelect(pi.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{pi.name}</TableCell>
                <TableCell>{pi.portfolios?.name}</TableCell>
                <TableCell>{format(new Date(pi.start_date), 'MMM d, yyyy')}</TableCell>
                <TableCell>{format(new Date(pi.end_date), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {pi.state}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>
                    {status.label}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <RightDetailsPanel
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={selectedPI?.name || ''}
        tabs={[
          {
            id: 'details',
            label: 'Details',
            content: selectedPI && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Portfolio</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedPI.portfolios?.name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Duration</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(selectedPI.start_date), 'MMMM d, yyyy')} - {format(new Date(selectedPI.end_date), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">State</label>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {selectedPI.state}
                  </Badge>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
