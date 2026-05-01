/**
 * CreateGoalModal — Fix 3: field labels var(--ds-text-subtlest, #94A3B8), Fix 13: section dividers, slider labels, weight helper
 */
import { useState, useEffect, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import { useCreateGoal, useThemes } from '@/hooks/useGoals';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import type { CreateGoalInput, GoalStatus, Priority, BSCPerspective } from '@/types/goals';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const QUARTER_OPTIONS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'];
const BSC_OPTIONS: BSCPerspective[] = ['Financial', 'Customer', 'Internal Process', 'Learning & Growth'];

// Fix 3: All labels var(--ds-text-subtlest, #94A3B8), 10px, uppercase, 600
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--fg-4)', marginBottom: 4, display: 'block',
};
const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--divider)', borderRadius: 6, outline: 'none', color: 'var(--fg-1)', background: 'var(--bg-app)', transition: 'border-color 150ms, box-shadow 150ms' };

export function CreateGoalModal({ isOpen, onClose }: CreateGoalModalProps) {
  const { data: themes = [] } = useThemes();
  const createGoal = useCreateGoal();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [themeId, setThemeId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [status, setStatus] = useState<GoalStatus>('active');
  const [priority, setPriority] = useState<Priority>('high');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [quarter, setQuarter] = useState('');
  const [bsc, setBsc] = useState('');
  const [confidence, setConfidence] = useState(50);
  const [weight, setWeight] = useState('1.0');

  useEffect(() => {
    if (isOpen) {
      setTitle(''); setDescription(''); setThemeId(''); setOwnerId('');
      setStatus('active'); setPriority('high'); setStartDate(''); setTargetDate('');
      setQuarter(''); setBsc(''); setConfidence(50); setWeight('1.0');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!themeId) { toast.error('Theme is required'); return; }

    const input: CreateGoalInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      theme_id: themeId,
      owner_id: ownerId || undefined,
      status,
      priority,
      confidence_level: confidence / 100,
      fiscal_quarter: quarter || undefined,
      bsc_perspective: (bsc as BSCPerspective) || undefined,
      start_date: startDate || undefined,
      target_date: targetDate || undefined,
      weight: parseFloat(weight) || 1.0,
    };

    try {
      await createGoal.mutateAsync(input);
      toast.success('Goal created successfully');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create goal');
    }
  }, [title, description, themeId, ownerId, status, priority, confidence, quarter, bsc, startDate, targetDate, weight, createGoal, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(15,23,42,0.3)', animation: 'fadeIn 200ms ease-out' }} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, maxHeight: '90vh', zIndex: 999,
        background: 'var(--cp-float)', borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
        animation: 'scaleIn 200ms ease-out',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--cp-blue-wash)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={14} color="var(--cp-blue)" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>Create New Goal</span>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
            <X size={18} color="var(--fg-3)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Title <span style={{ color: 'var(--sem-danger)' }}>*</span></label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Achieve 100% Digital Process Migration"
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--cp-blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--divider)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe the goal objectives..."
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
              onFocus={e => { e.target.style.borderColor = 'var(--cp-blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--divider)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Fix 13: Section divider */}
          <div style={{ borderTop: '1px solid var(--cp-bd-zone)', margin: '2px 0' }} />

          {/* Theme + Owner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Parent Theme <span style={{ color: 'var(--sem-danger)' }}>*</span></label>
              <Select value={themeId} onValueChange={setThemeId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select theme..." /></SelectTrigger>
                <SelectContent>
                  {themes.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 4, background: t.color, flexShrink: 0 }} />
                        {t.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={labelStyle}>Owner</label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select owner..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Status</label>
              <Select value={status} onValueChange={v => setStatus(v as GoalStatus)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <Select value={priority} onValueChange={v => setPriority(v as Priority)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="Select date..." style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Target Date</label>
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} placeholder="Select date..." style={inputStyle} />
            </div>
          </div>

          {/* Fix 13: Section divider */}
          <div style={{ borderTop: '1px solid var(--cp-bd-zone)', margin: '2px 0' }} />

          {/* Quarter + BSC */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Fiscal Quarter</label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select quarter..." /></SelectTrigger>
                <SelectContent>
                  {QUARTER_OPTIONS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label style={labelStyle}>BSC Perspective</label>
              <Select value={bsc} onValueChange={setBsc}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select perspective..." /></SelectTrigger>
                <SelectContent>
                  {BSC_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Confidence + Weight */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Confidence Level — {confidence}%</label>
              <Slider value={[confidence]} onValueChange={v => setConfidence(v[0])} min={0} max={100} step={5} className="mt-2" />
              {/* Fix 13: Slider endpoint labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--fg-4)' }}>Low</span>
                <span style={{ fontSize: 10, color: 'var(--fg-4)' }}>High</span>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Weight</label>
              <input
                type="number" step="0.1" min="0.1" max="5" value={weight}
                onChange={e => setWeight(e.target.value)}
                style={inputStyle}
              />
              {/* Fix 13: Weight helper text */}
              <p style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 4, margin: '4px 0 0' }}>Relative importance (0.1 – 5.0)</p>
            </div>
          </div>
        </div>

        {/* Footer — Fix 13: Create button is primary blue */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--divider)' }}>
          <button
            onClick={onClose}
            style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, color: 'var(--fg-3)', background: 'none', border: '1px solid var(--divider)', borderRadius: 6, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createGoal.isPending}
            style={{
              padding: '7px 16px', fontSize: 13, fontWeight: 600, color: 'var(--ds-surface, #FFFFFF)',
              background: createGoal.isPending ? '#93C5FD' : 'var(--cp-blue)',
              border: 'none', borderRadius: 6, cursor: createGoal.isPending ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            {createGoal.isPending ? 'Creating...' : 'Create Goal'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn { from { transform: translate(-50%, -50%) scale(0.95); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}
