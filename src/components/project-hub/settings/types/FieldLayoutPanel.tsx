import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';

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
    if (isRequired) return { bg: '#FEF2F2', text: '#DC2626', label: 'Required' };
    if (isTypeSpecific) return { bg: '#FFFBEB', text: '#D97706', label: 'Type-specific' };
    return { bg: '#F1F5F9', text: '#94A3B8', label: 'Optional' };
  };

  return (
    <div
      className="rounded-xl mt-4"
      style={{
        background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
        padding: '16px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>
          {typeName} — Field Layout
        </h4>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-md hover:bg-[#F1F5F9] transition-colors"
          style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <X size={14} color="#64748B" />
        </button>
      </div>

      {isLoading ? (
        <div style={{ fontSize: 13, color: '#94A3B8', padding: '12px 0' }}>Loading fields...</div>
      ) : fields.length === 0 ? (
        <div style={{ fontSize: 13, color: '#94A3B8', padding: '12px 0' }}>No fields configured for this type.</div>
      ) : (
        <div className="space-y-0">
          {/* Header */}
          <div className="flex items-center gap-4 px-2 pb-2" style={{ borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Field Name</span>
            <span style={{ width: 120, fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</span>
            <span style={{ width: 100, fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
          </div>

          {fields.map((field: any) => {
            const tag = getTagStyle(field.is_required, field.is_type_specific);
            return (
              <div
                key={field.id}
                className="flex items-center gap-4 px-2 hover:bg-[#F8FAFC] transition-colors"
                style={{ height: 40, borderBottom: '1px solid #F8FAFC' }}
              >
                <span className="flex-1 truncate" style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>
                  {field.field_name}
                </span>
                <span style={{ width: 120, fontSize: 12, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
                  {field.field_type}
                </span>
                <span style={{ width: 100 }}>
                  <span
                    className="rounded-full"
                    style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', background: tag.bg, color: tag.text }}
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
