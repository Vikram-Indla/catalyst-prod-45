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
import { RightDetailsPanel } from '@/components/shared/RightDetailsPanel';
import { StoryDialog } from '@/components/forms/StoryDialog';
import { Plus, Edit } from 'lucide-react';

export default function Stories() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todo' | 'in_progress' | 'done' | ''>('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<any>(null);

  const { data: stories } = useQuery({
    queryKey: ['all-stories', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('stories')
        .select('*, features(name), iterations(name)');

      if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
      if (statusFilter) query = query.eq('status', statusFilter);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleRowClick = (story: any) => {
    setSelectedStory(story);
    setDetailsOpen(true);
  };

  const handleRowSelect = (storyId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(storyId)) {
      newSelected.delete(storyId);
    } else {
      newSelected.add(storyId);
    }
    setSelectedRows(newSelected);
  };

  const handleCreate = () => {
    setEditingStory(null);
    setDialogOpen(true);
  };

  const handleEdit = (story: any) => {
    setEditingStory(story);
    setDialogOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stories</h1>
          <p className="text-muted-foreground">All user stories across teams</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Story
        </Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search stories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
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
            <TableHead>Story</TableHead>
            <TableHead>Feature</TableHead>
            <TableHead>Sprint</TableHead>
            <TableHead>Points</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stories?.map((story) => (
            <TableRow
              key={story.id}
              className="cursor-pointer"
              onClick={() => handleRowClick(story)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedRows.has(story.id)}
                  onCheckedChange={() => handleRowSelect(story.id)}
                />
              </TableCell>
              <TableCell className="font-medium">{story.name}</TableCell>
              <TableCell>{story.features?.name}</TableCell>
              <TableCell>{story.iterations?.name || 'Backlog'}</TableCell>
              <TableCell>{story.estimate_points || '-'}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {story.status?.replace('_', ' ')}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <RightDetailsPanel
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={selectedStory?.name || ''}
        tabs={[
          {
            id: 'details',
            label: 'Details',
            content: selectedStory && (
              <div className="space-y-4">
                <Button onClick={() => handleEdit(selectedStory)} className="w-full mb-4">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Story
                </Button>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedStory.description || 'No description'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Acceptance Criteria</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedStory.acceptance_criteria || 'No criteria'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Estimate</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedStory.estimate_points || 'Not estimated'} points
                  </p>
                </div>
              </div>
            ),
          },
        ]}
      />

      <StoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        story={editingStory}
      />
    </div>
  );
}
