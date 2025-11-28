import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, ExternalLink, FileImage, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface EpicDesignTabProps {
  epic: any;
}

export function EpicDesignTab({ epic }: EpicDesignTabProps) {
  const queryClient = useQueryClient();
  const [newDesignItem, setNewDesignItem] = useState({ title: '', url: '', type: 'link' as 'link' | 'file', description: '' });

  const { data: designItems } = useQuery({
    queryKey: ['epic-design', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_design_items')
        .select('*')
        .eq('epic_id', epic.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (item: any) => {
      const { error } = await supabase
        .from('epic_design_items')
        .insert({ ...item, epic_id: epic.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-design'] });
      toast.success('Design item added');
      setNewDesignItem({ title: '', url: '', type: 'link', description: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('epic_design_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-design'] });
      toast.success('Design item deleted');
    }
  });

  const handleAddDesignItem = () => {
    if (!newDesignItem.title || !newDesignItem.url) {
      toast.error('Title and URL are required');
      return;
    }
    createMutation.mutate(newDesignItem);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Design Artifacts & Mockups</h3>
        <p className="text-sm text-muted-foreground">
          Track design assets, wireframes, prototypes, and UI mockups for this epic
        </p>
      </div>

      <Card className="p-4 border-dashed">
        <h4 className="font-medium mb-4">Add New Design Item</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Title*</Label>
            <Input
              value={newDesignItem.title}
              onChange={(e) => setNewDesignItem({ ...newDesignItem, title: e.target.value })}
              placeholder="e.g., Homepage Wireframe, Mobile Mockup"
            />
          </div>
          <div>
            <Label>Type</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={newDesignItem.type}
              onChange={(e) => setNewDesignItem({ ...newDesignItem, type: e.target.value as 'link' | 'file' })}
            >
              <option value="link">External Link</option>
              <option value="file">File Attachment</option>
            </select>
          </div>
          <div>
            <Label>URL/File Path*</Label>
            <Input
              value={newDesignItem.url}
              onChange={(e) => setNewDesignItem({ ...newDesignItem, url: e.target.value })}
              placeholder="https://... or /path/to/file"
            />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea
              value={newDesignItem.description}
              onChange={(e) => setNewDesignItem({ ...newDesignItem, description: e.target.value })}
              placeholder="Optional description or notes about this design asset"
              rows={2}
            />
          </div>
          <div className="col-span-2">
            <Button onClick={handleAddDesignItem} disabled={createMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Add Design Item
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {designItems && designItems.length > 0 ? (
          designItems.map((item: any) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {item.type === 'link' ? (
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  ) : (
                    <FileImage className="h-5 w-5 text-muted-foreground mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{item.title}</h4>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Added {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm('Delete this design item?')) {
                      deleteMutation.mutate(item.id);
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
            No design items yet. Add mockups, wireframes, or design links above.
          </div>
        )}
      </div>
    </div>
  );
}
