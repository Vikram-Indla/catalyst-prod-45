import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/premium-card';
import { InlineEditTextarea } from '@/components/ui/InlineEditTextarea';

interface StrategyContextCardProps {
  snapshot: {
    id: string;
    mission?: string | null;
    vision?: string | null;
    values?: unknown;
  } | null;
  onUpdate?: () => void;
}

export function StrategyContextCard({ snapshot, onUpdate }: StrategyContextCardProps) {
  const { toast } = useToast();

  // Parse values from snapshot
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

    try {
      const updateData: Record<string, unknown> = {};
      if (field === 'values') {
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
        title: 'Updated',
        description: `${field.charAt(0).toUpperCase() + field.slice(1)} saved`,
      });

      onUpdate?.();
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      toast({
        title: 'Error',
        description: `Failed to update ${field}`,
        variant: 'destructive',
      });
    }
  };

  const ContextColumn = ({ 
    title, 
    helper, 
    value, 
    field,
    placeholder,
    isLast = false,
  }: { 
    title: string; 
    helper: string; 
    value: string; 
    field: 'mission' | 'vision' | 'values';
    placeholder: string;
    isLast?: boolean;
  }) => {
    return (
      <div 
        className="flex flex-col gap-1.5 min-w-0 py-3 px-4"
        style={{
          borderRight: isLast ? 'none' : '1px solid var(--divider)',
        }}
      >
        <div className="flex items-baseline gap-1.5 mb-1">
          <span 
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--text-2)' }}
          >
            {title}
          </span>
          <span 
            className="text-[11px] italic"
            style={{ color: 'var(--text-3)' }}
          >
            {helper}
          </span>
        </div>
        <div className="min-h-[40px]">
          <InlineEditTextarea
            value={value}
            onSave={(v) => handleSave(field, v)}
            placeholder={placeholder}
            emptyText="Not set"
            aria-label={`Edit ${title}`}
          />
        </div>
      </div>
    );
  };

  return (
    <PremiumCard accent="green">
      <PremiumCardHeader 
        title="Strategy Context" 
        subtitle="Mission, vision, and values guiding this snapshot" 
      />
      <PremiumCardContent noPadding>
        <div className="grid grid-cols-1 md:grid-cols-3">
          <ContextColumn
            title="Mission"
            helper="Why do we exist?"
            value={snapshot?.mission || ''}
            field="mission"
            placeholder="Enter mission statement..."
          />
          <ContextColumn
            title="Vision"
            helper="What value do we provide?"
            value={snapshot?.vision || ''}
            field="vision"
            placeholder="Enter vision statement..."
          />
          <ContextColumn
            title="Values"
            helper="How do we behave?"
            value={valuesString}
            field="values"
            placeholder="Enter core values (one per line)..."
            isLast
          />
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}
