/**
 * Document Labels Component
 * Source: https://support.atlassian.com/confluence-cloud/docs/use-labels-to-categorize-spaces/
 * - Labels help categorize and organize content
 * - Users can add/remove labels
 * - Labels make content easier to find
 */
import { useState } from 'react';
import { Tag, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DocumentLabelsProps {
  documentId: string;
}

interface Label {
  id: string;
  document_id: string;
  label: string;
  created_at: string;
}

export function DocumentLabels({ documentId }: DocumentLabelsProps) {
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch labels for this document
  const { data: labels, isLoading } = useQuery({
    queryKey: ['kb-labels', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_document_labels')
        .select('*')
        .eq('document_id', documentId)
        .order('label');
      if (error) throw error;
      return data as Label[];
    },
  });

  // Add label mutation
  const addLabelMutation = useMutation({
    mutationFn: async (label: string) => {
      const { error } = await supabase
        .from('kb_document_labels')
        .insert({
          document_id: documentId,
          label: label.toLowerCase().trim(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-labels', documentId] });
      setNewLabel('');
      toast.success('Label added');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Label already exists');
      } else {
        toast.error('Failed to add label');
      }
    },
  });

  // Remove label mutation
  const removeLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await supabase
        .from('kb_document_labels')
        .delete()
        .eq('id', labelId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-labels', documentId] });
      toast.success('Label removed');
    },
  });

  const handleAddLabel = () => {
    if (!newLabel.trim()) return;
    addLabelMutation.mutate(newLabel);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLabel();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-brand-gold" />
        <span className="text-sm font-medium">Labels</span>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-2">
              <p className="text-sm font-medium">Add label</p>
              <div className="flex gap-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter label..."
                  className="h-8 text-sm"
                />
                <Button 
                  size="sm" 
                  className="h-8"
                  onClick={handleAddLabel}
                  disabled={!newLabel.trim() || addLabelMutation.isPending}
                >
                  Add
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Labels display */}
      <div className="flex flex-wrap gap-1">
        {isLoading ? (
          <span className="text-xs text-muted-foreground">Loading...</span>
        ) : labels && labels.length > 0 ? (
          labels.map((label) => (
            <Badge 
              key={label.id} 
              variant="secondary"
              className="text-xs group pr-1"
            >
              {label.label}
              <button
                onClick={() => removeLabelMutation.mutate(label.id)}
                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No labels</span>
        )}
      </div>
    </div>
  );
}
