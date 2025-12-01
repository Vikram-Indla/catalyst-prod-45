import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Download, Settings2 } from 'lucide-react';
import { StoriesGrid } from '@/components/stories/StoriesGrid';
import { StoryDetailPanel } from '@/components/stories/StoryDetailPanel';
import { CreateEditStoryPanel } from '@/components/stories/CreateEditStoryPanel';
import { useToast } from '@/hooks/use-toast';

export function StoriesPage() {
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterState, setFilterState] = useState<string>('all');
  const { toast } = useToast();

  const { data: stories = [], isLoading, refetch } = useQuery({
    queryKey: ['stories', filterState],
    queryFn: async () => {
      let query = supabase
        .from('stories')
        .select(`
          *,
          features (id, name),
          teams (id, name)
        `)
        .is('deleted_at', null);

      if (filterState !== 'all') {
        query = query.eq('state', filterState);
      }

      const { data, error } = await query.order('rank_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const handleExport = () => {
    const csv = [
      ['ID', 'Key', 'Name', 'State', 'Story Points', 'Feature', 'Team'].join(','),
      ...stories.map(s => [
        s.id,
        s.story_key || '',
        `"${s.name}"`,
        s.state || '',
        s.story_points || 0,
        s.features?.name || '',
        s.teams?.name || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stories-${new Date().toISOString()}.csv`;
    a.click();
    
    toast({ title: 'Export complete', description: 'Stories exported to CSV' });
  };

  const selectedStory = stories.find(s => s.id === selectedStoryId);

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground truncate">Stories</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage user stories across features and teams
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setFilterState(filterState === 'all' ? 'backlog' : 'all')}>
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{filterState === 'all' ? 'All' : 'Filtered'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button variant="outline" size="sm" className="hidden md:flex">
              <Settings2 className="h-4 w-4 mr-2" />
              Columns
            </Button>
            <Button size="sm" onClick={() => setIsCreateOpen(true)} className="bg-brand-gold hover:bg-brand-gold-hover">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Story</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <StoriesGrid
              stories={stories}
              isLoading={isLoading}
              onStoryClick={(storyId) => setSelectedStoryId(storyId)}
              onRefetch={refetch}
            />
          </CardContent>
        </Card>
      </div>

      {/* Detail Panel */}
      {selectedStory && (
        <StoryDetailPanel
          story={selectedStory}
          open={!!selectedStoryId}
          onClose={() => setSelectedStoryId(null)}
          onUpdate={refetch}
        />
      )}

      {/* Create Panel */}
      <CreateEditStoryPanel
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setIsCreateOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
