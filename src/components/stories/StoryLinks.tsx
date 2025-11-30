// Story Links - manage relationships to other stories (blocks, relates to, etc.)
// Citation: Catalyst_Stories_PRD_v2.pdf
// Database: story_links table with link_type, external_url, external_title
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Link as LinkIcon, Plus, X, ExternalLink, Trash2 } from 'lucide-react';

interface StoryLinksProps {
  storyId: string;
}

type LinkType = 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates' | 'duplicated_by';

const LINK_TYPE_LABELS: Record<LinkType, string> = {
  blocks: 'Blocks',
  blocked_by: 'Blocked By',
  relates_to: 'Relates To',
  duplicates: 'Duplicates',
  duplicated_by: 'Duplicated By',
};

const LINK_TYPE_COLORS: Record<LinkType, string> = {
  blocks: 'bg-red-500/10 text-red-700 border-red-500/20',
  blocked_by: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  relates_to: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  duplicates: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  duplicated_by: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
};

export function StoryLinks({ storyId }: StoryLinksProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [linkType, setLinkType] = useState<LinkType>('relates_to');
  const [linkedStoryId, setLinkedStoryId] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalTitle, setExternalTitle] = useState('');
  const queryClient = useQueryClient();

  // Fetch all stories for internal linking (excluding current story)
  const { data: allStories } = useQuery({
    queryKey: ['stories-for-linking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('id, name')
        .neq('id', storyId)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing links for this story
  const { data: links, refetch } = useQuery({
    queryKey: ['story-links', storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('story_links')
        .select(`
          *,
          to_story:to_story_id(id, name)
        `)
        .eq('from_story_id', storyId);
      
      if (error) throw error;
      return data;
    },
  });

  // Add internal story link
  const addInternalLinkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('story_links')
        .insert({
          from_story_id: storyId,
          to_story_id: linkedStoryId,
          link_type: linkType,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Story link added');
      refetch();
      setIsAdding(false);
      setLinkedStoryId('');
      setLinkType('relates_to');
    },
    onError: (error: any) => {
      toast.error('Failed to add link: ' + error.message);
    },
  });

  // Add external link
  const addExternalLinkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('story_links')
        .insert({
          from_story_id: storyId,
          to_story_id: null,
          link_type: 'relates_to',
          external_url: externalUrl,
          external_title: externalTitle,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('External link added');
      refetch();
      setIsAdding(false);
      setExternalUrl('');
      setExternalTitle('');
    },
    onError: (error: any) => {
      toast.error('Failed to add link: ' + error.message);
    },
  });

  // Delete link
  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('story_links')
        .delete()
        .eq('id', linkId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Link removed');
      refetch();
    },
    onError: (error: any) => {
      toast.error('Failed to remove link: ' + error.message);
    },
  });

  const handleAddInternalLink = () => {
    if (!linkedStoryId) {
      toast.error('Please select a story');
      return;
    }
    addInternalLinkMutation.mutate();
  };

  const handleAddExternalLink = () => {
    if (!externalUrl || !externalTitle) {
      toast.error('Please provide both URL and title');
      return;
    }
    addExternalLinkMutation.mutate();
  };

  return (
    <div className="space-y-4">
      {/* Add Link Section */}
      {!isAdding ? (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsAdding(true)}
          className="border-brand-gold/20 text-brand-gold hover:bg-brand-gold/10"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Link
        </Button>
      ) : (
        <div className="space-y-3 p-4 border rounded-lg bg-card border-brand-gold/20">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-brand-gold" />
              Add Link
            </h4>
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Link Type */}
          <div className="space-y-2">
            <label className="text-xs font-medium">Link Type</label>
            <Select value={linkType} onValueChange={(v) => setLinkType(v as LinkType)}>
              <SelectTrigger className="focus:ring-brand-gold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LINK_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Internal Story Link */}
          <div className="space-y-2">
            <label className="text-xs font-medium">Link to Story</label>
            <Select value={linkedStoryId} onValueChange={setLinkedStoryId}>
              <SelectTrigger className="focus:ring-brand-gold">
                <SelectValue placeholder="Select a story..." />
              </SelectTrigger>
              <SelectContent>
                {allStories?.map((story) => (
                  <SelectItem key={story.id} value={story.id}>
                    {story.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              onClick={handleAddInternalLink} 
              disabled={!linkedStoryId || addInternalLinkMutation.isPending}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {addInternalLinkMutation.isPending ? 'Adding...' : 'Add Story Link'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">— OR —</div>

          {/* External Link */}
          <div className="space-y-2">
            <label className="text-xs font-medium">External Link</label>
            <Input
              placeholder="Title"
              value={externalTitle}
              onChange={(e) => setExternalTitle(e.target.value)}
              className="focus-visible:ring-brand-gold"
            />
            <Input
              placeholder="https://..."
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              className="focus-visible:ring-brand-gold"
            />
            <Button 
              size="sm" 
              onClick={handleAddExternalLink} 
              disabled={!externalUrl || !externalTitle || addExternalLinkMutation.isPending}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {addExternalLinkMutation.isPending ? 'Adding...' : 'Add External Link'}
            </Button>
          </div>
        </div>
      )}

      {/* Links List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-brand-gold" />
          Related Items ({links?.length || 0})
        </h4>
        
        {!links || links.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No links yet. Add story links or external references.
          </p>
        ) : (
          <div className="space-y-2">
            {links.map((link: any) => (
              <div 
                key={link.id} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge variant="outline" className={`text-xs ${LINK_TYPE_COLORS[link.link_type as LinkType]}`}>
                    {LINK_TYPE_LABELS[link.link_type as LinkType]}
                  </Badge>
                  
                  {link.to_story_id ? (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {link.to_story?.name}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <a 
                        href={link.external_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-brand-gold hover:underline truncate flex items-center gap-1"
                      >
                        {link.external_title}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => deleteLinkMutation.mutate(link.id)}
                  disabled={deleteLinkMutation.isPending}
                  className="flex-shrink-0"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
