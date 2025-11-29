import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface EpicLinksTabProps {
  epic: any;
}

export function EpicLinksTab({ epic }: EpicLinksTabProps) {
  const queryClient = useQueryClient();
  const [newLink, setNewLink] = useState({
    title: '',
    url: '',
    link_type: 'documentation'
  });

  const { data: links } = useQuery({
    queryKey: ['epic-links', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_links')
        .select('*')
        .eq('epic_id', epic.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (link: any) => {
      const { error } = await supabase
        .from('epic_links')
        .insert({ ...link, epic_id: epic.id });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-links'] });
      toast.success('Link added');
      setNewLink({ title: '', url: '', link_type: 'documentation' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('epic_links')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-links'] });
      toast.success('Link deleted');
    }
  });

  const handleAddLink = () => {
    if (!newLink.title || !newLink.url) {
      toast.error('Title and URL are required');
      return;
    }
    createMutation.mutate(newLink);
  };

  const getLinkTypeBadge = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      documentation: { label: 'Documentation', color: 'bg-info' },
      design: { label: 'Design', color: 'bg-workitem-theme' },
      ticket: { label: 'Ticket', color: 'bg-success' },
      reference: { label: 'Reference', color: 'bg-brand-gold' },
      other: { label: 'Other', color: 'bg-muted' }
    };
    const t = types[type] || types.other;
    return (
      <span className={`inline-block px-2 py-1 text-xs font-medium text-primary-foreground rounded ${t.color}`}>
        {t.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        Manage external links and references related to this epic
      </div>

      <Card className="p-4 border-dashed">
        <h4 className="font-medium mb-4">Add New Link</h4>
        <div className="space-y-4">
          <div>
            <Label>Title*</Label>
            <Input
              value={newLink.title}
              onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
              placeholder="e.g., Product Requirements Doc"
            />
          </div>

          <div>
            <Label>URL*</Label>
            <Input
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label>Link Type</Label>
            <Select value={newLink.link_type} onValueChange={(v) => setNewLink({ ...newLink, link_type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="documentation">Documentation</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="ticket">Ticket</SelectItem>
                <SelectItem value="reference">Reference</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleAddLink} disabled={createMutation.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Add Link
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <h4 className="font-medium">Links</h4>
        {links && links.length > 0 ? (
          links.map((link: any) => (
            <Card key={link.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getLinkTypeBadge(link.link_type)}
                    <h4 className="font-medium">{link.title}</h4>
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {link.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-xs text-muted-foreground mt-2">
                    Added {new Date(link.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm('Delete this link?')) {
                      deleteMutation.mutate(link.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No links yet. Add links above.
          </div>
        )}
      </div>
    </div>
  );
}
