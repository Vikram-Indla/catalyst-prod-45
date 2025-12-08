// Story Detail Panel - Sheet-based comprehensive view with tabs
// Citation: Catalyst_Stories_PRD_v2.pdf
// Pattern: Matches Epic/Feature Sheet architecture
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Edit2, Save, Calendar, User, Flag, MoreVertical, Bell, MessageSquare, History, Link as LinkIcon, Copy, ArrowDown, Trash2 } from 'lucide-react';
import { WorkItemVersionsSection } from '@/components/work-items/WorkItemVersionsSection';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { STORY_STATUS_LABELS } from '@/types/story.types';
import type { StoryWithRelations } from '@/types/story.types';
import { StoryDiscussions } from './StoryDiscussions';
import { StoryActivityLog } from './StoryActivityLog';
import { StoryLinks } from './StoryLinks';
import { SubtasksList } from './SubtasksList';
import { StoryAttachments } from './StoryAttachments';


interface StoryDetailPanelProps {
  story: StoryWithRelations;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function StoryDetailPanel({ story, open, onClose, onUpdate }: StoryDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedStory, setEditedStory] = useState(story);
  const [activeTab, setActiveTab] = useState('details');
  const queryClient = useQueryClient();

  const { data: features } = useQuery({
    queryKey: ['features-for-story'],
    queryFn: async () => {
      const { data, error } = await supabase.from('features').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  const { data: teams } = useQuery({
    queryKey: ['teams-for-story'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  const { data: iterations } = useQuery({
    queryKey: ['iterations-for-story'],
    queryFn: async () => {
      const { data, error } = await supabase.from('iterations').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('stories')
        .update(updates)
        .eq('id', story.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Story updated');
      queryClient.invalidateQueries({ queryKey: ['all-stories'] });
      setIsEditing(false);
      onUpdate?.();
    },
    onError: () => {
      toast.error('Failed to update story');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: editedStory.name,
      description: editedStory.description,
      acceptance_criteria: editedStory.acceptance_criteria,
      status: editedStory.status,
      feature_id: editedStory.feature_id,
      team_id: editedStory.team_id,
      sprint_id: editedStory.sprint_id,
      estimate_points: editedStory.estimate_points,
      points_loe: editedStory.points_loe,
    });
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="executive-drawer w-full sm:w-[600px] md:w-[700px] lg:w-[800px] sm:max-w-[90vw] p-0 flex flex-col overflow-hidden bg-white">
        <SheetHeader className="executive-drawer-header flex-row items-center justify-between space-y-0 shrink-0 bg-white px-3 md:px-4 h-10 border-b border-neutral-200">
          <div className="flex-1 pr-2 min-w-0 flex items-center gap-2">
            <SheetTitle className="executive-drawer-title truncate text-base font-semibold">{story.name}</SheetTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize text-xs">
                {story.status ? STORY_STATUS_LABELS[story.status] : 'To Do'}
              </Badge>
              {story.estimate_points && (
                <Badge variant="secondary" className="bg-brand-gold/10 text-brand-gold border-brand-gold/20 text-xs">
                  {story.estimate_points} pts
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-[var(--s2)] flex-shrink-0">
            {isEditing && (
              <>
                <Button size="sm" onClick={handleSave} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-[#1a1a1a] hover:bg-[rgba(198,156,109,0.08)]">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Story
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Subscribe to story')}>
                  <Bell className="h-4 w-4 mr-2" />
                  Subscribe
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('discussions')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Discussions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('history')}>
                  <History className="h-4 w-4 mr-2" />
                  Audit Log
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('links')}>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Links
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast.info('Copy story')}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Move story')}>
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Move
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast.info('Delete story')}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="executive-drawer-tabs overflow-x-auto flex-shrink-0">
            <TabsList className="w-full justify-start rounded-none flex-nowrap bg-transparent">
              <TabsTrigger value="details" className="executive-drawer-tab">Details</TabsTrigger>
              <TabsTrigger value="children" className="executive-drawer-tab">Children</TabsTrigger>
              
              <TabsTrigger value="links" className="executive-drawer-tab">Links</TabsTrigger>
              <TabsTrigger value="attachments" className="executive-drawer-tab">Attachments</TabsTrigger>
              <TabsTrigger value="discussions" className="executive-drawer-tab">Discussions</TabsTrigger>
              <TabsTrigger value="history" className="executive-drawer-tab">History</TabsTrigger>
            </TabsList>
          </div>

          <div className="executive-drawer-content flex-1 overflow-y-auto">

            <TabsContent value="details" className="m-0 p-[var(--s4)] sm:p-[var(--s6)] focus-visible:outline-none space-y-[var(--s4)]">
              {/* Name */}
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Flag className="h-4 w-4 text-brand-gold" />
                  Story Name
                </label>
                {isEditing ? (
                  <Input
                    value={editedStory.name}
                    onChange={(e) => setEditedStory({ ...editedStory, name: e.target.value })}
                    className="focus-visible:ring-brand-gold"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{story.name}</p>
                )}
              </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              {isEditing ? (
                <Textarea
                  value={editedStory.description || ''}
                  onChange={(e) => setEditedStory({ ...editedStory, description: e.target.value })}
                  rows={4}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{story.description || 'No description'}</p>
              )}
            </div>

            {/* Acceptance Criteria */}
            <div>
              <label className="text-sm font-medium mb-1 block">Acceptance Criteria</label>
              {isEditing ? (
                <Textarea
                  value={editedStory.acceptance_criteria || ''}
                  onChange={(e) => setEditedStory({ ...editedStory, acceptance_criteria: e.target.value })}
                  rows={4}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{story.acceptance_criteria || 'No criteria'}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              {isEditing ? (
                <Select
                  value={editedStory.status || 'todo'}
                  onValueChange={(value: any) => setEditedStory({ ...editedStory, status: value })}
                >
                  <SelectTrigger className="focus:ring-brand-gold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="capitalize">
                  {story.status ? STORY_STATUS_LABELS[story.status] : 'To Do'}
                </Badge>
              )}
            </div>

            <div className="border-t pt-[var(--s4)] mt-[var(--s4)]">
              <h3 className="text-sm font-semibold mb-[var(--s4)] text-brand-gold">Hierarchy & Assignment</h3>
              <div className="space-y-[var(--s4)]">

            {/* Feature */}
            <div>
              <label className="text-sm font-medium mb-2 block">Feature</label>
              {isEditing ? (
                <Select
                  value={editedStory.feature_id}
                  onValueChange={(value) => setEditedStory({ ...editedStory, feature_id: value })}
                >
                  <SelectTrigger className="focus:ring-brand-gold">
                    <SelectValue placeholder="Select feature" />
                  </SelectTrigger>
                  <SelectContent>
                    {features?.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">{story.features?.name || 'No feature'}</p>
              )}
            </div>

            {/* Team */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-brand-gold" />
                Team
              </label>
              {isEditing ? (
                <Select
                  value={editedStory.team_id || undefined}
                  onValueChange={(value) => setEditedStory({ ...editedStory, team_id: value })}
                >
                  <SelectTrigger className="focus:ring-brand-gold">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">{story.teams?.name || 'No team'}</p>
              )}
            </div>

            {/* Sprint */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-brand-gold" />
                Sprint
              </label>
              {isEditing ? (
                <Select
                  value={editedStory.sprint_id || undefined}
                  onValueChange={(value) => setEditedStory({ ...editedStory, sprint_id: value })}
                >
                  <SelectTrigger className="focus:ring-brand-gold">
                    <SelectValue placeholder="Select sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    {iterations?.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">{story.iterations?.name || 'Backlog'}</p>
              )}
            </div>
              </div>
            </div>

            <div className="border-t pt-[var(--s4)] mt-[var(--s4)]">
              <h3 className="text-sm font-semibold mb-[var(--s4)] text-brand-gold">Estimation</h3>
              <div className="space-y-[var(--s4)]">

            {/* Estimate Points */}
            <div>
              <label className="text-sm font-medium mb-2 block">Story Points (Estimate)</label>
              {isEditing ? (
                <Select
                  value={editedStory.estimate_points?.toString() || 'undefined'}
                  onValueChange={(value) => setEditedStory({ 
                    ...editedStory, 
                    estimate_points: value === 'undefined' ? null : parseInt(value) 
                  })}
                >
                  <SelectTrigger className="focus:ring-brand-gold">
                    <SelectValue placeholder="Select points" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="undefined">Not estimated</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="13">13</SelectItem>
                    <SelectItem value="21">21</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">{story.estimate_points || 'Not estimated'}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Fibonacci sequence: 1, 2, 3, 5, 8, 13, 21</p>
            </div>

            {/* LOE Points */}
            <div>
              <label className="text-sm font-medium mb-2 block">LOE Points (Level of Effort)</label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedStory.points_loe || ''}
                  onChange={(e) => setEditedStory({ ...editedStory, points_loe: parseInt(e.target.value) || null })}
                  className="focus-visible:ring-brand-gold"
                  placeholder="Enter LOE"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{story.points_loe || 'Not set'}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Level of Effort for technical complexity</p>
            </div>
              </div>
            </div>

            {/* Fix/Affects Versions Section */}
            <Card className="border border-border/60 rounded-lg">
              <CardContent className="p-5">
                <WorkItemVersionsSection 
                  workItemId={story.id} 
                  workItemType="story" 
                />
              </CardContent>
            </Card>
          </TabsContent>

            <TabsContent value="children" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <SubtasksList storyId={story.id} />
            </TabsContent>


            <TabsContent value="links" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <StoryLinks storyId={story.id} />
            </TabsContent>

            <TabsContent value="attachments" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <StoryAttachments storyId={story.id} />
            </TabsContent>

            <TabsContent value="discussions" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <StoryDiscussions storyId={story.id} />
            </TabsContent>

            <TabsContent value="history" className="m-0 p-[var(--s3)] sm:p-[var(--s4)] md:p-[var(--s6)] focus-visible:outline-none">
              <StoryActivityLog storyId={story.id} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
