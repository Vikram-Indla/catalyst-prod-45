// Story Quick Add - inline story creation
// Citation: Catalyst_Stories_PRD_v2.pdf
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';

interface StoryQuickAddProps {
  onSuccess?: () => void;
}

export function StoryQuickAdd({ onSuccess }: StoryQuickAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [featureId, setFeatureId] = useState('');
  const queryClient = useQueryClient();

  const { data: features } = useQuery({
    queryKey: ['features-quick-add'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  const createStoryMutation = useMutation({
    mutationFn: async () => {
      if (!featureId) {
        throw new Error('Feature is required');
      }

      const { error } = await supabase
        .from('stories')
        .insert({
          name,
          title: name, // Sync title with name
          feature_id: featureId,
          status: 'todo',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-stories'] });
      toast.success('Story created');
      setName('');
      setFeatureId('');
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create story');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && featureId) {
      createStoryMutation.mutate();
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Quick Add Story
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Quick Add Story</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Input
        placeholder="Story name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
      />

      <Select value={featureId} onValueChange={setFeatureId} required>
        <SelectTrigger>
          <SelectValue placeholder="Select feature..." />
        </SelectTrigger>
        <SelectContent>
          {features?.map((feature) => (
            <SelectItem key={feature.id} value={feature.id}>
              {feature.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={!name.trim() || !featureId || createStoryMutation.isPending}
          className="flex-1"
        >
          {createStoryMutation.isPending ? 'Creating...' : 'Create Story'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
