import { useToast } from '@/hooks/use-toast';
import { MissionVisionValuesCard } from './MissionVisionValuesCard';
import { supabase } from '@/integrations/supabase/client';

interface MissionVisionValuesProps {
  snapshot: {
    id: string;
    mission?: string | null;
    vision?: string | null;
    values?: unknown;
  } | null;
  onUpdate?: () => void;
}

export function MissionVisionValues({ snapshot, onUpdate }: MissionVisionValuesProps) {
  const { toast } = useToast();

  // Parse values from snapshot (stored as JSON or array)
  const valuesArray = Array.isArray(snapshot?.values) 
    ? snapshot.values 
    : typeof snapshot?.values === 'string' 
      ? JSON.parse(snapshot.values) 
      : [];
  
  const valuesString = valuesArray.join('\n');

  const handleSave = async (field: 'mission' | 'vision' | 'values', newValue: string) => {
    if (!snapshot?.id) {
      toast({
        title: 'Error',
        description: 'No strategy snapshot found to update.',
        variant: 'destructive',
      });
      return;
    }

    const oldValue = field === 'values' ? valuesString : (snapshot[field] || '');
    console.log(`[Strategy Update] ${field}: "${oldValue}" → "${newValue}"`);

    try {
      const updateData: Record<string, unknown> = {};
      
      if (field === 'values') {
        // Split by newlines and filter empty lines
        updateData.values = newValue.split('\n').filter(v => v.trim());
      } else {
        updateData[field] = newValue || null;
      }

      const { error } = await supabase
        .from('strategy_snapshots')
        .update(updateData)
        .eq('id', snapshot.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`,
      });

      onUpdate?.();
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      toast({
        title: 'Error',
        description: `Failed to update ${field}. Please try again.`,
        variant: 'destructive',
      });
      throw error;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      <MissionVisionValuesCard
        title="Mission"
        subtitle="Why do we exist?"
        value={snapshot?.mission || ''}
        placeholder="Enter your organization's mission statement..."
        ariaLabel="Edit mission statement"
        onSave={(value) => handleSave('mission', value)}
      />

      <MissionVisionValuesCard
        title="Vision"
        subtitle="What value do we provide?"
        value={snapshot?.vision || ''}
        placeholder="Enter your organization's vision statement..."
        ariaLabel="Edit vision statement"
        onSave={(value) => handleSave('vision', value)}
      />

      <MissionVisionValuesCard
        title="Values"
        subtitle="How do we behave?"
        value={valuesString}
        placeholder="Enter your organization's core values (one per line)..."
        ariaLabel="Edit values"
        onSave={(value) => handleSave('values', value)}
      />
    </div>
  );
}