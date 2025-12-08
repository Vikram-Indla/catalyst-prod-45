import { useState } from 'react';
import { useWorkItemLinks, LINK_TYPE_LABELS, LinkType, WorkItemType } from '@/hooks/useWorkItemLinks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Link2, Plus, X, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WorkItemLinksSectionProps {
  workItemType: WorkItemType;
  workItemId: string;
}

const LINK_TYPE_COLORS: Record<string, string> = {
  blocks: 'bg-red-100 text-red-700 border-red-200',
  is_blocked_by: 'bg-red-100 text-red-700 border-red-200',
  relates_to: 'bg-blue-100 text-blue-700 border-blue-200',
  duplicates: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  is_duplicated_by: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  parent_of: 'bg-purple-100 text-purple-700 border-purple-200',
  child_of: 'bg-purple-100 text-purple-700 border-purple-200',
};

export function WorkItemLinksSection({ workItemType, workItemId }: WorkItemLinksSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLinkType, setSelectedLinkType] = useState<LinkType>('relates_to');
  const [selectedTargetType, setSelectedTargetType] = useState<WorkItemType>('story');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { links, isLoading, createLink, deleteLink, isCreating } = useWorkItemLinks(workItemType, workItemId);

  // Search for work items to link
  const { data: searchResults = [] } = useQuery({
    queryKey: ['work-item-search', selectedTargetType, searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      let query;
      if (selectedTargetType === 'epic') {
        query = supabase.from('epics').select('id, name, epic_key').ilike('name', `%${searchQuery}%`).limit(10);
      } else if (selectedTargetType === 'feature') {
        query = supabase.from('features').select('id, name, display_id').ilike('name', `%${searchQuery}%`).limit(10);
      } else {
        query = supabase.from('stories').select('id, name, story_key').ilike('name', `%${searchQuery}%`).limit(10);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length >= 2,
  });

  const handleCreateLink = () => {
    if (!selectedTargetId) return;
    createLink({
      targetType: selectedTargetType,
      targetId: selectedTargetId,
      linkType: selectedLinkType,
    });
    setDialogOpen(false);
    setSelectedTargetId('');
    setSearchQuery('');
  };

  const getItemKey = (item: any): string => {
    return item.epic_key || item.display_id || item.story_key || '';
  };

  if (isLoading) {
    return (
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading links...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/60 rounded-lg">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-brand-gold" />
            <Label className="font-semibold">Linked Items</Label>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-brand-gold hover:text-brand-gold-hover">
                <Plus className="h-3.5 w-3.5" />
                Add Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Link Work Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Link Type</Label>
                  <Select value={selectedLinkType} onValueChange={(v) => setSelectedLinkType(v as LinkType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LINK_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Item Type</Label>
                  <Select value={selectedTargetType} onValueChange={(v) => setSelectedTargetType(v as WorkItemType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="epic">Epic</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Search & Select Item</Label>
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchResults.length > 0 && (
                    <div className="border rounded-md max-h-48 overflow-auto">
                      {searchResults.map((item: any) => (
                        <div
                          key={item.id}
                          className={cn(
                            "p-2 cursor-pointer hover:bg-accent text-sm",
                            selectedTargetId === item.id && "bg-accent"
                          )}
                          onClick={() => setSelectedTargetId(item.id)}
                        >
                          <span className="font-medium text-brand-gold mr-2">{getItemKey(item)}</span>
                          {item.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleCreateLink} 
                  disabled={!selectedTargetId || isCreating}
                  className="w-full"
                >
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No linked items</p>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-2 rounded-md border bg-background hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs shrink-0", LINK_TYPE_COLORS[link.link_type])}
                  >
                    {LINK_TYPE_LABELS[link.link_type] || link.link_type}
                  </Badge>
                  <span className="text-xs font-medium text-brand-gold shrink-0">
                    {link.linked_item_key}
                  </span>
                  <span className="text-sm truncate">{link.linked_item_name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteLink(link.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
