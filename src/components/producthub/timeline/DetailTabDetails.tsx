/**
 * Detail Tab — Overview (MARAM V3.1 + Catalyst V11 Carbon Precision)
 * Type selector cards, roadmap toggle, 2-col field grid, description, comments
 * All fields persist to Supabase ph_initiatives
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import { format } from 'date-fns';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePromoteToRoadmap, useRemoveFromRoadmap } from '@/hooks/useRoadmapPromotion';
import { getInitialsFromName, hashColor } from '@/types/producthub/initiative';

/* ═══ Constants ═══ */
const STATUS_OPTIONS = [
  { value: 'new', label: 'New', group: 'Intake', db: 'new_demand' },
  { value: 'portfolio_review', label: 'Portfolio Review', group: 'Intake', db: 'under_review' },
  { value: 'technical_validation', label: 'Technical Validation', group: 'Intake', db: 'under_review' },
  { value: 'estimate', label: 'Estimate', group: 'Intake', db: 'under_review' },
  { value: 'demand_approved', label: 'Demand Approved', group: 'Planning', db: 'approved' },
  { value: 'analysis', label: 'Analysis', group: 'Planning', db: 'approved' },
  { value: 'ready_for_development', label: 'Ready for Dev', group: 'Planning', db: 'approved' },
  { value: 'under_implementation', label: 'Under Implementation', group: 'Execution', db: 'in_progress' },
  { value: 'on_hold', label: 'On Hold', group: 'Execution', db: 'on_hold' },
  { value: 'implementation_review', label: 'Implementation Review', group: 'Execution', db: 'in_progress' },
  { value: 'in_support', label: 'In Support', group: 'Closure', db: 'delivered' },
  { value: 'done', label: 'Done', group: 'Closure', db: 'closed' },
  { value: 'cancelled', label: 'Cancelled', group: 'Closure', db: 'cancelled' },
];


const EA_OPTS = ['Not Required', 'Pending', 'In Review', 'Approved', 'Rejected'];
const BV_OPTS = ['High', 'Medium', 'Low'];
const PRIO_OPTS = ['Critical', 'High', 'Medium', 'Low'];

interface DetailTabDetailsProps {
  initiative: TimelineInitiative;
}

/* ═══ Custom Dropdown ═══ */
function DD({ value, options, grouped, onChange, ph = 'Select...' }: {
  value: string | null | undefined;
  options: any[];
  grouped?: boolean;
  onChange: (v: any) => void;
  ph?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  let label = ph;
  if (grouped) {
    const f = options.find(o => o.db === value);
    if (f) label = f.label;
  } else {
    const f = options.find(o => {
      const ov = typeof o === 'string' ? o : o.value;
      return ov === value || (typeof ov === 'string' && typeof value === 'string' && ov.toLowerCase() === value.toLowerCase());
    });
    if (f) label = typeof f === 'string' ? f : f.label;
    else if (value) label = value;
  }

  const groups = grouped ? [...new Set(options.map(o => o.group))] : null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} className={`idp-dd-trigger${!value ? ' idp-dd-trigger--empty' : ''}`}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
          <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="idp-dd-panel">
          {grouped && groups ? groups.map(g => (
            <div key={g}>
              <div className="idp-dd-group-header">{g}</div>
              {options.filter(o => o.group === g).map(o => (
                <button key={o.value} onClick={() => { onChange(o); setOpen(false); }}
                  className={`idp-dd-option${o.db === value ? ' idp-dd-option--selected' : ''}`}>
                  {o.db === value && <span className="idp-dd-check">✓</span>}
                  <span>{o.label}</span>
                </button>
              ))}
            </div>
          )) : options.map(o => {
            const v = typeof o === 'string' ? o : o.value;
            const l = typeof o === 'string' ? o : o.label;
            return (
              <button key={v} onClick={() => { onChange(v); setOpen(false); }}
                className={`idp-dd-option${(typeof v === 'string' && typeof value === 'string' ? v.toLowerCase() === value.toLowerCase() : v === value) ? ' idp-dd-option--selected' : ''}`}>
                {(typeof v === 'string' && typeof value === 'string' ? v.toLowerCase() === value.toLowerCase() : v === value) && <span className="idp-dd-check">✓</span>}
                <span>{l}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══ People Select ═══ */
function PS({ value, onChange }: { value: string | null | undefined; onChange: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-list-with-avatars'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url');
      return (data || []).map((p: any) => ({ id: p.id, name: p.full_name || 'Unnamed', avatar_url: p.avatar_url || null }));
    },
    staleTime: 5 * 60_000,
  });

  const selected = profiles.find(p => p.id === value);
  const filtered = profiles.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="idp-ps-trigger" onClick={() => { setOpen(!open); setQ(''); }}>
        {selected ? (
          <>
            <div className="idp-avatar" style={{ width: 22, height: 22, minWidth: 22, borderRadius: '50%', background: hashColor(selected.name), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {selected.avatar_url ? (
                <img src={selected.avatar_url} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.nextElementSibling as HTMLElement; if (fb) fb.style.display = 'flex'; }} />
              ) : null}
              <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, lineHeight: 1, display: selected.avatar_url ? 'none' : 'flex' }}>{getInitialsFromName(selected.name)}</span>
            </div>
            <span className="idp-ps-name">{selected.name}</span>
          </>
        ) : (
          <span className="idp-ps-empty">—</span>
        )}
      </button>
      {open && (
        <div className="idp-ps-panel">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people..."
            autoFocus className="idp-ps-search" />
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            <button onClick={() => { onChange(null); setOpen(false); }}
              className={`idp-dd-option${!value ? ' idp-dd-option--selected' : ''}`}
              style={{ color: 'var(--idp-ink-muted-strong)', fontStyle: 'italic' }}>
              Unassigned
            </button>
            {filtered.map(p => (
              <button key={p.id} onClick={() => { onChange(p.id); setOpen(false); }}
                className={`idp-dd-option${p.id === value ? ' idp-dd-option--selected' : ''}`}
                style={{ gap: 8 }}>
                <div style={{ width: 22, height: 22, minWidth: 22, borderRadius: '50%', background: hashColor(p.name), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.nextElementSibling as HTMLElement; if (fb) fb.style.display = 'flex'; }} />
                  ) : null}
                  <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, lineHeight: 1, display: p.avatar_url ? 'none' : 'flex' }}>{getInitialsFromName(p.name)}</span>
                </div>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Department Select ═══ */
function DeptSelect({ value, onChange }: { value: string | null | undefined; onChange: (id: string | null) => void }) {
  const { data: depts = [] } = useQuery({
    queryKey: ['ph-departments-list'],
    queryFn: async () => {
      const { data } = await typedQuery('ph_departments').select('id, name');
      return (data || []).map((d: any) => ({ id: d.id, name: d.name }));
    },
    staleTime: 5 * 60_000,
  });

  const opts = depts.map((d: any) => d.name);
  const selected = depts.find((d: any) => d.id === value);

  return (
    <DD
      value={selected?.name || null}
      options={opts}
      onChange={(v: string) => {
        const d = depts.find((dd: any) => dd.name === v);
        onChange(d?.id || null);
      }}
      ph="Select department"
    />
  );
}

/* ═══ Field Cell ═══ */
function Cell({ label, children, odd, last }: { label: string; children: React.ReactNode; odd?: boolean; last?: boolean }) {
  return (
    <div className={`idp-field-cell${odd ? ' idp-field-cell--odd' : ''}${last ? ' idp-field-cell--last' : ''}`}>
      <div className="idp-field-label">{label}</div>
      <div className="idp-field-value">{children}</div>
    </div>
  );
}

/* ═══ Comments Section ═══ */
function CommentsSection({ initiativeId }: { initiativeId: string }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['pk-comments', initiativeId],
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_comments')
        .select('id, body, author_id, created_at')
        .eq('work_item_id', initiativeId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const authorIds: string[] = (data || []).map((c: any) => c.author_id).filter(Boolean);
      const uniqueIds = Array.from(new Set(authorIds));
      let authorMap: Record<string, string> = {};
      if (uniqueIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', uniqueIds);
        if (profiles) profiles.forEach((p: any) => { authorMap[p.id] = p.full_name; });
      }
      return (data || []).map((c: any) => ({ ...c, author_name: authorMap[c.author_id] || 'Unknown' }));
    },
  });

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await typedQuery('ph_comments').insert({
        work_item_id: initiativeId,
        work_item_type: 'initiative',
        body: newComment.trim(),
        author_id: user?.id || null,
      });
      queryClient.invalidateQueries({ queryKey: ['pk-comments', initiativeId] });
      setNewComment('');
      // Silent auto-save
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await typedQuery('ph_comments').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['pk-comments', initiativeId] });
    // Silent auto-save
  };

  return (
    <div className="idp-comments">
      <div className="idp-section-header">
        Comments <span className="idp-section-count">({comments.length})</span>
      </div>
      {isLoading ? (
        <p className="idp-text-muted">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="idp-text-muted" style={{ fontStyle: 'italic' }}>No comments yet.</p>
      ) : (
        <div className="idp-comment-list">
          {comments.map((c: any) => (
            <div key={c.id} className="idp-comment">
              <div className="idp-avatar" style={{
                width: 28, height: 28, minWidth: 28, borderRadius: '50%',
                background: hashColor(c.author_name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>{getInitialsFromName(c.author_name)}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="idp-comment-author">{c.author_name}</span>
                  <span className="idp-comment-time">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                </div>
                <div className="idp-comment-body">{c.body}</div>
              </div>
              <button onClick={() => handleDelete(c.id)} className="idp-comment-delete">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="idp-comment-input-row">
        <input
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="idp-comment-input"
          disabled={submitting}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
        />
        <button onClick={handleSubmit} disabled={submitting || !newComment.trim()} className="idp-comment-send">
          Post
        </button>
      </div>
    </div>
  );
}

/* ═══ MAIN COMPONENT ═══ */
export const DetailTabDetails: React.FC<DetailTabDetailsProps> = ({ initiative }) => {
  const queryClient = useQueryClient();
  
  const [editDesc, setEditDesc] = useState(false);
  const [desc, setDesc] = useState(initiative.description || '');

  // Optimistic local state for all editable fields
  const [localFields, setLocalFields] = useState<Record<string, any>>({});

  // Reset local fields when initiative changes (e.g., navigating to different initiative)
  useEffect(() => { setLocalFields({}); }, [initiative.id]);

  // Helper to get the current value: local override or initiative prop
  const getField = useCallback((field: string, propValue: any) => {
    return field in localFields ? localFields[field] : propValue;
  }, [localFields]);

  const promoteMutation = usePromoteToRoadmap();
  const removeMutation = useRemoveFromRoadmap();

  useEffect(() => { setDesc(initiative.description || ''); }, [initiative.description]);

  const quarters = useMemo(() => {
    const r: string[] = [];
    for (let y = 2025; y <= 2028; y++) for (let q = 1; q <= 4; q++) r.push(`Q${q} ${y}`);
    return r;
  }, []);

  const isUuid = useCallback((val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val), []);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
    queryClient.invalidateQueries({ queryKey: ['backlog-initiatives'] });
    queryClient.invalidateQueries({ queryKey: ['roadmap-initiatives'] });
    queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
    queryClient.invalidateQueries({ queryKey: ['initiatives'] });
  }, [queryClient]);

  const autoSave = useCallback(async (field: string, value: any, label: string) => {
    // Optimistically update local state immediately
    setLocalFields(prev => ({ ...prev, [field]: value }));
    try {
      const fkFields = ['department_id', 'assignee_id', 'reporter_id', 'business_owner_id', 'product_id'];
      const sanitized = fkFields.includes(field) && value === '' ? null : value;

      let query = supabase
        .from('ph_initiatives')
        .update({ [field]: sanitized, updated_at: new Date().toISOString() } as any);

      if (isUuid(initiative.id)) {
        query = query.eq('id', initiative.id);
      } else if (initiative.initiative_key) {
        query = query.eq('initiative_key', initiative.initiative_key);
      } else {
        throw new Error('Missing valid persistence identifier');
      }

      const { error } = await query;
      if (error) throw error;

      // Silent auto-save — no toast for routine field updates
      invalidateAll();
    } catch (err: any) {
      toast.error(`Failed to update ${label.toLowerCase()}: ${err?.message || 'unknown error'}`);
      // Revert optimistic update
      setLocalFields(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  }, [initiative.id, initiative.initiative_key, invalidateAll, isUuid]);

  const handleStatusChange = useCallback(async (opt: any) => {
    await autoSave('status', opt.db, 'Status');
  }, [autoSave]);


  const handleRoadmapToggle = useCallback(async () => {
    if (initiative.on_roadmap) {
      await removeMutation.mutateAsync(initiative.id);
    } else {
      await promoteMutation.mutateAsync({
        initiative_id: initiative.id,
      });
    }
  }, [initiative.id, initiative.on_roadmap, promoteMutation, removeMutation]);

  // DB status for dropdown matching
  const UI_TO_DB: Record<string, string> = {
    new: 'new_demand', portfolio_review: 'under_review', technical_validation: 'under_review',
    estimate: 'under_review', demand_approved: 'approved', analysis: 'approved',
    ready_for_development: 'approved', under_implementation: 'in_progress', on_hold: 'on_hold',
    implementation_review: 'in_progress', in_support: 'delivered', done: 'closed', cancelled: 'cancelled',
  };
  const dbStatus = UI_TO_DB[initiative.status] || initiative.status;

  return (
    <div className="idp-overview">
      {/* Roadmap Toggle */}
      <div className="idp-roadmap-toggle">
        <div>
          <div className="idp-roadmap-label">{initiative.on_roadmap ? 'On Roadmap' : 'Not on Roadmap'}</div>
          <div className="idp-roadmap-help">Visible on Product Roadmap timeline</div>
        </div>
        <button
          onClick={handleRoadmapToggle}
          className={`idp-switch ${initiative.on_roadmap ? 'idp-switch--on' : 'idp-switch--off'}`}
        >
          <div className="idp-switch-thumb" style={{ left: initiative.on_roadmap ? 20 : 2 }} />
        </button>
      </div>

      {/* 2-Column Field Grid */}
      <div className="idp-field-grid">
        <Cell label="Status">
          <DD value={getField('status', dbStatus)} options={STATUS_OPTIONS} grouped onChange={handleStatusChange} />
        </Cell>
        <Cell label="EA Review" odd>
          <DD value={getField('ea_review', (initiative as any).ea_review)} options={EA_OPTS} onChange={(v: string) => autoSave('ea_review', v, 'EA Review')} />
        </Cell>
        <Cell label="Business Value">
          <DD value={getField('business_value', (initiative as any).business_value)} options={BV_OPTS} onChange={(v: string) => autoSave('business_value', v.toLowerCase(), 'Business Value')} />
        </Cell>
        <Cell label="Priority" odd>
          <DD value={getField('priority', (initiative as any).priority)} options={PRIO_OPTS} onChange={(v: string) => autoSave('priority', v, 'Priority')} />
        </Cell>
        <Cell label="Target Quarter" odd>
          <DD value={getField('target_quarter', initiative.target_quarter)} options={quarters} onChange={(v: string) => autoSave('target_quarter', v, 'Target Quarter')} />
        </Cell>
        <Cell label="Reporter">
          <PS value={getField('reporter_id', initiative.reporter_id)} onChange={(id) => autoSave('reporter_id', id, 'Reporter')} />
        </Cell>
        <Cell label="Assignee" odd>
          <PS value={getField('assignee_id', initiative.assignee_id)} onChange={(id) => autoSave('assignee_id', id, 'Assignee')} />
        </Cell>
        <Cell label="Department">
          <DeptSelect value={getField('department_id', initiative.department_id)} onChange={(id) => autoSave('department_id', id, 'Department')} />
        </Cell>
        <Cell label="Business Owner" odd>
          <PS value={getField('business_owner_id', initiative.business_owner_id)} onChange={(id) => autoSave('business_owner_id', id, 'Business Owner')} />
        </Cell>
        <Cell label="Business Ask Date">
          <input
            type="date"
            value={getField('business_ask_date', initiative.business_ask_date) || ''}
            onChange={e => autoSave('business_ask_date', e.target.value || null, 'Business Ask Date')}
            className="idp-date-input"
          />
        </Cell>
        <Cell label="Kickoff Date" odd>
          <input
            type="date"
            value={getField('kickoff_date', initiative.kickoff_date) || ''}
            onChange={e => autoSave('kickoff_date', e.target.value || null, 'Kickoff Date')}
            className="idp-date-input"
          />
        </Cell>
        <Cell label="Target Complete">
          <input
            type="date"
            value={getField('target_complete', initiative.target_complete) || ''}
            onChange={e => autoSave('target_complete', e.target.value || null, 'Target Complete')}
            className="idp-date-input"
          />
        </Cell>
      </div>

      {/* Description */}
      <div>
        <div className="idp-section-header">Description</div>
        {editDesc ? (
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            autoFocus
            onBlur={() => {
              setEditDesc(false);
              autoSave('description', desc || null, 'Description');
            }}
            className="idp-desc-textarea"
          />
        ) : (
          <div
            onClick={() => setEditDesc(true)}
            className={`idp-desc-view${desc ? '' : ' idp-desc-view--empty'}`}
          >
            {desc || 'Click to add description...'}
          </div>
        )}
      </div>

      {/* Comments */}
      <CommentsSection initiativeId={initiative.id} />
    </div>
  );
};

export default DetailTabDetails;
