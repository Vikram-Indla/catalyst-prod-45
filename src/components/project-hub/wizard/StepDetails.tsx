import { useState, useEffect, useRef } from 'react';
import { Check, X, ChevronDown, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
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
  lead_id: string;
  linkJira: boolean;
  jiraKey: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | '';
}

const PRIORITY_OPTIONS: Array<{ value: 'critical' | 'high' | 'medium' | 'low'; label: string }> = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

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

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function StepDetails({ data, onChange, isValid, onValidChange }: StepDetailsProps) {
  const [keyManual, setKeyManual] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'checking' | 'available' | 'taken' | null>(null);
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [leadFilter, setLeadFilter] = useState('');
  const leadRef = useRef<HTMLDivElement>(null);

  // Profiles for lead picker
  const { data: profiles } = useQuery({
    queryKey: ['ph-profiles-lead-picker'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('approval_status', 'APPROVED')
        .order('full_name', { ascending: true });
      return (data || []).map(p => ({
        id: p.id,
        display_name: p.full_name || 'Unknown',
        avatar_url: p.avatar_url,
        role: p.role,
      }));
    },
  });

  const selectedLead = profiles?.find(p => p.id === data.lead_id);

  // Close lead picker on outside click
  useEffect(() => {
    if (!showLeadPicker) return;
    const handler = (e: MouseEvent) => {
      if (leadRef.current && !leadRef.current.contains(e.target as Node)) setShowLeadPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLeadPicker]);

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
      const { data: existing } = await supabase
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
    padding: '8px 12px',
    fontSize: 13,
    color: 'var(--fg-1)',
    border: '1px solid var(--divider)',
    borderRadius: 6,
    outline: 'none',
    fontFamily: 'var(--cp-font-body)',
  };

  const inputClassName = 'bg-[var(--cp-float)]';

  const filteredProfiles = profiles?.filter(p =>
    p.display_name.toLowerCase().includes(leadFilter.toLowerCase())
  ) || [];

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', display: 'block', marginBottom: 4 }}>
          Project Name <span style={{ color: 'var(--sem-danger)' }}>*</span>
        </label>
        <input
          value={data.name}
          onChange={e => onChange({ ...data, name: e.target.value })}
          placeholder="e.g. Digital Transformation Platform"
          className={inputClassName}
          style={inputStyle}
        />
      </div>

      {/* Key */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', display: 'block', marginBottom: 4 }}>
          Project Key <span style={{ color: 'var(--sem-danger)' }}>*</span>
        </label>
        <div className="relative">
          <input
            value={data.key}
            onChange={e => {
              setKeyManual(true);
              onChange({ ...data, key: e.target.value.toUpperCase().slice(0, 6) });
            }}
            placeholder="AUTO"
            className={inputClassName}
            style={{
              ...inputStyle,
              fontFamily: 'var(--cp-font-mono)',
              letterSpacing: '0.05em',
              paddingRight: 36,
            }}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {keyStatus === 'checking' && (
              <div className="animate-spin rounded-full" style={{ width: 14, height: 14, border: '2px solid var(--divider)', borderTopColor: 'var(--cp-blue)' }} />
            )}
            {keyStatus === 'available' && <Check size={16} color="var(--sem-success)" strokeWidth={2.5} />}
            {keyStatus === 'taken' && <X size={16} color="var(--sem-danger)" strokeWidth={2.5} />}
          </div>
        </div>
        {keyStatus === 'taken' && (
          <span style={{ fontSize: 11, color: 'var(--sem-danger)', marginTop: 2, display: 'block' }}>
            This key is already in use
          </span>
        )}
      </div>

      {/* Department */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', display: 'block', marginBottom: 4 }}>
          Department <span style={{ color: 'var(--sem-danger)' }}>*</span>
        </label>
        <input
          value={data.department}
          onChange={e => onChange({ ...data, department: e.target.value })}
          placeholder="e.g. Mining, Digital Operations"
          className={inputClassName}
          style={inputStyle}
        />
      </div>

      {/* Priority */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', display: 'block', marginBottom: 4 }}>
          Priority
        </label>
        <div className="grid grid-cols-4 gap-2">
          {PRIORITY_OPTIONS.map(opt => {
            const selected = data.priority === opt.value;
            const colorMap: Record<string, { bg: string; text: string; border: string }> = {
              critical: { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
              high:     { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
              medium:   { bg: '#FEFCE8', text: '#A16207', border: '#FEF08A' },
              low:      { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
            };
            const c = colorMap[opt.value];
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, priority: selected ? '' : opt.value })}
                style={{
                  height: 36,
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  background: selected ? c.bg : 'transparent',
                  color: selected ? c.text : 'var(--fg-2)',
                  border: `1px solid ${selected ? c.border : 'var(--divider)'}`,
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lead Picker */}
      <div ref={leadRef} className="relative">
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', display: 'block', marginBottom: 4 }}>
          Project Lead
        </label>
        <button
          type="button"
          onClick={() => setShowLeadPicker(!showLeadPicker)}
          className={`flex items-center justify-between w-full text-left ${inputClassName}`}
          style={{
            ...inputStyle,
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            gap: 8,
          }}
        >
          {selectedLead ? (
            <div className="flex items-center gap-2 min-w-0">
              {selectedLead.avatar_url ? (
                <img src={selectedLead.avatar_url} alt="" className="rounded-full" style={{ width: 22, height: 22, objectFit: 'cover' }} />
              ) : (
                <div className="rounded-full flex items-center justify-center shrink-0 bg-[var(--bd-default, #E2E8F0)] dark:bg-[#292929]" style={{ width: 22, height: 22, fontSize: 9, fontWeight: 700, color: '#475569' }}>
                  {getInitials(selectedLead.display_name)}
                </div>
              )}
              <span className="truncate" style={{ fontSize: 13, color: 'var(--fg-1)' }}>{selectedLead.display_name}</span>
            </div>
          ) : (
            <span style={{ color: 'var(--fg-4)', fontSize: 13 }}>Select project lead...</span>
          )}
          <ChevronDown size={14} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
        </button>

        {showLeadPicker && (
          <div
            className="absolute left-0 right-0 z-50 bg-white dark:bg-[#1A1A1A] border border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E] rounded-lg shadow-lg"
            style={{ top: '100%', marginTop: 4, maxHeight: 260, display: 'flex', flexDirection: 'column' }}
          >
            <div className="p-2 border-b border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E]">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  autoFocus
                  value={leadFilter}
                  onChange={e => setLeadFilter(e.target.value)}
                  placeholder="Search people..."
                  className="w-full text-[13px] pl-8 pr-3 py-1.5 rounded border border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E] bg-transparent outline-none"
                  style={{ height: 32, color: 'var(--fg-1)' }}
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-1" style={{ maxHeight: 200 }}>
              {filteredProfiles.length === 0 ? (
                <div className="text-center py-4" style={{ fontSize: 12, color: 'var(--fg-3)' }}>No results</div>
              ) : (
                filteredProfiles.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { onChange({ ...data, lead_id: p.id }); setShowLeadPicker(false); setLeadFilter(''); }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-md text-sm hover:bg-[#F1F5F9] dark:hover:bg-[#1F1F1F] w-full text-left"
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="rounded-full" style={{ width: 24, height: 24, objectFit: 'cover' }} />
                    ) : (
                      <div className="rounded-full flex items-center justify-center shrink-0 bg-[var(--bd-default, #E2E8F0)] dark:bg-[#292929]" style={{ width: 24, height: 24, fontSize: 9, fontWeight: 700, color: '#475569' }}>
                        {getInitials(p.display_name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)' }}>{p.display_name}</div>
                      <div className="truncate" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{p.role || 'Team Member'}</div>
                    </div>
                    {p.id === data.lead_id && <Check size={14} className="ml-auto text-[#2563EB]" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', display: 'block', marginBottom: 4 }}>
          Description
        </label>
        <textarea
          value={data.description}
          onChange={e => onChange({ ...data, description: e.target.value })}
          placeholder="Brief project description (optional)"
          rows={3}
          className={inputClassName}
          style={{
            ...inputStyle,
            height: 'auto',
            padding: '8px 12px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Jira Link Toggle */}
      <div className="rounded-lg border border-[var(--bd-default, #E2E8F0)] dark:border-[#2E2E2E] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>Link to Jira project</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>Enable bi-directional sync with an existing Jira project</div>
          </div>
          <Switch
            checked={data.linkJira}
            onCheckedChange={v => onChange({ ...data, linkJira: v })}
          />
        </div>
        {data.linkJira && (
          <div className="mt-3">
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', display: 'block', marginBottom: 4 }}>
              Jira Project Key
            </label>
            <input
              value={data.jiraKey}
              onChange={e => onChange({ ...data, jiraKey: e.target.value.toUpperCase() })}
              placeholder="e.g. DTI"
              className={inputClassName}
              style={{
                ...inputStyle,
                fontFamily: 'var(--cp-font-mono)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            />
          </div>
        )}
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
