/**
 * Detail Tab — Milestones (MARAM V3.1 + Catalyst V11 Carbon Precision)
 * Progress summary, milestone cards, add/edit modal, late detection
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logInitiativeAudit } from '@/lib/initiativeAudit';
import { CheckCircle2, RotateCcw, Pencil, Trash2, Flag, CircleDot, X } from 'lucide-react';

interface DetailTabMilestonesProps {
  requestId: string;
}

const TYPES = ['Phase Gate', 'Deliverable', 'Decision Point', 'External Dependency', 'Event'];
const STATUS_OPTS = ['Not Started', 'In Progress', 'Completed', 'Deferred', 'Missed'];
const STATUS_COLORS: Record<string, string> = {
  completed: 'var(--idp-success-text)',
  'in progress': 'var(--idp-primary)',
  'not started': 'var(--idp-ink-muted)',
  deferred: 'var(--idp-warning-text)',
  missed: 'var(--idp-danger-text)',
};
const statusColor = (s: string) => STATUS_COLORS[s?.toLowerCase()] || 'var(--idp-ink-muted)';
const fmtSAR = (n: number) => `SAR ${n.toLocaleString('en-US')}`;
const TOAST_OPTS = { duration: 2200, style: { background: '#18181B', color: '#fff' } as const, position: 'bottom-center' as const };

/* ── Custom Dropdown (string options) ── */
function CustomSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(!open)} className="idp-form-input"
        style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{value || 'Select…'}</span>
        <span style={{ fontSize: 10, color: 'var(--idp-ink-muted)', marginLeft: 4 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--idp-surface)', border: '1px solid var(--idp-border)', borderRadius: 6, marginTop: 2, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {options.map(opt => (
            <div key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              style={{ padding: '7px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--idp-ink)', background: opt === value ? 'var(--idp-surface-secondary)' : undefined }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--idp-surface-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = opt === value ? 'var(--idp-surface-secondary)' : 'transparent')}>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Id-keyed Dropdown (for FK fields like owner_id) — bulletproof against name collisions ── */
function IdSelect({ value, options, placeholder, onChange }: { value: string; options: { id: string; label: string }[]; placeholder: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const display = options.find(o => o.id === value)?.label || placeholder;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(!open)} className="idp-form-input"
        style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{display}</span>
        <span style={{ fontSize: 10, color: 'var(--idp-ink-muted)', marginLeft: 4 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--idp-surface)', border: '1px solid var(--idp-border)', borderRadius: 6, marginTop: 2, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div onClick={() => { onChange(''); setOpen(false); }}
            style={{ padding: '7px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--idp-ink-muted)', background: value === '' ? 'var(--idp-surface-secondary)' : undefined }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--idp-surface-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = value === '' ? 'var(--idp-surface-secondary)' : 'transparent')}>
            {placeholder}
          </div>
          {options.map(opt => (
            <div key={opt.id} onClick={() => { onChange(opt.id); setOpen(false); }}
              style={{ padding: '7px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--idp-ink)', background: opt.id === value ? 'var(--idp-surface-secondary)' : undefined }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--idp-surface-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = opt.id === value ? 'var(--idp-surface-secondary)' : 'transparent')}>
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export const DetailTabMilestones: React.FC<DetailTabMilestonesProps> = ({ requestId }) => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', type: 'Phase Gate', planned_date: '', owner_id: '',
    budget_release: '', is_critical_path: false,
  });

  const { data: milestones = [], refetch } = useQuery({
    queryKey: ['idp-milestones', requestId],
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_request_milestones')
        .select('*, owner:profiles!owner_id(id, full_name)')
        .eq('request_id', requestId)
        .order('planned_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['idp-profiles-milestones'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      return data || [];
    },
    staleTime: 60_000,
  });

  const counts = useMemo(() => {
    const c = { completed: 0, active: 0, upcoming: 0 };
    milestones.forEach((m: any) => {
      const s = m.status?.toLowerCase();
      if (s === 'completed') c.completed++;
      else if (s === 'in progress') c.active++;
      else c.upcoming++;
    });
    return c;
  }, [milestones]);

  const isLate = (m: any) => m.actual_date && m.planned_date && m.actual_date > m.planned_date;

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', description: '', type: 'Phase Gate', planned_date: '', owner_id: '', budget_release: '', is_critical_path: false });
    setShowModal(true);
  };
  const openEdit = (m: any) => {
    setEditing(m);
    setForm({
      title: m.title || '', description: m.description || '',
      type: TYPES.find(t => t.toLowerCase().replace(/ /g, '_') === m.type?.toLowerCase()) || m.type || 'Phase Gate',
      planned_date: m.planned_date?.slice(0, 10) || '', owner_id: m.owner_id || '',
      budget_release: String(m.budget_release || ''), is_critical_path: !!m.is_critical_path,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.planned_date) return;
    const payload: any = {
      request_id: requestId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      type: form.type.toLowerCase().replace(/ /g, '_'),
      planned_date: form.planned_date,
      owner_id: form.owner_id || null,
      budget_release: form.budget_release ? parseFloat(form.budget_release) : 0,
      is_critical_path: form.is_critical_path,
    };
    if (editing) {
      const { error } = await typedQuery('ph_request_milestones').update(payload).eq('id', editing.id);
      if (error) { toast.error('Failed to update'); return; }
      logInitiativeAudit({ request_id: requestId, action: 'updated', entity_type: 'milestone', entity_id: editing.id, field_name: 'milestone', new_value: form.title });
      // Silent auto-save
    } else {
      payload.status = 'not_started';
      payload.sort_order = milestones.length + 1;
      payload.created_by = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await typedQuery('ph_request_milestones').insert(payload);
      if (error) { toast.error('Failed to add'); return; }
      logInitiativeAudit({ request_id: requestId, action: 'created', entity_type: 'milestone', new_value: form.title });
      toast.success('Milestone added', TOAST_OPTS);
    }
    setShowModal(false);
    refetch();
    queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
  };

  const handleComplete = async (m: any) => {
    await typedQuery('ph_request_milestones').update({
      status: 'completed', actual_date: new Date().toISOString().slice(0, 10),
    }).eq('id', m.id);
    logInitiativeAudit({ request_id: requestId, action: 'completed', entity_type: 'milestone', entity_id: m.id, new_value: m.title });
    toast.success(`${m.title} completed`, TOAST_OPTS);
    refetch();
  };
  const handleReopen = async (m: any) => {
    await typedQuery('ph_request_milestones').update({
      status: 'in_progress', actual_date: null,
    }).eq('id', m.id);
    logInitiativeAudit({ request_id: requestId, action: 'reopened', entity_type: 'milestone', entity_id: m.id, new_value: m.title });
    toast.success(`${m.title} reopened`, TOAST_OPTS);
    refetch();
  };
  const handleDelete = async (m: any) => {
    await typedQuery('ph_request_milestones').delete().eq('id', m.id);
    logInitiativeAudit({ request_id: requestId, action: 'deleted', entity_type: 'milestone', entity_id: m.id, new_value: m.title });
    toast.success('Milestone deleted', TOAST_OPTS);
    refetch();
    queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', deferred: 'Deferred', missed: 'Missed' };
    return map[s?.toLowerCase()] || s || 'Not Started';
  };
  const typeLabel = (t: string) => {
    const map: Record<string, string> = { phase_gate: 'Phase Gate', deliverable: 'Deliverable', decision_point: 'Decision Point', external_dependency: 'External Dependency', event: 'Event' };
    return map[t?.toLowerCase()] || t || '';
  };

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* M1 — Progress Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--idp-success-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={12} /> {counts.completed} Completed
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--idp-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <CircleDot size={12} /> {counts.active} Active
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--idp-ink-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          ○ {counts.upcoming} Upcoming
        </span>
      </div>

      {/* M2 — Milestone Cards */}
      {milestones.length === 0 ? (
        <div style={{ border: '1px solid var(--idp-border)', borderRadius: 8, padding: '40px 20px', textAlign: 'center' }}>
          <Flag size={28} style={{ margin: '0 auto 8px', color: 'var(--idp-ink-tertiary)' }} />
          <div style={{ fontSize: 13, color: 'var(--idp-ink-tertiary)' }}>No milestones yet</div>
        </div>
      ) : milestones.map((m: any) => {
        const sc = statusColor(statusLabel(m.status));
        const late = isLate(m);
        return (
          <div key={m.id}
            onMouseEnter={() => setHoveredCard(m.id)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 8,
              border: '1px solid var(--idp-border)', borderLeft: `3px solid ${sc}`, alignItems: 'flex-start',
            }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Row 1: title + badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--idp-ink)' }}>{m.title}</span>
                {m.is_critical_path && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: '#FEE2E2' }}>
                    <Flag size={9} style={{ color: '#D92525' }} />
                  </span>
                )}
                <span style={{
                  fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 4,
                  background: 'var(--idp-surface-tertiary)', color: 'var(--idp-ink-muted-strong)',
                }}>{typeLabel(m.type)}</span>
              </div>
              {/* Row 2: description */}
              {m.description && <div style={{ fontSize: 12, color: 'var(--idp-ink-secondary)', marginBottom: 4 }}>{m.description}</div>}
              {/* Row 3: dates + budget */}
              <div style={{ display: 'flex', gap: 16, fontSize: 11, fontFamily: 'var(--idp-font-mono)', color: 'var(--idp-ink-tertiary)', flexWrap: 'wrap' }}>
                <span>Plan: {m.planned_date?.slice(0, 10)}</span>
                {m.actual_date && (
                  <span style={{ color: late ? 'var(--idp-danger)' : 'var(--idp-success)' }}>
                    Actual: {m.actual_date.slice(0, 10)}
                  </span>
                )}
                {(m.budget_release || 0) > 0 && (
                  <span style={{ color: 'var(--idp-primary)' }}>Budget: {fmtSAR(m.budget_release)}</span>
                )}
                {m.owner?.full_name && (
                  <span style={{ color: 'var(--idp-ink-muted)' }}>Owner: {m.owner.full_name}</span>
                )}
              </div>
            </div>
            {/* Status badge */}
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 9999, whiteSpace: 'nowrap', flexShrink: 0,
              background: `color-mix(in srgb, ${sc} 14%, transparent)`, color: sc,
            }}>{statusLabel(m.status)}</span>
            {/* Hover actions */}
            <div style={{ display: 'flex', gap: 2, opacity: hoveredCard === m.id ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
              {m.status?.toLowerCase() !== 'completed' ? (
                <button onClick={() => handleComplete(m)} className="idp-hover-action-btn" title="Complete"><CheckCircle2 size={14} /></button>
              ) : (
                <button onClick={() => handleReopen(m)} className="idp-hover-action-btn" title="Reopen"><RotateCcw size={14} /></button>
              )}
              <button onClick={() => openEdit(m)} className="idp-hover-action-btn" title="Edit"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(m)} className="idp-hover-action-btn" title="Delete"><Trash2 size={14} /></button>
            </div>
          </div>
        );
      })}

      {/* M3 — Add Button */}
      <button className="idp-add-btn" onClick={openAdd}>+ Add Milestone</button>

      {/* M4 — Add/Edit Modal */}
      {showModal && createPortal(
        <div data-module="request-detail-panel">
        <div className="idp-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="idp-modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
            <div className="idp-modal-header">
              <h3 className="idp-modal-title">{editing ? 'Edit Milestone' : 'Add Milestone'}</h3>
              <button className="idp-modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="idp-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="idp-form-field" style={{ marginBottom: 0 }}>
                <label className="idp-form-label">Title <span className="idp-form-required">*</span></label>
                <input className="idp-form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Milestone title…" />
              </div>
              <div className="idp-form-field" style={{ marginBottom: 0 }}>
                <label className="idp-form-label">Description</label>
                <textarea className="idp-form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details…" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="idp-form-field" style={{ marginBottom: 0 }}>
                  <label className="idp-form-label">Type</label>
                  <CustomSelect value={form.type} options={TYPES} onChange={v => setForm(f => ({ ...f, type: v }))} />
                </div>
                <div className="idp-form-field" style={{ marginBottom: 0 }}>
                  <label className="idp-form-label">Planned Date <span className="idp-form-required">*</span></label>
                  <input className="idp-form-input" type="date" value={form.planned_date} onChange={e => setForm(f => ({ ...f, planned_date: e.target.value }))}
                    style={{ fontFamily: 'var(--idp-font-mono)', color: 'var(--idp-ink)' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="idp-form-field" style={{ marginBottom: 0 }}>
                  <label className="idp-form-label">Owner</label>
                  <IdSelect
                    value={form.owner_id}
                    placeholder="Unassigned"
                    options={profiles.map((p: any) => ({ id: p.id, label: p.full_name || p.email || p.id }))}
                    onChange={(id) => setForm(f => ({ ...f, owner_id: id }))}
                  />
                </div>
                <div className="idp-form-field" style={{ marginBottom: 0 }}>
                  <label className="idp-form-label">Budget Release (SAR)</label>
                  <input className="idp-form-input" type="number" value={form.budget_release} onChange={e => setForm(f => ({ ...f, budget_release: e.target.value }))} placeholder="0" />
                </div>
              </div>
              {/* Critical Path Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" onClick={() => setForm(f => ({ ...f, is_critical_path: !f.is_critical_path }))}
                  style={{
                    width: 20, height: 20, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: form.is_critical_path ? '1.5px solid var(--idp-danger)' : '1.5px solid var(--idp-border)',
                    background: form.is_critical_path ? 'var(--idp-danger-bg)' : 'var(--idp-surface)',
                    cursor: 'pointer',
                  }}>
                  {form.is_critical_path && <Flag size={10} style={{ color: '#D92525' }} />}
                </button>
                <span style={{ fontSize: 12, color: 'var(--idp-ink-secondary)' }}>Critical Path</span>
              </div>
            </div>
            <div className="idp-modal-footer">
              <button className="idp-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="idp-btn-primary" onClick={handleSave} disabled={!form.title.trim() || !form.planned_date}>
                {editing ? 'Update' : 'Add Milestone'}
              </button>
            </div>
          </div>
        </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DetailTabMilestones;
