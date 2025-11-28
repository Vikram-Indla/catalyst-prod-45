import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EpicIntakeTabProps {
  epic: any;
}

export function EpicIntakeTab({ epic }: EpicIntakeTabProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    business_justification: '',
    expected_value: '',
    target_market: '',
    priority: 'medium',
    dependencies: '',
    risks: '',
    assumptions: ''
  });

  const { data: intakeData } = useQuery({
    queryKey: ['epic-intake', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_intake_responses')
        .select('*')
        .eq('epic_id', epic.id);
      
      if (error) throw error;
      
      // Convert array to object
      const responses: any = {};
      data?.forEach((item: any) => {
        responses[item.field_id] = item.value;
      });
      
      setFormData({
        business_justification: responses['business_justification'] || '',
        expected_value: responses['expected_value'] || '',
        target_market: responses['target_market'] || '',
        priority: responses['priority'] || 'medium',
        dependencies: responses['dependencies'] || '',
        risks: responses['risks'] || '',
        assumptions: responses['assumptions'] || ''
      });
      
      return responses;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete existing responses
      await supabase
        .from('epic_intake_responses')
        .delete()
        .eq('epic_id', epic.id);
      
      // Insert new responses
      const responses = Object.entries(formData).map(([field_id, value]) => ({
        epic_id: epic.id,
        field_id,
        value
      }));
      
      const { error } = await supabase
        .from('epic_intake_responses')
        .insert(responses);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-intake'] });
      toast.success('Intake responses saved');
    }
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        Intake form fields for capturing epic requirements and business context
      </div>

      <div>
        <Label>Business Justification</Label>
        <Textarea
          rows={4}
          placeholder="Enter business justification"
          className="mt-2"
          value={formData.business_justification}
          onChange={(e) => setFormData({ ...formData, business_justification: e.target.value })}
        />
      </div>

      <div>
        <Label>Expected Business Value</Label>
        <Input 
          type="text" 
          placeholder="Describe expected value"
          value={formData.expected_value}
          onChange={(e) => setFormData({ ...formData, expected_value: e.target.value })}
        />
      </div>

      <div>
        <Label>Target Market/Customer Segment</Label>
        <Input 
          type="text" 
          placeholder="Enter target market"
          value={formData.target_market}
          onChange={(e) => setFormData({ ...formData, target_market: e.target.value })}
        />
      </div>

      <div>
        <Label>Priority</Label>
        <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Dependencies</Label>
        <Textarea
          rows={3}
          placeholder="List dependencies"
          className="mt-2"
          value={formData.dependencies}
          onChange={(e) => setFormData({ ...formData, dependencies: e.target.value })}
        />
      </div>

      <div>
        <Label>Risks</Label>
        <Textarea
          rows={3}
          placeholder="Identify risks"
          className="mt-2"
          value={formData.risks}
          onChange={(e) => setFormData({ ...formData, risks: e.target.value })}
        />
      </div>

      <div>
        <Label>Assumptions</Label>
        <Textarea
          rows={3}
          placeholder="Document assumptions"
          className="mt-2"
          value={formData.assumptions}
          onChange={(e) => setFormData({ ...formData, assumptions: e.target.value })}
        />
      </div>

      <Button onClick={handleSave} disabled={saveMutation.isPending}>
        Save Intake Responses
      </Button>
    </div>
  );
}
