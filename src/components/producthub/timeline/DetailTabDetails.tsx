/**
 * Detail Tab — Overview (MARAM V3.1 + Catalyst V11 Carbon Precision)
 *
 * Atlaskit migration (Apr 2026): all form controls swapped to ADS / Atlaskit
 * primitives. autoSave(field, value, label) wiring preserved EXACTLY — every
 * call signature, every optimistic-update path, every invalidation key.
 *
 *   Status / EA / BV / Priority / Quarter / Department  → @ads Select
 *   Reporter / Assignee / Business Owner                → @ads Select (avatar option labels)
 *   Business Ask / Kickoff / Target Complete            → @atlaskit/datetime-picker
 *   Description                                          → @atlaskit/textarea
 *   Roadmap toggle                                       → @atlaskit/toggle
 *   Comment input + post button                          → @ads Textfield + @ads Button
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { TimelineRequest } from '@/types/producthub/request';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePromoteToRoadmap, useRemoveFromRoadmap } from '@/hooks/useRoadmapPromotion';
import { getInitialsFromName, hashColor } from '@/types/producthub/request';
import { Select, Textfield, Button, Avatar } from '@/components/ads';
import type { SelectOption } from '@/components/ads';
import { DatePicker } from '@atlaskit/datetime-picker';
import TextArea from '@atlaskit/textarea';
import Toggle from '@atlaskit/toggle';
import { RequestSubtasksSection } from './RequestSubtasksSection';

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
  request: TimelineRequest;
}

/* ═══════════════════════════════════════════════════════════════════
   People Select — uses @ads Select with avatar-rendered option labels.
   onChange returns the profile id (or null when cleared).
   ═══════════════════════════════════════════════════════════════════ */
function PeoplePicker({ value, onChange }: { value: string | null | undefined; onChange: (id: string | null) => void }) {
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-list-with-avatars'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url');
      return (data || []).map((p: any) => ({ id: p.id, name: p.full_name || 'Unnamed', avatar_url: p.avatar_url || null }));
    },
    staleTime: 5 * 60_000,
  });

  const options: SelectOption<string>[] = useMemo(() => profiles.map((p) => ({
    value: p.id,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar src={p.avatar_url ?? undefined} name={p.name} size="xsmall" />
        <span>{p.name}</span>
      </div>
    ),
    data: p,
  })), [profiles]);

  const selectedProfile = profiles.find((p) => p.id === value);
  const selectedOption = selectedProfile
    ? options.find((o) => o.value === value) ?? null
    : null;

  return (
    <Select<string>
      options={options}
      value={selectedOption}
      onChange={(opt) => onChange(opt?.value ?? null)}
      placeholder="Unassigned"
      isClearable
      isSearchable
      usePortal
      menuPlacement="auto"
      width="large"
      aria-label="Person picker"
    />
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

  const options: SelectOption<string>[] = depts.map((d: any) => ({ value: d.id, label: d.name }));
  const selectedOption = options.find((o) => o.value === value) ?? null;

  return (
    <Select<string>
      options={options}
      value={selectedOption}
      onChange={(opt) => onChange(opt?.value ?? null)}
      placeholder="Select department"
      isClearable
      isSearchable
      usePortal
      menuPlacement="auto"
      width="large"
      aria-label="Department"
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Status Select — grouped options. Maps DB status ↔ UI option.
   onChange receives the chosen STATUS_OPTIONS entry (with .db key) so the
   parent's handleStatusChange(opt) signature stays identical.
   ═══════════════════════════════════════════════════════════════════ */
function StatusSelect({ dbValue, onChange }: { dbValue: string | null | undefined; onChange: (opt: typeof STATUS_OPTIONS[number]) => void }) {
  const groups = useMemo(() => Array.from(new Set(STATUS_OPTIONS.map(o => o.group))), []);
  const groupedOptions = groups.map((g) => ({
    label: g,
    options: STATUS_OPTIONS.filter(o => o.group === g).map((o) => ({
      value: o.value,
      label: o.label,
      data: o,
    })),
  }));
  const selected = STATUS_OPTIONS.find(o => o.db === dbValue);
  const selectedOption = selected ? { value: selected.value, label: selected.label, data: selected } : null;

  return (
    <Select<string>
      // grouped options pass through @ads Select via the same array shape
      // (react-select supports group objects). Cast is safe — Catalyst's
      // SelectOption is a flat shape but the underlying AkSelect handles it.
      options={groupedOptions as any}
      value={selectedOption as any}
      onChange={(opt: any) => {
        if (opt?.data) onChange(opt.data);
      }}
      placeholder="Select status"
      isSearchable
      usePortal
      menuPlacement="auto"
      width="large"
      aria-label="Status"
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════
   String-options Select — for EA / BV / Priority / Target Quarter.
   Preserves the exact onChange(string) signature autoSave expects.
   ═══════════════════════════════════════════════════════════════════ */
function StringSelect({ value, options, onChange, placeholder }: {
  value: string | null | undefined;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const opts: SelectOption<string>[] = options.map((o) => ({ value: o, label: o }));
  // Match case-insensitively, preserving the original DD's behaviour.
  const selectedOption = opts.find((o) =>
    o.value === value ||
    (typeof o.value === 'string' && typeof value === 'string' && o.value.toLowerCase() === value.toLowerCase())
  ) ?? null;

  return (
    <Select<string>
      options={opts}
      value={selectedOption}
      onChange={(opt) => { if (opt?.value) onChange(opt.value); }}
      placeholder={placeholder ?? 'Select...'}
      isSearchable
      usePortal
      menuPlacement="auto"
      width="large"
      aria-label={placeholder}
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
function CommentsSection({ requestId }: { requestId: string }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['ph-request-comments', requestId],
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_request_comments')
        .select('id, body, author_id, created_at')
        .eq('request_id', requestId)
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
      await typedQuery('ph_request_comments').insert({
        request_id: requestId,
        body: newComment.trim(),
        author_id: user?.id || null,
      });
      queryClient.invalidateQueries({ queryKey: ['ph-request-comments', requestId] });
      setNewComment('');
      // Silent auto-save
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await typedQuery('ph_request_comments').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['ph-request-comments', requestId] });
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
              <button onClick={() => handleDelete(c.id)} className="idp-comment-delete" aria-label="Delete comment">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="idp-comment-input-row" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <Textfield
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            isDisabled={submitting}
            spacing="compact"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            aria-label="Add a comment"
          />
        </div>
        <Button
          appearance="primary"
          spacing="compact"
          isDisabled={submitting || !newComment.trim()}
          onClick={handleSubmit}
        >
          Post
        </Button>
      </div>
    </div>
  );
}

/* ═══ MAIN COMPONENT ═══ */
export const DetailTabDetails: React.FC<DetailTabDetailsProps> = ({ request }) => {
  const queryClient = useQueryClient();

  const [editDesc, setEditDesc] = useState(false);
  const [desc, setDesc] = useState(request.description || '');

  // Optimistic local state for all editable fields
  const [localFields, setLocalFields] = useState<Record<string, any>>({});

  // Reset local fields when request changes (e.g., navigating to different request)
  useEffect(() => { setLocalFields({}); }, [request.id]);

  // Helper to get the current value: local override or request prop
  const getField = useCallback((field: string, propValue: any) => {
    return field in localFields ? localFields[field] : propValue;
  }, [localFields]);

  const promoteMutation = usePromoteToRoadmap();
  const removeMutation = useRemoveFromRoadmap();

  useEffect(() => { setDesc(request.description || ''); }, [request.description]);

  const quarters = useMemo(() => {
    const r: string[] = [];
    for (let y = 2025; y <= 2028; y++) for (let q = 1; q <= 4; q++) r.push(`Q${q} ${y}`);
    return r;
  }, []);

  const isUuid = useCallback((val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val), []);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['requests-backlog'] });
    queryClient.invalidateQueries({ queryKey: ['backlog-requests'] });
    queryClient.invalidateQueries({ queryKey: ['roadmap-requests'] });
    queryClient.invalidateQueries({ queryKey: ['ph-requests'] });
    queryClient.invalidateQueries({ queryKey: ['requests'] });
  }, [queryClient]);

  const autoSave = useCallback(async (field: string, value: any, label: string) => {
    // Optimistically update local state immediately
    setLocalFields(prev => ({ ...prev, [field]: value }));
    try {
      const fkFields = ['department_id', 'assignee_id', 'reporter_id', 'business_owner_id', 'product_id'];
      const sanitized = fkFields.includes(field) && value === '' ? null : value;

      let query = typedQuery('ph_requests')
        .update({ [field]: sanitized, updated_at: new Date().toISOString() } as any);

      if (isUuid(request.id)) {
        query = query.eq('id', request.id);
      } else if (request.initiative_key) {
        query = query.eq('initiative_key', request.initiative_key);
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
  }, [request.id, request.initiative_key, invalidateAll, isUuid]);

  const handleStatusChange = useCallback(async (opt: any) => {
    await autoSave('status', opt.db, 'Status');
  }, [autoSave]);

  const handleRoadmapToggle = useCallback(async () => {
    if (request.on_roadmap) {
      await removeMutation.mutateAsync(request.id);
    } else {
      await promoteMutation.mutateAsync({
        request_id: request.id,
      });
    }
  }, [request.id, request.on_roadmap, promoteMutation, removeMutation]);

  // DB status for Select matching
  const UI_TO_DB: Record<string, string> = {
    new: 'new_demand', portfolio_review: 'under_review', technical_validation: 'under_review',
    estimate: 'under_review', demand_approved: 'approved', analysis: 'approved',
    ready_for_development: 'approved', under_implementation: 'in_progress', on_hold: 'on_hold',
    implementation_review: 'in_progress', in_support: 'delivered', done: 'closed', cancelled: 'cancelled',
  };
  const dbStatus = UI_TO_DB[request.status] || request.status;

  // Normalize date values to YYYY-MM-DD for @atlaskit/datetime-picker
  const dateValue = (v: any): string => {
    if (!v) return '';
    if (typeof v === 'string') return v.length >= 10 ? v.slice(0, 10) : v;
    return '';
  };

  return (
    <div className="idp-overview">
      {/* Roadmap Toggle */}
      <div className="idp-roadmap-toggle">
        <div>
          <div className="idp-roadmap-label">{request.on_roadmap ? 'On Roadmap' : 'Not on Roadmap'}</div>
          <div className="idp-roadmap-help">Visible on Product Roadmap timeline</div>
        </div>
        <Toggle
          isChecked={!!request.on_roadmap}
          onChange={handleRoadmapToggle}
          label="Toggle roadmap visibility"
        />
      </div>

      {/* 2-Column Field Grid */}
      <div className="idp-field-grid">
        <Cell label="Status">
          <StatusSelect
            dbValue={getField('status', dbStatus)}
            onChange={handleStatusChange}
          />
        </Cell>
        <Cell label="EA Review" odd>
          <StringSelect
            value={getField('ea_review', (request as any).ea_review)}
            options={EA_OPTS}
            onChange={(v) => autoSave('ea_review', v, 'EA Review')}
            placeholder="Select EA review"
          />
        </Cell>
        <Cell label="Business Value">
          <StringSelect
            value={getField('business_value', (request as any).business_value)}
            options={BV_OPTS}
            onChange={(v) => autoSave('business_value', v.toLowerCase(), 'Business Value')}
            placeholder="Select business value"
          />
        </Cell>
        <Cell label="Priority" odd>
          <StringSelect
            value={getField('priority', (request as any).priority)}
            options={PRIO_OPTS}
            onChange={(v) => autoSave('priority', v, 'Priority')}
            placeholder="Select priority"
          />
        </Cell>
        <Cell label="Target Quarter" odd>
          <StringSelect
            value={getField('target_quarter', request.target_quarter)}
            options={quarters}
            onChange={(v) => autoSave('target_quarter', v, 'Target Quarter')}
            placeholder="Select quarter"
          />
        </Cell>
        <Cell label="Reporter">
          <PeoplePicker
            value={getField('reporter_id', request.reporter_id)}
            onChange={(id) => autoSave('reporter_id', id, 'Reporter')}
          />
        </Cell>
        <Cell label="Assignee" odd>
          <PeoplePicker
            value={getField('assignee_id', request.assignee_id)}
            onChange={(id) => autoSave('assignee_id', id, 'Assignee')}
          />
        </Cell>
        <Cell label="Department">
          <DeptSelect
            value={getField('department_id', request.department_id)}
            onChange={(id) => autoSave('department_id', id, 'Department')}
          />
        </Cell>
        <Cell label="Business Owner" odd>
          <PeoplePicker
            value={getField('business_owner_id', request.business_owner_id)}
            onChange={(id) => autoSave('business_owner_id', id, 'Business Owner')}
          />
        </Cell>
        <Cell label="Business Ask Date">
          <DatePicker
            value={dateValue(getField('business_ask_date', request.business_ask_date))}
            onChange={(v) => autoSave('business_ask_date', v || null, 'Business Ask Date')}
            weekStartDay={0}
            locale="en-GB"
            placeholder="DD/MM/YYYY"
            shouldShowCalendarButton
          />
        </Cell>
        <Cell label="Kickoff Date" odd>
          <DatePicker
            value={dateValue(getField('kickoff_date', request.kickoff_date))}
            onChange={(v) => autoSave('kickoff_date', v || null, 'Kickoff Date')}
            weekStartDay={0}
            locale="en-GB"
            placeholder="DD/MM/YYYY"
            shouldShowCalendarButton
          />
        </Cell>
        <Cell label="Target Complete">
          <DatePicker
            value={dateValue(getField('target_complete', request.target_complete))}
            onChange={(v) => autoSave('target_complete', v || null, 'Target Complete')}
            weekStartDay={0}
            locale="en-GB"
            placeholder="DD/MM/YYYY"
            shouldShowCalendarButton
          />
        </Cell>
      </div>

      {/* Description */}
      <div>
        <div className="idp-section-header">Description</div>
        {editDesc ? (
          <TextArea
            value={desc}
            onChange={(e) => setDesc((e.target as HTMLTextAreaElement).value)}
            isCompact={false}
            minimumRows={4}
            maxHeight="240px"
            placeholder="Add a description…"
            onBlur={() => {
              setEditDesc(false);
              autoSave('description', desc || null, 'Description');
            }}
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

      {/* Subtasks — Catalyst-canonical, ph_request_subtasks */}
      <RequestSubtasksSection requestId={request.id} />

      {/* Comments */}
      <CommentsSection requestId={request.id} />
    </div>
  );
};

export default DetailTabDetails;
