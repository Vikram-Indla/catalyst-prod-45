// Story Links - manage relationships to other work items
// Citation: Catalyst_Stories_PRD_v2.pdf
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Link as LinkIcon, Plus, X, ExternalLink } from 'lucide-react';

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

export function StoryLinks({ storyId }: StoryLinksProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [linkType, setLinkType] = useState<LinkType>('relates_to');
  const [linkedStoryId, setLinkedStoryId] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalTitle, setExternalTitle] = useState('');
  const queryClient = useQueryClient();

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

  const handleAddInternalLink = () => {
    if (linkedStoryId) {
      toast.info('Internal story linking will be implemented with database schema');
      setIsAdding(false);
      setLinkedStoryId('');
    }
  };

  const handleAddExternalLink = () => {
    if (externalUrl && externalTitle) {
      toast.info('External link storage will be implemented with database schema');
      setIsAdding(false);
      setExternalUrl('');
      setExternalTitle('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Link Section */}
      {!isAdding ? (
        <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Link
        </Button>
      ) : (
        <div className="space-y-3 p-4 border rounded-lg bg-card">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Add Link</h4>
            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Link Type */}
          <div className="space-y-2">
            <label className="text-xs font-medium">Link Type</label>
            <Select value={linkType} onValueChange={(v) => setLinkType(v as LinkType)}>
              <SelectTrigger>
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
              <SelectTrigger>
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
            <Button size="sm" onClick={handleAddInternalLink} disabled={!linkedStoryId}>
              Add Story Link
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
            />
            <Input
              placeholder="https://..."
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
            />
            <Button size="sm" onClick={handleAddExternalLink} disabled={!externalUrl || !externalTitle}>
              Add External Link
            </Button>
          </div>
        </div>
      )}

      {/* Links List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <LinkIcon className="h-4 w-4" />
          Related Items
        </h4>
        
        <p className="text-xs text-muted-foreground">
          Story links and dependencies will be displayed here once database schema is configured.
        </p>

        {/* Placeholder for linked items */}
        <div className="space-y-2">
          {/* Example link structure */}
          {/* 
          <div className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Blocks</Badge>
              <span className="text-sm">Story XYZ-123</span>
            </div>
            <Button variant="ghost" size="sm">
              <X className="h-3 w-3" />
            </Button>
          </div>
          */}
        </div>
      </div>
    </div>
  );
}
