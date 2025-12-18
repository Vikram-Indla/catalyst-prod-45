/**
 * StrategyContextCard — Mission, Vision, Values grid
 * Renders ONLY the 3 editable cards; parent provides accordion wrapper
 * No duplicate headers - parent handles section title
 */

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
      title: 'Mission',
      question: 'Why do we exist?',
      value: snapshot?.mission || '',
      field: 'mission' as const,
      placeholder: 'Lead the industrial and mineral ecosystem...',
      iconColor: 'var(--brand-primary)',
      iconBg: 'rgba(92, 124, 92, 0.1)',
    },
    {
      icon: Eye,
      title: 'Vision',
      question: 'What value do we provide?',
      value: snapshot?.vision || '',
      field: 'vision' as const,
      placeholder: 'Make Saudi Arabia a global magnet...',
      iconColor: 'var(--brand-primary)',
      iconBg: 'rgba(92, 124, 92, 0.1)',
    },
    {
      icon: Star,
      title: 'Values',
      question: 'How do we behave?',
      value: valuesString,
      field: 'values' as const,
      placeholder: 'Ambition, Influence, Confidence...',
      iconColor: 'var(--secondary-bronze)',
      iconBg: 'rgba(139, 115, 85, 0.1)',
    },
  ];

  return (
    <div className="p-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {contextItems.map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.field}
              className="p-3 rounded-md transition-all duration-150"
              style={{
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {/* Label with Icon */}
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: item.iconBg }}
                >
                  <Icon 
                    size={11}
                    style={{ color: item.iconColor }}
                  />
                </div>
                <span 
                  className="text-[11px] font-semibold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {item.title}
                </span>
              </div>

              {/* Question */}
              <p 
                className="text-[10px] italic mb-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                {item.question}
              </p>

              {/* Editable Value */}
              <div className="min-h-[32px]">
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
  );
}
