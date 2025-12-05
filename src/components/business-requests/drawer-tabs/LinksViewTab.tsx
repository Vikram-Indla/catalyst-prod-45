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

interface LinksViewTabProps {
  requestId: string;
}

export function LinksViewTab({ requestId }: LinksViewTabProps) {
  const queryClient = useQueryClient();
  const [newLink, setNewLink] = useState({
    title: '',
    url: '',
    link_type: 'documentation'
  });

  const { data: links = [] } = useQuery({
    queryKey: ['business-request-links', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_request_links')
        .select('*')
        .eq('business_request_id', requestId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!requestId
  });

  const createMutation = useMutation({
    mutationFn: async (link: typeof newLink) => {
      const { error } = await supabase
        .from('business_request_links')
        .insert({ ...link, business_request_id: requestId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-request-links', requestId] });
      toast.success('Link added');
      setNewLink({ title: '', url: '', link_type: 'documentation' });
    },
    onError: () => {
      toast.error('Failed to add link');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('business_request_links')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-request-links', requestId] });
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
      documentation: { label: 'Documentation', color: 'bg-brand-gold' },
      design: { label: 'Design', color: 'bg-workitem-theme' },
      ticket: { label: 'Ticket', color: 'bg-success' },
      reference: { label: 'Reference', color: 'bg-info' },
      other: { label: 'Other', color: 'bg-muted' }
    };
    const t = types[type] || types.other;
    return (
      <span className={`inline-block px-2 py-1 text-xs font-medium text-white rounded ${t.color}`}>
        {t.label}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Add New Link Card */}
      <Card className="p-5 border-dashed border-2 border-border/60 bg-card">
        <h4 className="font-semibold text-[15px] text-foreground mb-4">Add New Link</h4>
        <div className="space-y-4">
          <div>
            <Label className="text-[13px] font-medium text-foreground">Title*</Label>
            <Input
              value={newLink.title}
              onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
              placeholder="e.g., Product Requirements Doc"
              className="mt-1.5 h-10 bg-muted/30 border-border/60 focus:border-brand-gold focus:ring-brand-gold/15"
            />
          </div>

          <div>
            <Label className="text-[13px] font-medium text-foreground">URL*</Label>
            <Input
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              placeholder="https://..."
              className="mt-1.5 h-10 bg-muted/30 border-border/60 focus:border-brand-gold focus:ring-brand-gold/15"
            />
          </div>

          <div>
            <Label className="text-[13px] font-medium text-foreground">Link Type</Label>
            <Select value={newLink.link_type} onValueChange={(v) => setNewLink({ ...newLink, link_type: v })}>
              <SelectTrigger className="mt-1.5 h-10 bg-muted/30 border-border/60">
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

          <Button 
            onClick={handleAddLink} 
            disabled={createMutation.isPending}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Link
          </Button>
        </div>
      </Card>

      {/* Links List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-[15px] text-foreground">Links</h4>
        {links.length > 0 ? (
          links.map((link: any) => (
            <Card key={link.id} className="p-4 bg-card border-border/60">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {getLinkTypeBadge(link.link_type)}
                    <h4 className="font-medium text-[14px] text-foreground truncate">{link.title}</h4>
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] text-brand-gold hover:underline flex items-center gap-1 truncate"
                  >
                    {link.url}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  <p className="text-[12px] text-muted-foreground mt-2">
                    Added {new Date(link.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
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
          <div className="text-center py-10 text-muted-foreground">
            No links yet. Add links above.
          </div>
        )}
      </div>
    </div>
  );
}