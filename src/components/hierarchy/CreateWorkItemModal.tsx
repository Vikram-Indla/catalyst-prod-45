/**
 * CreateWorkItemModal — Two-step: type selection → details form
 * Stage D: Full DB wiring with toast feedback, priorities/statuses from DB
 */

import { useState, useRef, useEffect } from 'react';
import { X, ArrowLeft, ChevronDown } from 'lucide-react';
import { HIERARCHY_LEVELS, canBeParentOf } from '@/types/hierarchy';
import type { WorkItem, HierarchyLevel } from '@/types/hierarchy';
import { useCreateWorkItem, useStatuses, usePriorities } from '@/hooks/useHierarchy';
import { toast } from 'sonner';

interface CreateWorkItemModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  parentItem?: WorkItem | null;
}

function PriorityBarsInline({ level }: { level: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center', marginRight: 6 }}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} style={{ display: 'inline-block', width: 10, height: 3, borderRadius: 1, background: i <= level ? 'var(--fg-3)' : 'var(--divider)' }} />
      ))}
    </span>
  );
}

function priorityToLevel(name: string): number {
  const n = name.toLowerCase();
  if (n === 'critical') return 4;
  if (n === 'high') return 3;
  if (n === 'medium') return 2;
  if (n === 'low') return 1;
  return 0;
}

/* ── Custom dropdown ── */
function CustomSelect({
  value, options, onChange, placeholder, renderOption,
}: {
  value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void; placeholder: string;
  renderOption?: (opt: { value: string; label: string }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((p) => !p)}
        style={{ width: '100%', height: 50, padding: '8px 12px', fontSize: 14, fontFamily: 'var(--cp-font-body)', color: selected ? '#0F172A' : '#94A3B8', background: 'var(--cp-float)', border: '1.5px solid var(--divider)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
        <span>{selected ? (renderOption ? renderOption(selected) : selected.label) : placeholder}</span>
        <ChevronDown size={14} color="var(--fg-3)" />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--cp-float)', border: '1px solid var(--divider)', borderRadius: 6, zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
          {options.map((opt) => (
            <div key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', background: opt.value === value ? 'var(--cp-primary-5)' : undefined, fontFamily: 'var(--cp-font-body)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = opt.value === value ? '#EFF6FF' : '')}>
              {renderOption ? renderOption(opt) : opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CreateWorkItemModal({ open, onClose, projectId, parentItem }: CreateWorkItemModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedLevel, setSelectedLevel] = useState<HierarchyLevel | null>(null);
  const [title, setTitle] = useState('');
  const [priorityId, setPriorityId] = useState('');
  const [description, setDescription] = useState('');

  const { data: statuses = [] } = useStatuses(projectId);
  const { data: priorities = [] } = usePriorities();
  const createMutation = useCreateWorkItem(projectId);

  useEffect(() => {
    if (open) {
      setStep(parentItem ? 2 : 1);
      setTitle(''); setPriorityId(''); setDescription('');
      if (parentItem) {
        const childLevel = HIERARCHY_LEVELS.find((l) => canBeParentOf(parentItem.hierarchyLevel, l.id));
        setSelectedLevel(childLevel || null);
      } else {
        setSelectedLevel(null);
      }
    }
  }, [open, parentItem]);

  if (!open) return null;

  const availableLevels = parentItem
    ? HIERARCHY_LEVELS.filter((l) => canBeParentOf(parentItem.hierarchyLevel, l.id))
    : HIERARCHY_LEVELS;

  // Find default status (is_default or first "To Do" or just first)
  const defaultStatus = (statuses as any[]).find((s: any) => s.is_default)
    || (statuses as any[]).find((s: any) => s.name === 'To Do')
    || (statuses as any[])[0];

  const handleCreate = async () => {
    if (!title.trim() || !selectedLevel || !defaultStatus) return;
    try {
      const result = await createMutation.mutateAsync({
        title: title.trim(),
        hierarchyLevel: selectedLevel.id,
        parentId: parentItem?.id,
        statusId: defaultStatus.id,
        priorityId: priorityId || undefined,
      });
      const key = (result as any)?.key || selectedLevel.name;
      toast.success(`${key} created`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create work item');
      // Keep modal open for retry
    }
  };

  // Priority options from DB
  const priorityOptions = (priorities as any[])
    .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((p: any) => ({ value: p.id, label: p.name }));

  const placeholder = selectedLevel?.name === 'Story'
    ? 'As a [user], I want [feature], so that [benefit]'
    : `Enter ${selectedLevel?.name || 'work item'} title`;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--cp-float)', borderRadius: 8, border: '1px solid var(--divider)', fontFamily: 'var(--cp-font-body)', maxHeight: '90vh', overflow: 'auto' }}>
        {/* STEP 1 — Type Selection */}
        {step === 1 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--divider)' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)' }}>Create Work Item</span>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} color="var(--fg-3)" />
              </button>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {availableLevels.map((level) => (
                <div key={level.id} onClick={() => { setSelectedLevel(level); setStep(2); }} className="hi-type-card"
                  style={{ padding: 16, border: '1.5px solid var(--divider)', borderRadius: 8, cursor: 'pointer', transition: 'all 150ms ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: level.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>{level.name}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--fg-3)', margin: 0 }}>
                    {level.name === 'Epic' && 'Large body of work spanning multiple features'}
                    {level.name === 'Feature' && 'A distinct capability or feature set'}
                    {level.name === 'Story' && 'A user-facing piece of functionality'}
                    {level.name === 'Sub-task' && 'A granular task within a story'}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* STEP 2 — Details Form */}
        {step === 2 && selectedLevel && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid var(--divider)' }}>
              {!parentItem && (
                <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                  <ArrowLeft size={18} color="var(--fg-3)" />
                </button>
              )}
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: selectedLevel.color }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)' }}>Create {selectedLevel.name}</span>
              <div style={{ flex: 1 }} />
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} color="var(--fg-3)" />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {parentItem && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-3)', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Parent</label>
                  <div style={{ height: 50, padding: '8px 12px', background: '#FAFAFA', border: '1.5px solid var(--divider)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg-1)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: parentItem.hierarchyColor }} />
                    <span style={{ fontWeight: 500, color: 'var(--cp-blue)', fontSize: 12 }}>{parentItem.key}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parentItem.title}</span>
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-3)', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  Title <span style={{ color: 'var(--sem-danger)' }}>*</span>
                </label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholder} autoFocus
                  style={{ width: '100%', height: 50, padding: '8px 12px', fontSize: 14, fontFamily: 'var(--cp-font-body)', border: '1.5px solid var(--divider)', borderRadius: 6, outline: 'none', boxSizing: 'border-box', transition: 'border-color 150ms, box-shadow 150ms' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--cp-blue)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--divider)'; e.currentTarget.style.boxShadow = 'none'; }} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-3)', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Priority</label>
                <CustomSelect value={priorityId} options={priorityOptions} onChange={setPriorityId} placeholder="Select priority"
                  renderOption={(opt) => (
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <PriorityBarsInline level={priorityToLevel(opt.label)} /> {opt.label}
                    </span>
                  )} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-3)', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Add a description..."
                  style={{ width: '100%', padding: 12, fontSize: 14, fontFamily: 'var(--cp-font-body)', border: '1.5px solid var(--divider)', borderRadius: 6, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--cp-blue)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--divider)'; e.currentTarget.style.boxShadow = 'none'; }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', background: '#FAFAFA', borderTop: '1px solid var(--divider)', borderRadius: '0 0 8px 8px' }}>
              {!parentItem && (
                <button onClick={() => setStep(1)} style={{ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 600, color: 'var(--fg-2)', background: 'var(--cp-float)', border: '1px solid var(--divider)', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--cp-font-body)' }}>
                  Back
                </button>
              )}
              <button onClick={handleCreate} disabled={!title.trim() || createMutation.isPending}
                style={{ height: 32, padding: '0 16px', fontSize: 13, fontWeight: 600, color: '#FFFFFF', background: !title.trim() ? 'var(--fg-4)' : 'var(--cp-blue)', border: 'none', borderRadius: 6, cursor: !title.trim() ? 'not-allowed' : 'pointer', fontFamily: 'var(--cp-font-body)', opacity: createMutation.isPending ? 0.7 : 1 }}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </>
        )}

        <style>{`
          .hi-type-card:hover { border-color: var(--cp-blue) !important; background: var(--cp-primary-5) !important; }
        `}</style>
      </div>
    </div>
  );
}
