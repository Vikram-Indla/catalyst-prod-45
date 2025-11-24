import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ListScreenToolbar } from '@/components/shared/ListScreenToolbar';
import { SprintDialog } from '@/components/forms/SprintDialog';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';

export default function Sprints() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<any>(null);

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: sprints } = useQuery({
    queryKey: ['sprints-list', selectedTeamId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('iterations')
        .select('*, program_increments(name)');

      if (selectedTeamId) query = query.eq('team_id', selectedTeamId);
      if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);

      const { data, error } = await query.order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleRowSelect = (sprintId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(sprintId)) {
      newSelected.delete(sprintId);
    } else {
      newSelected.add(sprintId);
    }
    setSelectedRows(newSelected);
  };

  const getSprintStatus = (sprint: any) => {
    const today = new Date();
    const start = sprint.start_date ? new Date(sprint.start_date) : null;
    const end = sprint.end_date ? new Date(sprint.end_date) : null;

    if (!start || !end) return 'planned';
    if (today < start) return 'planned';
    if (today > end) return 'completed';
    return 'active';
  };

  const handleCreate = () => {
    setEditingSprint(null);
    setDialogOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sprints</h1>
          <p className="text-muted-foreground">Manage team sprints and iterations</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Sprint
        </Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search sprints..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Teams</SelectItem>
            {teams?.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ListScreenToolbar selectedCount={selectedRows.size} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox />
            </TableHead>
            <TableHead>Sprint</TableHead>
            <TableHead>PI</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sprints?.map((sprint) => {
            const status = getSprintStatus(sprint);
            return (
              <TableRow key={sprint.id}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedRows.has(sprint.id)}
                    onCheckedChange={() => handleRowSelect(sprint.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{sprint.name}</TableCell>
                <TableCell>{sprint.program_increments?.name}</TableCell>
                <TableCell>
                  {sprint.start_date ? format(new Date(sprint.start_date), 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell>
                  {sprint.end_date ? format(new Date(sprint.end_date), 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={status === 'active' ? 'default' : 'outline'}
                    className="capitalize"
                  >
                    {status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <SprintDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sprint={editingSprint}
      />
    </div>
  );
}
