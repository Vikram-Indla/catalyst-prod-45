/**
 * FeatureChildStories — Child stories table with real CRUD
 * Now includes ASSIGNEE column and uses StoryDetailPanel for row clicks.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link2, Plus, AlertTriangle, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StoryDetailPanel } from '@/components/stories/StoryDetailPanel';
import styles from '../FeatureViewPage.module.css';

interface Story {
  id: string;
  display_id?: string | null;
  name: string;
  title?: string;
  status: string | null;
  state: string | null;
  priority: string | null;
  assignee_id: string | null;
  assignee?: { id: string; full_name: string } | null;
}

interface FeatureChildStoriesProps {
  stories: Story[];
  featureId: string;
  projectId: string;
  totalCount: number;
  onUpdated?: () => void;
}

function getStatusClass(status: string | null, state: string | null): string {
  const s = (state || status || '').toLowerCase();
  if (['done', 'accepted', 'closed', 'deployed'].includes(s)) {
    return styles.storyStatusDone;
  }
  if (['in_progress', 'in-progress', 'implementing', 'testing', 'review'].includes(s)) {
    return styles.storyStatusInProgress;
  }
  return styles.storyStatusTodo;
}

function getStatusLabel(status: string | null, state: string | null): string {
  const s = (state || status || '').toLowerCase();
  if (['done', 'accepted', 'closed', 'deployed'].includes(s)) {
    return 'DONE';
  }
  if (['in_progress', 'in-progress', 'implementing', 'testing', 'review'].includes(s)) {
    return 'IN PROGRESS';
  }
  return 'TO DO';
}

function getInitials(name: string | null): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function FeatureChildStories({ stories, featureId, projectId, totalCount, onUpdated }: FeatureChildStoriesProps) {
  const queryClient = useQueryClient();
  const [addStoryOpen, setAddStoryOpen] = useState(false);
  const [linkExistingOpen, setLinkExistingOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  
  // Add story form state
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStoryDescription, setNewStoryDescription] = useState('');
  
  // Link existing state
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);

  // Fetch stories with assignee data
  const { data: storiesWithAssignees = [] } = useQuery({
    queryKey: ['feature-stories-with-assignees', featureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          name,
          title,
          status,
          state,
          priority,
          assignee_id,
          profiles:assignee_id(id, full_name)
        `)
        .eq('feature_id', featureId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map((s: any) => ({
        ...s,
        display_id: `STORY-${s.id.slice(0, 4).toUpperCase()}`,
        assignee: s.profiles,
      }));
    },
    enabled: !!featureId,
  });

  // Use fetched stories with assignees, or fall back to prop stories
  const displayStories = storiesWithAssignees.length > 0 ? storiesWithAssignees : stories;

  // Fetch unlinked stories in project for linking
  const { data: unlinkableStories = [], isLoading: loadingUnlinked } = useQuery({
    queryKey: ['unlinked-stories', projectId, featureId],
    queryFn: async () => {
      // Get all features in this project
      const { data: allFeatures } = await supabase
        .from('features')
        .select('id')
        .eq('project_id', projectId)
        .is('deleted_at', null);
      
      if (allFeatures) {
        const featureIds = allFeatures.map(f => f.id);
        const { data: storiesData } = await supabase
          .from('stories')
          .select('id, name, title, feature_id')
          .in('feature_id', featureIds)
          .neq('feature_id', featureId)
          .is('deleted_at', null);
        
        return storiesData || [];
      }
      return [];
    },
    enabled: linkExistingOpen,
  });

  // Create story mutation
  const createStory = useMutation({
    mutationFn: async (storyData: { title: string; description?: string }) => {
      const { data, error } = await supabase
        .from('stories')
        .insert({
          title: storyData.title,
          name: storyData.title,
          description: storyData.description || null,
          feature_id: featureId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-stories', featureId] });
      queryClient.invalidateQueries({ queryKey: ['feature-stories-with-assignees', featureId] });
      queryClient.invalidateQueries({ queryKey: ['feature-view', featureId] });
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      toast.success('Story created');
      resetAddForm();
      setAddStoryOpen(false);
      onUpdated?.();
    },
    onError: (error: any) => {
      toast.error('Failed to create story', { description: error.message });
    },
  });

  // Link stories mutation
  const linkStories = useMutation({
    mutationFn: async (storyIds: string[]) => {
      const { error } = await supabase
        .from('stories')
        .update({ feature_id: featureId, updated_at: new Date().toISOString() })
        .in('id', storyIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-stories', featureId] });
      queryClient.invalidateQueries({ queryKey: ['feature-stories-with-assignees', featureId] });
      queryClient.invalidateQueries({ queryKey: ['feature-view', featureId] });
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-stories'] });
      toast.success('Stories linked');
      setSelectedStoryIds([]);
      setLinkExistingOpen(false);
      onUpdated?.();
    },
    onError: (error: any) => {
      toast.error('Failed to link stories', { description: error.message });
    },
  });

  const resetAddForm = () => {
    setNewStoryTitle('');
    setNewStoryDescription('');
  };

  const handleAddStory = () => {
    if (!newStoryTitle.trim()) return;
    createStory.mutate({
      title: newStoryTitle.trim(),
      description: newStoryDescription.trim() || undefined,
    });
  };

  const handleLinkSelected = () => {
    if (selectedStoryIds.length === 0) return;
    linkStories.mutate(selectedStoryIds);
  };

  const toggleStorySelection = (storyId: string) => {
    setSelectedStoryIds(prev => 
      prev.includes(storyId) 
        ? prev.filter(id => id !== storyId)
        : [...prev, storyId]
    );
  };

  const handleRowClick = (story: Story) => {
    setSelectedStory(story);
  };

  const handleCloseStoryPanel = () => {
    setSelectedStory(null);
    // Refresh stories in case of updates
    queryClient.invalidateQueries({ queryKey: ['feature-stories-with-assignees', featureId] });
  };
  
  return (
    <>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>
            Child Stories
            <span className={styles.panelCount}>{totalCount || displayStories.length}</span>
          </h2>
          <div className={styles.panelActions}>
            <button className={styles.panelAction} onClick={() => setLinkExistingOpen(true)}>
              <Link2 size={14} />
              Link existing
            </button>
            <button className={styles.panelAction} onClick={() => setAddStoryOpen(true)}>
              <Plus size={14} />
              Add story
            </button>
          </div>
        </div>
        <div className={styles.panelBody}>
          {displayStories.length === 0 ? (
            <div className={styles.panelBodyPadded}>
              <span className={styles.noneValue}>No stories linked to this feature.</span>
            </div>
          ) : (
            <table className={styles.storiesTable}>
              <thead className={styles.storiesTableHead}>
                <tr>
                  <th>ID</th>
                  <th>SUMMARY</th>
                  <th>PRIORITY</th>
                  <th>ASSIGNEE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody className={styles.storiesTableBody}>
                {displayStories.map(story => (
                  <tr 
                    key={story.id} 
                    onClick={() => handleRowClick(story)}
                    className={styles.storyRow}
                  >
                    <td>
                      <span className={styles.storyId}>
                        <span className={styles.storyIcon}>S</span>
                        {story.display_id || `STORY-${story.id.slice(0, 4).toUpperCase()}`}
                      </span>
                    </td>
                    <td>{story.name || story.title}</td>
                    <td>
                      {story.priority?.toLowerCase() === 'high' ? (
                        <span className={styles.priorityHigh}>
                          <AlertTriangle size={12} />
                          High
                        </span>
                      ) : (
                        <span className={styles.priorityMedium}>
                          {story.priority || 'Medium'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className={styles.assigneeCell}>
                        {story.assignee ? (
                          <>
                            <div className={styles.avatar} style={{ width: 24, height: 24, fontSize: 10 }}>
                              {getInitials(story.assignee.full_name)}
                            </div>
                            <span>{story.assignee.full_name}</span>
                          </>
                        ) : (
                          <span className={styles.noneValue}>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.storyStatusPill} ${getStatusClass(story.status, story.state)}`}>
                        {getStatusLabel(story.status, story.state)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Story Detail Panel - existing component */}
      {selectedStory && (
        <StoryDetailPanel
          story={{
            id: selectedStory.id,
            name: selectedStory.name || selectedStory.title || '',
            status: (selectedStory.status || 'todo') as 'accepted' | 'blocked' | 'done' | 'in_progress' | 'todo',
            priority: selectedStory.priority,
            assignee_id: selectedStory.assignee_id,
          } as any}
          open={!!selectedStory}
          onClose={handleCloseStoryPanel}
        />
      )}

      {/* Add Story Dialog */}
      <Dialog open={addStoryOpen} onOpenChange={setAddStoryOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Story</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="story-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="story-title"
                value={newStoryTitle}
                onChange={(e) => setNewStoryTitle(e.target.value)}
                placeholder="Enter story title"
                disabled={createStory.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="story-description">Description</Label>
              <Textarea
                id="story-description"
                value={newStoryDescription}
                onChange={(e) => setNewStoryDescription(e.target.value)}
                placeholder="Enter story description (optional)"
                rows={3}
                disabled={createStory.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStoryOpen(false)} disabled={createStory.isPending}>
              Cancel
            </Button>
            <Button onClick={handleAddStory} disabled={!newStoryTitle.trim() || createStory.isPending}>
              {createStory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Story
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Existing Stories Dialog */}
      <Dialog open={linkExistingOpen} onOpenChange={setLinkExistingOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Link Existing Stories</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {loadingUnlinked ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : unlinkableStories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No unlinked stories available in this project.
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {unlinkableStories.map((story: any) => (
                    <div 
                      key={story.id}
                      className="flex items-center gap-3 p-3 rounded-md border hover:bg-accent/50 cursor-pointer"
                      onClick={() => toggleStorySelection(story.id)}
                    >
                      <Checkbox 
                        checked={selectedStoryIds.includes(story.id)}
                        onCheckedChange={() => toggleStorySelection(story.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {story.name || story.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkExistingOpen(false)} disabled={linkStories.isPending}>
              Cancel
            </Button>
            <Button 
              onClick={handleLinkSelected} 
              disabled={selectedStoryIds.length === 0 || linkStories.isPending}
            >
              {linkStories.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Link {selectedStoryIds.length > 0 ? `(${selectedStoryIds.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}