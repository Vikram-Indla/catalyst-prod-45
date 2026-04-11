/**
 * Detail Tab — Budget (MARAM V3.1 + Catalyst V11 Carbon Precision)
 * Total budget input, summary cards, utilization bar, budget table, add/edit modal
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logInitiativeAudit } from '@/lib/initiativeAudit';
import { Pencil, Trash2, FolderOpen, X } from 'lucide-react';

interface DetailTabBudgetProps {
  initiativeId: string;
}

const CATEGORIES = ['Development', 'Infrastructure', 'Consulting', 'Licensing', 'Training', 'Operations', 'Contingency', 'Other'];
const CAT_COLORS: Record<string, string> = {
  Development: '#2563EB', Infrastructure: '#08736B', Consulting: '#7C3AED', Licensing: '#9A5402',
  Training: '#0D7331', Operations: '#71717A', Contingency: '#D92525', Other: '#3F3F46',
};
const STATUSES = ['draft', 'approved', 'committed', 'paid', 'cancelled'];

const fmtSAR = (n: number) => `SAR ${n.toLocaleString('en-US')}`;

/* ── Custom Dropdown (no native <select>) ── */
function CustomSelect({ value, options, onChange, placeholder }: { value: string; options: string[]; onChange: (v: string) => void; placeholder?: string }) {
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
        <span>{value || placeholder || 'Select…'}</span>
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

function ToggleButtons({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {['capex', 'opex'].map(v => (
        <button key={v} type="button" onClick={() => onChange(v)}
          style={{
            flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: value === v ? '1.5px solid var(--idp-primary)' : '1px solid var(--idp-border)',
            background: value === v ? 'var(--idp-primary-bg)' : 'var(--idp-surface)',
            color: value === v ? 'var(--idp-primary)' : 'var(--idp-ink-tertiary)',
            borderRadius: v === 'capex' ? '6px 0 0 6px' : '0 6px 6px 0',
            fontFamily: 'var(--idp-font-body)',
          }}>
          {v === 'capex' ? 'CAPEX' : 'OPEX'}
        </button>
      ))}
    </div>
  );
}

export const DetailTabBudget: React.FC<DetailTabBudgetProps> = ({ initiativeId }) => {
  const queryClient = useQueryClient();
  const [totalBudget, setTotalBudget] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [form, setForm] = useState({ category: 'Development', expense_type: 'opex', description: '', planned_amount: '', actual_amount: '' });

  const { data: items = [], refetch } = useQuery({
    queryKey: ['idp-budget-items', initiativeId],
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_initiative_budget_items')
        .select('*')
        .eq('initiative_id', initiativeId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Load total budget from initiative
  useQuery({
    queryKey: ['idp-budget-total', initiativeId],
    queryFn: async () => {
      const { data } = await typedQuery('ph_initiatives')
        .select('budget_allocated')
        .eq('id', initiativeId)
        .single();
      if (data?.budget_allocated) setTotalBudget(data.budget_allocated);
      return data;
    },
  });

  const totalPlanned = useMemo(() => items.reduce((s: number, i: any) => s + (Number(i.planned_amount) || 0), 0), [items]);
  const totalActual = useMemo(() => items.reduce((s: number, i: any) => s + (Number(i.actual_amount) || 0), 0), [items]);
  const remaining = totalBudget - totalActual;
  const utilPct = totalBudget > 0 ? Math.min(100, Math.round((totalActual / totalBudget) * 100)) : 0;

  const saveTotalBudget = useCallback(async () => {
    await typedQuery('ph_initiatives').update({ budget_allocated: totalBudget, updated_at: new Date().toISOString() }).eq('id', initiativeId);
    logInitiativeAudit({ initiative_id: initiativeId, action: 'updated', entity_type: 'budget', field_name: 'budget_allocated', new_value: `SAR ${totalBudget.toLocaleString('en-US')}` });
    // Silent auto-save
  }, [totalBudget, initiativeId]);

  const openAdd = () => {
    setEditingItem(null);
    setForm({ category: 'Development', expense_type: 'opex', description: '', planned_amount: '', actual_amount: '' });
    setShowModal(true);
  };
  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      category: item.category || 'Development',
      expense_type: item.expense_type || 'opex',
      description: item.description || '',
      planned_amount: String(item.planned_amount || ''),
      actual_amount: String(item.actual_amount || ''),
    });
    setShowModal(true);
  };

  const handleSaveItem = async () => {
    if (!form.description.trim() || !form.planned_amount) return;
    const payload: any = {
      initiative_id: initiativeId,
      category: form.category.toLowerCase(),
      expense_type: form.expense_type,
      description: form.description.trim(),
      planned_amount: parseFloat(form.planned_amount),
      actual_amount: form.actual_amount ? parseFloat(form.actual_amount) : 0,
    };
    if (editingItem) {
      const { error } = await typedQuery('ph_initiative_budget_items').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Failed to update'); return; }
      logInitiativeAudit({ initiative_id: initiativeId, action: 'updated', entity_type: 'budget_item', new_value: form.description });
      // Silent auto-save
    } else {
      payload.created_by = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await typedQuery('ph_initiative_budget_items').insert(payload);
      if (error) { toast.error('Failed to add'); return; }
      logInitiativeAudit({ initiative_id: initiativeId, action: 'created', entity_type: 'budget_item', new_value: form.description });
      toast.success('Item added', { duration: 2200, style: { background: '#18181B', color: '#fff' }, position: 'bottom-center' });
    }
    setShowModal(false);
    refetch();
  };

  const handleDelete = async (id: string) => {
    await typedQuery('ph_initiative_budget_items').delete().eq('id', id);
    logInitiativeAudit({ initiative_id: initiativeId, action: 'deleted', entity_type: 'budget_item' });
    toast.success('Item deleted', { duration: 2200, style: { background: '#18181B', color: '#fff' }, position: 'bottom-center' });
    refetch();
  };

  const catLabel = (cat: string) => CATEGORIES.find(c => c.toLowerCase() === cat?.toLowerCase()) || cat || 'Other';

  return (
    <div className="idp-budget">
      {/* B1 — Total Budget Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="idp-form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>TOTAL BUDGET (SAR)</span>
        <input
          type="number"
          value={totalBudget || ''}
          onChange={e => setTotalBudget(Number(e.target.value) || 0)}
          onBlur={saveTotalBudget}
          style={{
            width: 160, padding: '6px 10px', border: '1px solid var(--idp-border)', borderRadius: 6,
            fontSize: 14, fontFamily: 'var(--idp-font-mono)', fontWeight: 600, color: 'var(--idp-ink)', outline: 'none',
          }}
        />
      </div>

      {/* B2 — Summary Cards */}
      <div className="idp-budget-cards">
        <div className="idp-budget-card" style={{ borderLeftColor: 'var(--idp-primary)' }}>
          <div className="idp-budget-card-label">Allocated</div>
          <div className="idp-budget-card-value">{fmtSAR(totalBudget)}</div>
        </div>
        <div className="idp-budget-card" style={{ borderLeftColor: 'var(--idp-warning)' }}>
          <div className="idp-budget-card-label">Actual Spend</div>
          <div className="idp-budget-card-value">{fmtSAR(totalActual)}</div>
        </div>
        <div className="idp-budget-card" style={{ borderLeftColor: remaining >= 0 ? 'var(--idp-success)' : 'var(--idp-danger)' }}>
          <div className="idp-budget-card-label">Remaining</div>
          <div className="idp-budget-card-value">{fmtSAR(remaining)}</div>
        </div>
      </div>

      {/* B3 — Utilization Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 5, background: 'var(--idp-surface-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: `${utilPct}%`, height: '100%', borderRadius: 4, transition: 'width 0.3s',
            background: utilPct > 80 ? 'var(--idp-warning)' : 'var(--idp-primary)',
          }} />
        </div>
        <span style={{ fontSize: 11, fontFamily: 'var(--idp-font-mono)', color: 'var(--idp-ink-muted)' }}>{utilPct}%</span>
      </div>

      {/* B4 — Budget Table */}
      {items.length === 0 ? (
        <div style={{ border: '1px solid var(--idp-border)', borderRadius: 8, padding: '40px 20px', textAlign: 'center' }}>
          <FolderOpen size={28} style={{ margin: '0 auto 8px', color: 'var(--idp-ink-tertiary)' }} />
          <div style={{ fontSize: 13, color: 'var(--idp-ink-tertiary)' }}>No budget items yet</div>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--idp-border)', borderRadius: 8, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '90px 1fr 60px 90px 90px 70px 48px', padding: '8px 12px',
            background: 'var(--idp-surface-secondary)', borderBottom: '1px solid var(--idp-border)',
          }}>
            {['Category', 'Description', 'Type', 'Planned', 'Actual', 'Status', ''].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 650, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--idp-ink-secondary)' }}>{h}</span>
            ))}
          </div>
          {/* Rows */}
          {items.map((item: any, idx: number) => (
            <div key={item.id}
              onMouseEnter={() => setHoveredRow(item.id)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: 'grid', gridTemplateColumns: '90px 1fr 60px 90px 90px 70px 48px', padding: '9px 12px',
                borderBottom: idx < items.length - 1 ? '1px solid var(--idp-border)' : undefined, alignItems: 'center',
              }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: CAT_COLORS[catLabel(item.category)] || 'var(--idp-ink-tertiary)' }}>
                {catLabel(item.category)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--idp-ink-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.description}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, display: 'inline-block', width: 'fit-content',
                background: item.expense_type === 'capex' ? 'var(--idp-primary-bg)' : 'var(--idp-teal-bg)',
                color: item.expense_type === 'capex' ? 'var(--idp-primary)' : 'var(--idp-teal)',
              }}>
                {item.expense_type === 'capex' ? 'CAPEX' : 'OPEX'}
              </span>
              <span style={{ fontSize: 11, fontFamily: 'var(--idp-font-mono)', color: 'var(--idp-ink-secondary)', textAlign: 'right' }}>
                {fmtSAR(Number(item.planned_amount) || 0)}
              </span>
              <span style={{ fontSize: 11, fontFamily: 'var(--idp-font-mono)', color: 'var(--idp-ink)', fontWeight: 500, textAlign: 'right' }}>
                {fmtSAR(Number(item.actual_amount) || 0)}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 9999, display: 'inline-block', width: 'fit-content',
                background: 'var(--idp-success-bg)', color: 'var(--idp-success-text)',
              }}>
                {(item.status || 'draft').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </span>
              <div style={{ display: 'flex', gap: 2, opacity: hoveredRow === item.id ? 1 : 0, transition: 'opacity 0.15s' }}>
                <button onClick={() => openEdit(item)} className="idp-hover-action-btn"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(item.id)} className="idp-hover-action-btn"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Button */}
      <button className="idp-add-btn" onClick={openAdd}>+ Add Budget Item</button>

      {/* B5 — Add/Edit Modal */}
      {showModal && createPortal(
        <div data-module="initiative-detail-panel">
        <div className="idp-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="idp-modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div className="idp-modal-header">
              <h3 className="idp-modal-title">{editingItem ? 'Edit Budget Item' : 'Add Budget Item'}</h3>
              <button className="idp-modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="idp-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Category */}
              <div className="idp-form-field" style={{ marginBottom: 0 }}>
                <label className="idp-form-label">Category <span className="idp-form-required">*</span></label>
                <CustomSelect value={form.category} options={CATEGORIES} onChange={v => setForm(f => ({ ...f, category: v }))} />
              </div>
              {/* Expense Type */}
              <div className="idp-form-field" style={{ marginBottom: 0 }}>
                <label className="idp-form-label">Expense Type</label>
                <ToggleButtons value={form.expense_type} onChange={v => setForm(f => ({ ...f, expense_type: v }))} />
              </div>
              {/* Description */}
              <div className="idp-form-field" style={{ marginBottom: 0 }}>
                <label className="idp-form-label">Description <span className="idp-form-required">*</span></label>
                <input className="idp-form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this cover..." />
              </div>
              {/* Amounts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="idp-form-field" style={{ marginBottom: 0 }}>
                  <label className="idp-form-label">Planned (SAR) <span className="idp-form-required">*</span></label>
                  <input className="idp-form-input" type="number" value={form.planned_amount} onChange={e => setForm(f => ({ ...f, planned_amount: e.target.value }))} />
                </div>
                <div className="idp-form-field" style={{ marginBottom: 0 }}>
                  <label className="idp-form-label">Actual (SAR)</label>
                  <input className="idp-form-input" type="number" value={form.actual_amount} onChange={e => setForm(f => ({ ...f, actual_amount: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="idp-modal-footer">
              <button className="idp-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="idp-btn-primary" onClick={handleSaveItem} disabled={!form.description.trim() || !form.planned_amount}>
                {editingItem ? 'Update' : 'Add Item'}
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

export default DetailTabBudget;
