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
import { SubtaskDialog } from '@/components/forms/SubtaskDialog';
import { Plus } from 'lucide-react';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

export default function Subtasks() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todo' | 'in_progress' | 'done' | ''>('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<any>(null);

  const { data: subtasks } = useQuery({
    queryKey: ['subtasks', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('subtasks')
        .select('*, stories(name, features(name))');

      if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
      if (statusFilter) query = query.eq('status', statusFilter);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleRowSelect = (subtaskId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(subtaskId)) {
      newSelected.delete(subtaskId);
    } else {
      newSelected.add(subtaskId);
    }
    setSelectedRows(newSelected);
  };

  const handleCreate = () => {
    setEditingSubtask(null);
    setDialogOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sub-tasks</h1>
          <p className="text-muted-foreground">Technical tasks and work items</p>
        </div>
        <PermissionGuard requiredRole="user" showMessage={false}>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Subtask
          </Button>
        </PermissionGuard>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search sub-tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter || undefined} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
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
            <TableHead>Sub-task</TableHead>
            <TableHead>Story</TableHead>
            <TableHead>Feature</TableHead>
            <TableHead>Estimate (hrs)</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subtasks?.map((subtask) => (
            <TableRow key={subtask.id}>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedRows.has(subtask.id)}
                  onCheckedChange={() => handleRowSelect(subtask.id)}
                />
              </TableCell>
              <TableCell className="font-medium">{subtask.name}</TableCell>
              <TableCell>{subtask.stories?.name}</TableCell>
              <TableCell>{subtask.stories?.features?.name}</TableCell>
              <TableCell>{subtask.original_estimate_hours || '-'}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {subtask.status?.replace('_', ' ')}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <SubtaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subtask={editingSubtask}
      />
    </div>
  );
}
