import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X } from '@/lib/atlaskit-icons';

interface FieldLayoutPanelProps {
  typeId: string;
  typeName: string;
  onClose: () => void;
}

export function FieldLayoutPanel({ typeId, typeName, onClose }: FieldLayoutPanelProps) {
  const { data: fields = [], isLoading } = useQuery({
    queryKey: ['ph-type-fields', typeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_type_field_layouts')
        .select('*')
        .eq('type_id', typeId)
        .order('position');
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!typeId,
  });

  const getTagStyle = (isRequired: boolean, isTypeSpecific: boolean) => {
    if (isRequired) return { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger, var(--cp-danger))', label: 'Required' };
    if (isTypeSpecific) return { bg: 'var(--ds-background-warning, var(--ds-background-warning))', text: 'var(--ds-text-warning, var(--cp-warning))', label: 'Type-specific' };
    return { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', label: 'Optional' };
  };

  return (
    <div
      className="rounded-xl mt-4 bg-[var(--cp-float)] dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))]"
      style={{
        border: '1px solid var(--divider)', borderRadius: 12,
        padding: '16px 20px', boxShadow: '0 1px 2px var(--ds-shadow-raised)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 700, color: 'var(--fg-1)', fontFamily: 'var(--cp-font-heading)' }}>
          {typeName} — Field Layout
        </h4>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-md hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, var(--cp-bg-sunken)))] transition-colors"
          style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <X size={14} color="var(--fg-3)" />
        </button>
      </div>

      {isLoading ? (
        <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--fg-4)', padding: '12px 0' }}>Loading fields...</div>
      ) : fields.length === 0 ? (
        <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--fg-4)', padding: '12px 0' }}>No fields configured for this type.</div>
      ) : (
        <div className="space-y-0">
          {/* Header */}
          <div className="flex items-center gap-4 px-2 pb-2" style={{ borderBottom: '1px solid var(--cp-bd-zone)' }}>
            <span style={{ flex: 1, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Field Name</span>
            <span style={{ width: 120, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</span>
            <span style={{ width: 100, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
          </div>

          {fields.map((field: any) => {
            const tag = getTagStyle(field.is_required, field.is_type_specific);
            return (
              <div
                key={field.id}
                className="flex items-center gap-4 px-2 hover:bg-[var(--ds-surface-sunken)] transition-colors"
                style={{ height: 40, borderBottom: '1px solid var(--bg-1)' }}
              >
                <span className="flex-1 truncate" style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--fg-1)' }}>
                  {field.field_name}
                </span>
                <span style={{ width: 120, fontSize: 'var(--ds-font-size-200)', color: 'var(--fg-4)', fontFamily: 'var(--cp-font-mono)' }}>
                  {field.field_type}
                </span>
                <span style={{ width: 100 }}>
                  <span
                    className="rounded-full"
                    style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, padding: '0px 8px', background: tag.bg, color: tag.text }}
                  >
                    {tag.label}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
