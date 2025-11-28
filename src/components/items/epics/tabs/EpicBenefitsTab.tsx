import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface EpicBenefitsTabProps {
  epic: any;
}

export function EpicBenefitsTab({ epic }: EpicBenefitsTabProps) {
  const queryClient = useQueryClient();
  const [newBenefit, setNewBenefit] = useState({
    title: '',
    description: '',
    metric: '',
    target_value: ''
  });

  const { data: benefits } = useQuery({
    queryKey: ['epic-benefits', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_benefits')
        .select('*')
        .eq('epic_id', epic.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (benefit: any) => {
      const { error } = await supabase
        .from('epic_benefits')
        .insert({ ...benefit, epic_id: epic.id });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-benefits'] });
      toast.success('Benefit added');
      setNewBenefit({ title: '', description: '', metric: '', target_value: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('epic_benefits')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-benefits'] });
      toast.success('Benefit deleted');
    }
  });

  const handleAddBenefit = () => {
    if (!newBenefit.title) {
      toast.error('Benefit title is required');
      return;
    }
    createMutation.mutate(newBenefit);
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        Track business benefits and outcomes expected from this epic
      </div>

      <Card className="p-4 border-dashed">
        <h4 className="font-medium mb-4">Add New Benefit</h4>
        <div className="space-y-4">
          <div>
            <Label>Benefit Title*</Label>
            <Input
              value={newBenefit.title}
              onChange={(e) => setNewBenefit({ ...newBenefit, title: e.target.value })}
              placeholder="e.g., Increased Revenue"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={newBenefit.description}
              onChange={(e) => setNewBenefit({ ...newBenefit, description: e.target.value })}
              placeholder="Describe the business benefit"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Metric</Label>
              <Input
                value={newBenefit.metric}
                onChange={(e) => setNewBenefit({ ...newBenefit, metric: e.target.value })}
                placeholder="e.g., Revenue Growth"
              />
            </div>
            <div>
              <Label>Target Value</Label>
              <Input
                value={newBenefit.target_value}
                onChange={(e) => setNewBenefit({ ...newBenefit, target_value: e.target.value })}
                placeholder="e.g., $500K increase"
              />
            </div>
          </div>

          <Button onClick={handleAddBenefit} disabled={createMutation.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Add Benefit
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <h4 className="font-medium">Tracked Benefits</h4>
        {benefits && benefits.length > 0 ? (
          benefits.map((benefit: any) => (
            <Card key={benefit.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{benefit.title}</h4>
                  {benefit.description && (
                    <p className="text-sm text-muted-foreground mt-1">{benefit.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    {benefit.metric && (
                      <span className="text-muted-foreground">
                        <strong>Metric:</strong> {benefit.metric}
                      </span>
                    )}
                    {benefit.target_value && (
                      <span className="text-muted-foreground">
                        <strong>Target:</strong> {benefit.target_value}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm('Delete this benefit?')) {
                      deleteMutation.mutate(benefit.id);
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
            No benefits tracked yet. Add benefits above.
          </div>
        )}
      </div>
    </div>
  );
}
