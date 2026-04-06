/**
 * Detail Tab — Risks (MARAM V3.1 + Catalyst V11 Carbon Precision)
 * Severity chips, 5×5 heat map, risk cards, add/edit modal
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logInitiativeAudit } from '@/lib/initiativeAudit';
import { getInitialsFromName, hashColor } from '@/types/producthub/initiative';
import { Pencil, Trash2, Shield, X } from 'lucide-react';

/* ── Custom Dropdown (no native <select>) ── */
function CustomSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(!open)} className="idp-form-input" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{value}</span>
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

interface DetailTabRisksProps {
  initiativeId: string;
}

const CATEGORIES = ['Technical', 'Financial', 'Resource', 'Schedule', 'Scope', 'External', 'Compliance', 'Organizational'];
const STATUS_OPTS = ['Open', 'Mitigating', 'Mitigated', 'Accepted', 'Closed', 'Occurred'];

function sevColor(score: number) {
  if (score >= 20) return 'var(--idp-danger)';
  if (score >= 12) return 'var(--idp-warning)';
  if (score >= 5) return 'var(--idp-primary)';
  return 'var(--idp-success)';
}
function sevLabel(score: number) {
  if (score >= 20) return 'Critical';
  if (score >= 12) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
}
function cellBg(score: number) {
  if (score >= 20) return '#FEE2E2';
  if (score >= 12) return '#FEF3C7';
  if (score >= 5) return '#DBEAFE';
  return '#DCFCE7';
}

export const DetailTabRisks: React.FC<DetailTabRisksProps> = ({ initiativeId }) => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingRisk, setEditingRisk] = useState<any>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Technical', status: 'Open',
    probability: 3, impact: 3, mitigation_plan: '', contingency_plan: '',
  });

  const { data: risks = [], refetch } = useQuery({
    queryKey: ['idp-risks', initiativeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ph_initiative_risks')
        .select('*, owner:profiles!owner_id(id, full_name)')
        .eq('initiative_id', initiativeId)
        .order('risk_score', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const sevCounts = useMemo(() => {
    const c = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    risks.forEach((r: any) => { c[sevLabel(r.risk_score || 0) as keyof typeof c]++; });
    return c;
  }, [risks]);

  const liveScore = form.probability * form.impact;

  const openAdd = () => {
    setEditingRisk(null);
    setForm({ title: '', description: '', category: 'Technical', status: 'Open', probability: 3, impact: 3, mitigation_plan: '', contingency_plan: '' });
    setShowModal(true);
  };
  const openEdit = (r: any) => {
    setEditingRisk(r);
    setForm({
      title: r.title || '', description: r.description || '',
      category: (r.category || 'technical').charAt(0).toUpperCase() + (r.category || 'technical').slice(1),
      status: (r.status || 'open').charAt(0).toUpperCase() + (r.status || 'open').slice(1),
      probability: r.probability || 3, impact: r.impact || 3,
      mitigation_plan: r.mitigation_plan || '', contingency_plan: r.contingency_plan || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const payload: any = {
      initiative_id: initiativeId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category.toLowerCase(),
      status: form.status.toLowerCase(),
      probability: form.probability,
      impact: form.impact,
      risk_score: form.probability * form.impact,
      mitigation_plan: form.mitigation_plan.trim() || null,
      contingency_plan: form.contingency_plan.trim() || null,
    };
    if (editingRisk) {
      const { error } = await (supabase as any).from('ph_initiative_risks').update(payload).eq('id', editingRisk.id);
      if (error) { toast.error('Failed to update'); return; }
      logInitiativeAudit({ initiative_id: initiativeId, action: 'updated', entity_type: 'risk', entity_id: editingRisk.id, new_value: form.title });
      // Silent auto-save
    } else {
      // Generate key
      const maxKey = risks.reduce((max: number, r: any) => {
        const num = parseInt(r.risk_key?.replace('RSK-', '') || '0');
        return num > max ? num : max;
      }, 0);
      payload.risk_key = `RSK-${String(maxKey + 1).padStart(3, '0')}`;
      payload.created_by = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await (supabase as any).from('ph_initiative_risks').insert(payload);
      if (error) { toast.error('Failed to add'); return; }
      logInitiativeAudit({ initiative_id: initiativeId, action: 'created', entity_type: 'risk', new_value: form.title });
      toast.success(`${payload.risk_key} created`, { duration: 2200, style: { background: '#18181B', color: '#fff' }, position: 'bottom-center' });
    }
    setShowModal(false);
    refetch();
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from('ph_initiative_risks').delete().eq('id', id);
    logInitiativeAudit({ initiative_id: initiativeId, action: 'deleted', entity_type: 'risk', entity_id: id });
    toast.success('Risk deleted', { duration: 2200, style: { background: '#18181B', color: '#fff' }, position: 'bottom-center' });
    refetch();
  };

  // Risks by cell
  const risksByCell = useMemo(() => {
    const map: Record<string, any[]> = {};
    risks.forEach((r: any) => {
      const key = `${r.probability}-${r.impact}`;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [risks]);

  return (
    <div className="idp-risks">
      {/* R1 — Severity Chips */}
      <div className="idp-severity-chips">
        {([
          { label: 'Critical', color: 'var(--idp-danger)' },
          { label: 'High', color: 'var(--idp-warning)' },
          { label: 'Medium', color: 'var(--idp-primary)' },
          { label: 'Low', color: 'var(--idp-success)' },
        ] as const).map(({ label, color }) => (
          <div key={label} className="idp-severity-chip" style={{
            background: `color-mix(in srgb, ${color} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 15%, transparent)`,
          }}>
            <div className="idp-severity-dot" style={{ background: color }} />
            <span className="idp-severity-label" style={{ color }}>{label}</span>
            <span className="idp-severity-count" style={{ color }}>{sevCounts[label]}</span>
          </div>
        ))}
      </div>

      {/* R2 — 5×5 Heat Map */}
      <div style={{ border: '1px solid var(--idp-border)', borderRadius: 8, padding: 16 }}>
        <div className="idp-form-label" style={{ marginBottom: 8 }}>Risk Heat Map — Probability × Impact</div>
        <div style={{ display: 'grid', gridTemplateColumns: '24px repeat(5, 1fr)', gap: 3 }}>
          {/* Y-axis labels + cells */}
          {[5, 4, 3, 2, 1].map(prob => (
            <React.Fragment key={prob}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--idp-ink-tertiary)', fontFamily: 'var(--idp-font-mono)', fontWeight: 600 }}>
                {prob}
              </div>
              {[1, 2, 3, 4, 5].map(imp => {
                const score = prob * imp;
                const cellRisks = risksByCell[`${prob}-${imp}`] || [];
                return (
                  <div key={`${prob}-${imp}`}
                    style={{ height: 50, background: cellBg(score), borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, flexWrap: 'wrap', cursor: cellRisks.length > 0 ? 'pointer' : undefined }}
                    onClick={() => { if (cellRisks.length > 0) openEdit(cellRisks[0]); }}>
                    {cellRisks.map((r: any) => (
                      <div key={r.id} title={`${r.risk_key}: ${r.title}`} style={{
                        width: 12, height: 12, borderRadius: '50%', background: sevColor(r.risk_score || 0),
                        border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      }} />
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
          {/* X-axis labels */}
          <div />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, color: 'var(--idp-ink-tertiary)', fontFamily: 'var(--idp-font-mono)', fontWeight: 600 }}>{i}</div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--idp-ink-tertiary)' }}>↑ Probability</span>
          <span style={{ fontSize: 10, color: 'var(--idp-ink-tertiary)' }}>Impact →</span>
        </div>
      </div>

      {/* R3 — Risk Cards */}
      {risks.length === 0 ? (
        <div style={{ border: '1px solid var(--idp-border)', borderRadius: 8, padding: '40px 20px', textAlign: 'center' }}>
          <Shield size={28} style={{ margin: '0 auto 8px', color: 'var(--idp-ink-tertiary)' }} />
          <div style={{ fontSize: 13, color: 'var(--idp-ink-tertiary)' }}>No risks identified</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {risks.map((r: any) => {
            const sc = r.risk_score || 0;
            const sColor = sevColor(sc);
            return (
              <div key={r.id}
                onMouseEnter={() => setHoveredCard(r.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  border: '1px solid var(--idp-border)', borderRadius: 8, borderLeft: `3px solid ${sColor}`,
                }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: sColor, fontFamily: 'var(--idp-font-mono)', minWidth: 60 }}>{r.risk_key}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--idp-ink)' }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--idp-ink-muted)' }}>
                    {(r.category || '').charAt(0).toUpperCase() + (r.category || '').slice(1)}
                    {r.owner?.full_name ? ` · ${r.owner.full_name}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: sColor, fontFamily: 'var(--idp-font-mono)', minWidth: 28, textAlign: 'center' }}>{sc}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
                  background: `color-mix(in srgb, ${sColor} 14%, transparent)`, color: sColor,
                }}>{sevLabel(sc)}</span>
                <div style={{ display: 'flex', gap: 2, opacity: hoveredCard === r.id ? 1 : 0, transition: 'opacity 0.15s' }}>
                  <button onClick={() => openEdit(r)} className="idp-hover-action-btn"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(r.id)} className="idp-hover-action-btn"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Button */}
      <button className="idp-add-btn" onClick={openAdd}>+ Add Risk</button>

      {/* R4 — Add/Edit Modal */}
      {showModal && createPortal(
        <div data-module="initiative-detail-panel">
        <div className="idp-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="idp-modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
            <div className="idp-modal-header">
              <h3 className="idp-modal-title">{editingRisk ? 'Edit Risk' : 'Add Risk'}</h3>
              <button className="idp-modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="idp-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="idp-form-field" style={{ marginBottom: 0 }}>
                <label className="idp-form-label">Title <span className="idp-form-required">*</span></label>
                <input className="idp-form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Risk title..." />
              </div>
              <div className="idp-form-field" style={{ marginBottom: 0 }}>
                <label className="idp-form-label">Description</label>
                <textarea className="idp-form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the risk..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="idp-form-field" style={{ marginBottom: 0 }}>
                  <label className="idp-form-label">Category</label>
                  <CustomSelect value={form.category} options={CATEGORIES} onChange={v => setForm(f => ({ ...f, category: v }))} />
                </div>
                <div className="idp-form-field" style={{ marginBottom: 0 }}>
                  <label className="idp-form-label">Status</label>
                  <CustomSelect value={form.status} options={STATUS_OPTS} onChange={v => setForm(f => ({ ...f, status: v }))} />
                </div>
              </div>
              {/* Probability & Impact Sliders */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="idp-form-label" style={{ margin: 0 }}>Probability</span>
                    <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--idp-font-mono)', color: 'var(--idp-ink)' }}>{form.probability}</span>
                  </div>
                  <input type="range" min={1} max={5} step={1} value={form.probability}
                    onChange={e => setForm(f => ({ ...f, probability: parseInt(e.target.value) }))} style={{ width: '100%' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="idp-form-label" style={{ margin: 0 }}>Impact</span>
                    <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--idp-font-mono)', color: 'var(--idp-ink)' }}>{form.impact}</span>
                  </div>
                  <input type="range" min={1} max={5} step={1} value={form.impact}
                    onChange={e => setForm(f => ({ ...f, impact: parseInt(e.target.value) }))} style={{ width: '100%' }} />
                </div>
              </div>
              {/* Live Score Preview */}
              <div style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--idp-surface-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--idp-ink-muted)' }}>Score:</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: sevColor(liveScore), fontFamily: 'var(--idp-font-mono)' }}>{liveScore}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: sevColor(liveScore) }}>({sevLabel(liveScore)})</span>
              </div>
              <div className="idp-form-field" style={{ marginBottom: 0 }}>
                <label className="idp-form-label">Mitigation Plan</label>
                <textarea className="idp-form-textarea" value={form.mitigation_plan} onChange={e => setForm(f => ({ ...f, mitigation_plan: e.target.value }))} placeholder="How to mitigate..." />
              </div>
              <div className="idp-form-field" style={{ marginBottom: 0 }}>
                <label className="idp-form-label">Contingency</label>
                <textarea className="idp-form-textarea" value={form.contingency_plan} onChange={e => setForm(f => ({ ...f, contingency_plan: e.target.value }))} placeholder="Fallback plan..." />
              </div>
            </div>
            <div className="idp-modal-footer">
              <button className="idp-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="idp-btn-primary" onClick={handleSave} disabled={!form.title.trim()}>
                {editingRisk ? 'Update' : 'Add Risk'}
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

export default DetailTabRisks;
