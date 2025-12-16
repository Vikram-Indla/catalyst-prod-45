import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { InlineEditTextarea } from '@/components/ui/InlineEditTextarea';
import { Target, Eye, Star } from 'lucide-react';

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
  const valuesString = valuesArray.join(', ');

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
        updateData.values = newValue.split(',').map(v => v.trim()).filter(v => v);
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

  const contextItems = [
    {
      icon: Target,
      title: 'MISSION',
      question: 'Why do we exist?',
      value: snapshot?.mission || '',
      field: 'mission' as const,
      placeholder: 'Lead the industrial and mineral ecosystem...',
    },
    {
      icon: Eye,
      title: 'VISION',
      question: 'What value do we provide?',
      value: snapshot?.vision || '',
      field: 'vision' as const,
      placeholder: 'Make Saudi Arabia a global magnet...',
    },
    {
      icon: Star,
      title: 'VALUES',
      question: 'How do we behave?',
      value: valuesString,
      field: 'values' as const,
      placeholder: 'Ambition, Influence, Confidence...',
    },
  ];

  return (
    <section 
      className="rounded-[10px] overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--divider)',
        borderLeft: '3px solid var(--secondary-green)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div 
        className="px-5 py-4"
        style={{ borderBottom: '1px solid var(--divider-subtle)' }}
      >
        <h2 
          className="text-[15px] font-semibold"
          style={{ color: 'var(--text-1)' }}
        >
          Strategy Context
        </h2>
        <p 
          className="text-[12px] mt-0.5"
          style={{ color: 'var(--text-2)' }}
        >
          Mission, vision, and values guiding this snapshot
        </p>
      </div>

      {/* Content Grid */}
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {contextItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.field}
                className="p-4 rounded-lg transition-all duration-150 hover:border-[var(--border-accent)]"
                style={{
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--divider-subtle)',
                }}
              >
                {/* Label with Icon */}
                <div className="flex items-center gap-2 mb-2">
                  <Icon 
                    className="w-3.5 h-3.5" 
                    style={{ color: 'var(--secondary-green)' }}
                  />
                  <span 
                    className="text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--secondary-green)' }}
                  >
                    {item.title}
                  </span>
                </div>

                {/* Question */}
                <p 
                  className="text-[11px] italic mb-2"
                  style={{ color: 'var(--text-2)' }}
                >
                  {item.question}
                </p>

                {/* Editable Value */}
                <div className="min-h-[40px]">
                  <InlineEditTextarea
                    value={item.value}
                    onSave={(v) => handleSave(item.field, v)}
                    placeholder={item.placeholder}
                    emptyText="Not set"
                    aria-label={`Edit ${item.title}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
