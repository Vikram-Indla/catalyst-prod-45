import { useState, useEffect, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { IconColorPicker } from './IconColorPicker';

const DEPARTMENTS = [
  'Technology & Innovation',
  'Industrial Development',
  'Mining & Minerals',
  'Energy & Sustainability',
  'Regulatory Affairs',
  'Strategy & Planning',
  'Human Capital',
  'Finance & Admin',
];

export interface StepDetailsData {
  name: string;
  key: string;
  department: string;
  description: string;
  icon: string;
  color: string;
}

interface StepDetailsProps {
  data: StepDetailsData;
  onChange: (data: StepDetailsData) => void;
  isValid: boolean;
  onValidChange: (valid: boolean) => void;
}

function generateKey(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 6);
}

export function StepDetails({ data, onChange, isValid, onValidChange }: StepDetailsProps) {
  const [keyManual, setKeyManual] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'checking' | 'available' | 'taken' | null>(null);

  // Auto-generate key from name
  useEffect(() => {
    if (!keyManual && data.name) {
      const gen = generateKey(data.name);
      if (gen !== data.key) onChange({ ...data, key: gen });
    }
  }, [data.name, keyManual]);

  // Check key uniqueness (debounced)
  useEffect(() => {
    if (!data.key || data.key.length < 2) { setKeyStatus(null); return; }
    setKeyStatus('checking');
    const t = setTimeout(async () => {
      const { data: existing, error } = await supabase
        .from('ph_projects')
        .select('id')
        .eq('key', data.key.toUpperCase())
        .maybeSingle();
      setKeyStatus(existing ? 'taken' : 'available');
    }, 400);
    return () => clearTimeout(t);
  }, [data.key]);

  // Validate
  useEffect(() => {
    const valid = !!data.name.trim() && !!data.key.trim() && data.key.length >= 2 && keyStatus === 'available' && !!data.department;
    onValidChange(valid);
  }, [data.name, data.key, data.department, keyStatus]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 40,
    padding: '0 12px',
    fontSize: 13,
    color: '#0F172A',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 6,
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: '#334155', display: 'block', marginBottom: 4 }}>
          Project Name <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          value={data.name}
          onChange={e => onChange({ ...data, name: e.target.value })}
          placeholder="e.g. Digital Transformation Platform"
          style={inputStyle}
        />
      </div>

      {/* Key */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: '#334155', display: 'block', marginBottom: 4 }}>
          Project Key <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <div className="relative">
          <input
            value={data.key}
            onChange={e => {
              setKeyManual(true);
              onChange({ ...data, key: e.target.value.toUpperCase().slice(0, 6) });
            }}
            placeholder="AUTO"
            style={{
              ...inputStyle,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.05em',
              paddingRight: 36,
            }}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {keyStatus === 'checking' && (
              <div className="animate-spin rounded-full" style={{ width: 14, height: 14, border: '2px solid #E2E8F0', borderTopColor: '#2563EB' }} />
            )}
            {keyStatus === 'available' && <Check size={16} color="#16A34A" strokeWidth={2.5} />}
            {keyStatus === 'taken' && <X size={16} color="#EF4444" strokeWidth={2.5} />}
          </div>
        </div>
        {keyStatus === 'taken' && (
          <span style={{ fontSize: 11, color: '#EF4444', marginTop: 2, display: 'block' }}>
            This key is already in use
          </span>
        )}
      </div>

      {/* Department */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: '#334155', display: 'block', marginBottom: 4 }}>
          Department <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <select
          value={data.department}
          onChange={e => onChange({ ...data, department: e.target.value })}
          style={{
            ...inputStyle,
            cursor: 'pointer',
            color: data.department ? '#0F172A' : '#94A3B8',
          }}
        >
          <option value="" disabled>Select department</option>
          {DEPARTMENTS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: '#334155', display: 'block', marginBottom: 4 }}>
          Description
        </label>
        <textarea
          value={data.description}
          onChange={e => onChange({ ...data, description: e.target.value })}
          placeholder="Brief project description (optional)"
          rows={3}
          style={{
            ...inputStyle,
            height: 'auto',
            padding: '8px 12px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Icon + Color */}
      <IconColorPicker
        icon={data.icon}
        color={data.color}
        onIconChange={icon => onChange({ ...data, icon })}
        onColorChange={color => onChange({ ...data, color })}
      />
    </div>
  );
}
