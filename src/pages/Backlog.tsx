import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ListScreenToolbar } from '@/components/shared/ListScreenToolbar';
import { RightDetailsPanel } from '@/components/shared/RightDetailsPanel';

export default function Backlog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<any>(null);

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: features } = useQuery({
    queryKey: ['features', selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const { data: teamStories } = await supabase
        .from('stories')
        .select('feature_id')
        .eq('team_id', selectedTeamId);
      
      if (!teamStories) return [];
      const featureIds = [...new Set(teamStories.map(s => s.feature_id))];
      
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .in('id', featureIds);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTeamId,
  });

  const { data: stories } = useQuery({
    queryKey: ['backlog-stories', selectedTeamId, selectedFeatureId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('stories')
        .select('*, features(name)')
        .is('sprint_id', null);

      if (selectedTeamId) query = query.eq('team_id', selectedTeamId);
      if (selectedFeatureId) query = query.eq('feature_id', selectedFeatureId);
      if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);

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

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Product Backlog</h1>
        <p className="text-muted-foreground">Unassigned stories ready for sprint planning</p>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search stories..."
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
        <Select value={selectedFeatureId} onValueChange={setSelectedFeatureId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Features" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Features</SelectItem>
            {features?.map((feature) => (
              <SelectItem key={feature.id} value={feature.id}>
                {feature.name}
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
            <TableHead>Story</TableHead>
            <TableHead>Feature</TableHead>
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
              <TableCell>{story.estimate_points || '-'}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">{story.status}</Badge>
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
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedStory.description || 'No description'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Acceptance Criteria</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedStory.acceptance_criteria || 'No criteria defined'}
                  </p>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
