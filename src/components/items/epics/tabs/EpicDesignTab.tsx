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
        <h3 className="executive-section-heading text-lg">Design Artifacts & Mockups</h3>
        <p className="text-sm text-[#6b6b6b]">
          Track design assets, wireframes, prototypes, and UI mockups for this epic
        </p>
      </div>

      <div className="executive-card border-dashed">
        <h4 className="font-medium mb-4 text-[#1a1a1a]">Add New Design Item</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-[#1a1a1a]">Title*</Label>
            <Input
              value={newDesignItem.title}
              onChange={(e) => setNewDesignItem({ ...newDesignItem, title: e.target.value })}
              placeholder="e.g., Homepage Wireframe, Mobile Mockup"
              className="executive-input"
            />
          </div>
          <div>
            <Label className="text-[#1a1a1a]">Type</Label>
            <select
              className="w-full h-9 rounded-md executive-input"
              value={newDesignItem.type}
              onChange={(e) => setNewDesignItem({ ...newDesignItem, type: e.target.value as 'link' | 'file' })}
            >
              <option value="link">External Link</option>
              <option value="file">File Attachment</option>
            </select>
          </div>
          <div>
            <Label className="text-[#1a1a1a]">URL/File Path*</Label>
            <Input
              value={newDesignItem.url}
              onChange={(e) => setNewDesignItem({ ...newDesignItem, url: e.target.value })}
              placeholder="https://... or /path/to/file"
              className="executive-input"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-[#1a1a1a]">Description</Label>
            <Textarea
              value={newDesignItem.description}
              onChange={(e) => setNewDesignItem({ ...newDesignItem, description: e.target.value })}
              placeholder="Optional description or notes about this design asset"
              rows={2}
              className="executive-input"
            />
          </div>
          <div className="col-span-2">
            <Button onClick={handleAddDesignItem} disabled={createMutation.isPending} className="executive-btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Design Item
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {designItems && designItems.length > 0 ? (
          designItems.map((item: any) => (
            <div key={item.id} className="executive-card">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {item.type === 'link' ? (
                    <FileText className="h-5 w-5 text-[#6b6b6b] mt-0.5" />
                  ) : (
                    <FileImage className="h-5 w-5 text-[#6b6b6b] mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-[#1a1a1a]">{item.title}</h4>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#c69c6d] hover:text-[#b8905f] transition-colors duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    {item.description && (
                      <p className="text-sm text-[#6b6b6b] mt-1">{item.description}</p>
                    )}
                    <p className="text-xs text-[#8a8a8a] mt-2">
                      Added {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[#6b6b6b] hover:bg-[rgba(198,156,109,0.08)] hover:text-[#1a1a1a]"
                  onClick={() => {
                    if (confirm('Delete this design item?')) {
                      deleteMutation.mutate(item.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="executive-empty-state">
            No design items yet. Add mockups, wireframes, or design links above.
          </div>
        )}
      </div>
    </div>
  );
}
