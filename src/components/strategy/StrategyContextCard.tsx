import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { InlineEditTextarea } from '@/components/ui/InlineEditTextarea';
import { Crosshair, Eye, Star } from 'lucide-react';

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
      icon: Crosshair,
      title: 'MISSION',
      question: 'Why do we exist?',
      value: snapshot?.mission || '',
      field: 'mission' as const,
      placeholder: 'Lead the industrial and mineral ecosystem...',
      iconColor: '#5C7C5C',
      iconBg: 'rgba(92, 124, 92, 0.1)',
      labelColor: '#5C7C5C',
    },
    {
      icon: Eye,
      title: 'VISION',
      question: 'What value do we provide?',
      value: snapshot?.vision || '',
      field: 'vision' as const,
      placeholder: 'Make Saudi Arabia a global magnet...',
      iconColor: '#C69C6D',
      iconBg: 'rgba(198, 156, 109, 0.1)',
      labelColor: '#C69C6D',
    },
    {
      icon: Star,
      title: 'VALUES',
      question: 'How do we behave?',
      value: valuesString,
      field: 'values' as const,
      placeholder: 'Ambition, Influence, Confidence...',
      iconColor: '#8B7355',
      iconBg: 'rgba(139, 115, 85, 0.1)',
      labelColor: '#8B7355',
    },
  ];

  return (
    <section 
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--divider)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div 
        className="px-6 py-4"
        style={{ borderBottom: '1px solid var(--divider-subtle)' }}
      >
        <h2 
          className="text-lg font-semibold"
          style={{ color: 'var(--text-1)' }}
        >
          Strategy Context
        </h2>
        <p 
          className="text-sm mt-0.5"
          style={{ color: 'var(--text-2)' }}
        >
          Mission, vision, and values guiding this snapshot
        </p>
      </div>

      {/* Content Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contextItems.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.field}
                className="p-4 rounded-lg transition-all duration-150"
                style={{
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--divider-subtle)',
                }}
              >
                {/* Label with Colored Icon Background */}
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: item.iconBg }}
                  >
                    <Icon 
                      size={14}
                      style={{ color: item.iconColor }}
                    />
                  </div>
                  <span 
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: item.labelColor }}
                  >
                    {item.title}
                  </span>
                </div>

                {/* Question */}
                <p 
                  className="text-xs italic mb-2"
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
