import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Search, Plus, Loader2 } from 'lucide-react';

interface AddFeatureDialogProps {
  epicId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFeatureDialog({ epicId, open, onOpenChange }: AddFeatureDialogProps) {
  const [activeTab, setActiveTab] = useState('existing');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [newFeatureName, setNewFeatureName] = useState('');
  const queryClient = useQueryClient();

  // Fetch existing features that are NOT linked to this epic (or are unassigned)
  const { data: availableFeatures, isLoading: loadingFeatures } = useQuery({
    queryKey: ['available-features-for-epic', epicId, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('features')
        .select('id, name, display_id, status, programs(name)')
        .or(`epic_id.is.null,epic_id.neq.${epicId}`)
        .order('name');
      
      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }
      
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open && activeTab === 'existing',
  });

  // Mutation to link existing features to this epic
  const linkFeaturesMutation = useMutation({
    mutationFn: async (featureIds: string[]) => {
      const { error } = await supabase
        .from('features')
        .update({ epic_id: epicId })
        .in('id', featureIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['epic-child-progress', epicId] });
      queryClient.invalidateQueries({ queryKey: ['epic-children', epicId] });
      toast.success('Features linked to epic');
      setSelectedFeatureIds([]);
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to link features');
    }
  });

  // Mutation to create a new feature
  const createFeatureMutation = useMutation({
    mutationFn: async (name: string) => {
      // Get epic's primary program to assign to the new feature
      const { data: epic } = await supabase
        .from('epics')
        .select('primary_program_id')
        .eq('id', epicId)
        .single();
      
      const { data, error } = await supabase
        .from('features')
        .insert([{
          name,
          epic_id: epicId,
          project_id: epic?.primary_program_id,
          status: 'funnel',
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['epic-child-progress', epicId] });
      queryClient.invalidateQueries({ queryKey: ['epic-children', epicId] });
      toast.success('Feature created and linked to epic');
      setNewFeatureName('');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to create feature');
    }
  });

  const handleToggleFeature = (featureId: string) => {
    setSelectedFeatureIds(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  const handleLinkFeatures = () => {
    if (selectedFeatureIds.length > 0) {
      linkFeaturesMutation.mutate(selectedFeatureIds);
    }
  };

  const handleCreateFeature = () => {
    if (newFeatureName.trim()) {
      createFeatureMutation.mutate(newFeatureName.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Feature</DialogTitle>
          <DialogDescription>
            Link an existing feature or create a new one for this epic.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Link Existing</TabsTrigger>
            <TabsTrigger value="new">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search features..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[250px] border rounded-md">
              {loadingFeatures ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableFeatures && availableFeatures.length > 0 ? (
                <div className="p-2 space-y-1">
                  {availableFeatures.map((feature: any) => (
                    <div
                      key={feature.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleToggleFeature(feature.id)}
                    >
                      <Checkbox
                        checked={selectedFeatureIds.includes(feature.id)}
                        onCheckedChange={() => handleToggleFeature(feature.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{feature.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {feature.display_id} • {feature.programs?.name || 'No program'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  No available features found
                </div>
              )}
            </ScrollArea>

            <div className="text-sm text-muted-foreground">
              {selectedFeatureIds.length} feature(s) selected
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <div className="space-y-2">
              <Label>Feature Name</Label>
              <Input
                placeholder="Enter feature name"
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {activeTab === 'existing' ? (
            <Button 
              onClick={handleLinkFeatures} 
              disabled={selectedFeatureIds.length === 0 || linkFeaturesMutation.isPending}
              className="bg-brand-gold hover:bg-brand-gold-hover"
            >
              {linkFeaturesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Link {selectedFeatureIds.length} Feature(s)
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleCreateFeature} 
              disabled={!newFeatureName.trim() || createFeatureMutation.isPending}
              className="bg-brand-gold hover:bg-brand-gold-hover"
            >
              {createFeatureMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Feature
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
