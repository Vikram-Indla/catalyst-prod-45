import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface EpicIntakeTabProps {
  epic: any;
}

// Default Form fields per Jira Align specification
const INTAKE_FIELDS = [
  { id: 'justification', label: 'Justification', number: 1 },
  { id: 'department', label: 'Department', number: 2 },
  { id: 'requestor', label: 'Requestor', number: 3 },
  { id: 'reviewer', label: 'Reviewer', number: 4 },
  { id: 'approver', label: 'Approver', number: 5 },
];

export function EpicIntakeTab({ epic }: EpicIntakeTabProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({
    justification: '',
    department: '',
    requestor: '',
    reviewer: '',
    approver: '',
  });

  // Fetch existing intake responses
  const { data: intakeData } = useQuery({
    queryKey: ['epic-intake', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_intake_responses')
        .select('*')
        .eq('epic_id', epic.id);
      
      if (error) throw error;
      
      // Convert array to object
      const responses: Record<string, string> = {};
      data?.forEach((item: any) => {
        responses[item.field_id] = item.value || '';
      });
      
      return responses;
    }
  });

  // Initialize form data from fetched data
  useEffect(() => {
    if (intakeData) {
      setFormData(prev => ({
        ...prev,
        ...intakeData
      }));
    }
  }, [intakeData]);

  // Save mutation using upsert
  const saveMutation = useMutation({
    mutationFn: async ({ fieldId, value }: { fieldId: string; value: string }) => {
      const { error } = await supabase
        .from('epic_intake_responses')
        .upsert(
          { 
            epic_id: epic.id, 
            field_id: fieldId, 
            value,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'epic_id,field_id' }
        );
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-intake', epic.id] });
      toast.success('Saved');
    },
    onError: (error) => {
      console.error('Failed to save intake response:', error);
      toast.error('Failed to save');
    }
  });

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleFieldBlur = (fieldId: string) => {
    const currentValue = formData[fieldId] || '';
    const savedValue = intakeData?.[fieldId] || '';
    
    if (currentValue !== savedValue) {
      saveMutation.mutate({ fieldId, value: currentValue });
    }
  };

  return (
    <div className="space-y-6">
      {/* Default Form Header */}
      <div className="border-b pb-3">
        <h3 className="text-base font-semibold text-foreground">Default Form</h3>
      </div>

      {/* Intake Form Fields */}
      <div className="space-y-6">
        {INTAKE_FIELDS.map((field) => (
          <div key={field.id}>
            <Label className="text-sm text-muted-foreground">
              {field.number}. {field.label}
            </Label>
            <Textarea
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              onBlur={() => handleFieldBlur(field.id)}
              rows={4}
              className="mt-1.5 resize-y"
              placeholder=""
            />
          </div>
        ))}
      </div>
    </div>
  );
}
