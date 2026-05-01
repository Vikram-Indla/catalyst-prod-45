/**
 * IssueActionDialogs — Modal/wizard components for:
 *   1. Add Flag
 *   2. Clone Issue
 *   3. Move Issue
 *   4. Archive Issue
 *   5. Delete Issue
 */
import { useState, useMemo } from 'react';
import { X, Search, Loader2, AlertTriangle, Flag, Copy, ArrowRight, Archive, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { catalystToast } from '@/lib/catalystToast';
import { STATUS_OPTION_GROUPS } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import { resolveStatusCategory } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

/* ═══ Shared styles ═══ */
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 10000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(9,30,66,0.54)',
};
const modalBase: React.CSSProperties = {
  background: 'var(--ds-surface, #fff)', borderRadius: 8, maxWidth: '95vw', maxHeight: '85vh',
  overflow: 'hidden', boxShadow: '0 12px 40px rgba(9,30,66,.35)',
};
const btnPrimary: React.CSSProperties = {
  padding: '7px 20px', borderRadius: 4, fontSize: 14, fontWeight: 600,
  cursor: 'pointer', border: 'none', background: '#0C66E4', color: 'var(--ds-surface, #fff)',
};
const btnSecondary: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 4, fontSize: 14, fontWeight: 500,
  cursor: 'pointer', border: 'none', background: 'var(--ds-surface-sunken, #F4F5F7)', color: 'var(--ds-text, #172B4D)',
};
const btnDanger: React.CSSProperties = {
  ...btnPrimary, background: '#DE350B',
};
const menuItem = (hover: boolean, danger = false): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
  padding: '8px 16px', fontSize: 14, border: 'none', cursor: 'pointer',
  color: danger ? '#DE350B' : 'var(--ds-text, #172B4D)',
  background: hover ? (danger ? '#FFEBE6' : 'var(--ds-surface-sunken, #F4F5F7)') : 'transparent',
});
const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: 'var(--ds-text, #172B4D)', display: 'block', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #DFE1E6',
  borderRadius: 4, fontSize: 14, outline: 'none',
};

/* ═══ Flag helpers (Jira BAU-4375 format) ═══ */
const DEFAULT_ADD_FLAG_NOTE = 'none';    // BAU-4375 uses "flag" and "none"; we default to "none" if blank
const DEFAULT_REMOVE_FLAG_NOTE = 'none'; // BAU-4375 uses "remove" and "none"; we default to "none" if blank
const FLAG_VALUE = 'Impediment';         // Jira canonical flag value

function normalizeNote(note?: string, fallback = 'none') {
  const trimmed = (note ?? '').trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function hasCanonicalFlagValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'object';
}

export function isFlagged(item: any): boolean {
  if (!item) return false;
  if (item.is_flagged === true) return true;
  if (hasCanonicalFlagValue(item?.flag_reason)) return true;
  return (
    hasCanonicalFlagValue(item?.fields?.Flagged) ||
    hasCanonicalFlagValue(item?.raw_json?.fields?.Flagged) ||
    hasCanonicalFlagValue(item?.Flagged) ||
    item?.flagged === true
  );
}

function updateFlagStateInCache(data: any, issueKey: string, nextFlagged: boolean, nextReason: string | null): any {
  if (Array.isArray(data)) {
    return data.map((entry) => updateFlagStateInCache(entry, issueKey, nextFlagged, nextReason));
  }

  if (!data || typeof data !== 'object') return data;

  const recordIssueKey = data.issue_key ?? data.jiraKey ?? data.item_key;
  if (recordIssueKey === issueKey) {
    return {
      ...data,
      is_flagged: nextFlagged,
      flag_reason: nextReason,
    };
  }

  return data;
}

function syncFlagCaches(queryClient: ReturnType<typeof useQueryClient>, issueKey: string, nextFlagged: boolean, nextReason: string | null) {
  const cacheKeys = [
    ['project-all-work-items-v3'],
    ['project-list-items-v2'],
    ['allwork-items'],
    ['project-work-items'],
    ['ph_issues'],
    ['work-item-detail'],
  ];

  cacheKeys.forEach((queryKey) => {
    queryClient.setQueriesData({ queryKey }, (current) => updateFlagStateInCache(current, issueKey, nextFlagged, nextReason));
  });
}

/* ═══ 1. FLAG POPOVER (Jira inline popover — not a full-screen modal) ═══ */
export function FlagPopover({ issueId, issueKey, flagged, anchorRef, onClose, tableName = 'ph_issues' }: {
  issueId: string;
  issueKey: string;
  flagged: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  tableName?: 'ph_issues';
}) {
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();

  // Compute position anchored below the flag icon, clamped to viewport
  const pos = useMemo(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return { top: 120, left: 400 };
    const popW = 360, popH = 280, pad = 12;
    let top = rect.bottom + 6;
    let left = rect.left;
    // clamp right edge
    if (left + popW > window.innerWidth - pad) left = window.innerWidth - pad - popW;
    // clamp left edge
    if (left < pad) left = pad;
    // if overflows bottom, show above
    if (top + popH > window.innerHeight - pad) top = rect.top - popH - 6;
    if (top < pad) top = pad;
    return { top, left };
  }, [anchorRef]);

  const mutation = useMutation({
    mutationFn: async () => {
      const newFlagged = !flagged;
      const nextFlagReason = newFlagged ? (note.trim() || FLAG_VALUE) : null;

      // Update flag fields on ph_issues
      const { error } = await (supabase.from(tableName) as any).update({
        is_flagged: newFlagged,
        flag_reason: nextFlagReason,
      }).eq('issue_key', issueKey);
      if (error) throw error;

      // Build Jira-format comment text
      const commentNote = newFlagged
        ? normalizeNote(note, DEFAULT_ADD_FLAG_NOTE)
        : normalizeNote(note, DEFAULT_REMOVE_FLAG_NOTE);
      const commentText = newFlagged
        ? `:flag_on: Flag added\n${commentNote}`
        : `:flag_off: Flag removed\n${commentNote}`;

      try {
        const { error: activityError } = await supabase.from('activity_logs').insert({
          entity_id: issueId, entity_type: 'ph_issue',
          action: newFlagged ? 'flag_added' : 'flag_removed',
          after_json: { is_flagged: newFlagged, flag_reason: nextFlagReason, comment: commentText },
        });

        if (activityError) {
          console.warn('Flag activity log skipped:', activityError.message);
        }
      } catch (activityError) {
        console.warn('Flag activity log skipped:', activityError);
      }

      return { newFlagged, nextFlagReason };
    },
    onSuccess: ({ newFlagged, nextFlagReason }) => {
      syncFlagCaches(queryClient, issueKey, newFlagged, nextFlagReason);
      queryClient.invalidateQueries({ queryKey: ['project-all-work-items-v3'] });
      queryClient.invalidateQueries({ queryKey: ['project-list-items-v2'] });
      queryClient.invalidateQueries({ queryKey: ['allwork-items'] });
      queryClient.invalidateQueries({ queryKey: ['project-work-items'] });
      catalystToast.success(newFlagged ? 'Flag added' : 'Flag removed');
      onClose();
    },
    onError: () => catalystToast.error('Failed to update flag'),
  });

  return (
    <>
      {/* Click-outside overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
      <div style={{
        position: 'fixed', top: pos.top, left: pos.left,
        background: 'var(--ds-surface, #fff)', borderRadius: 8, width: 360, padding: '20px 24px',
        boxShadow: '0 8px 28px rgba(9,30,66,0.25)', zIndex: 100,
        border: '1px solid #DFE1E6',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Flag size={18} color="#DE350B" />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-text, #172B4D)' }}>
            {flagged ? 'Remove flag' : 'Add flag'}
          </span>
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={flagged
            ? 'Optional: let your team know why the flag was removed'
            : 'Optional: let your team know why this work item has been flagged'}
          style={{
            width: '100%', padding: '10px 12px', border: '1px solid #DFE1E6',
            borderRadius: 4, fontSize: 14, outline: 'none', resize: 'vertical',
            minHeight: 80, fontFamily: 'var(--cp-font-body)', color: 'var(--ds-text, #172B4D)',
            lineHeight: '1.5',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            style={{
              padding: '8px 20px', borderRadius: 4, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', border: 'none', color: 'var(--ds-surface, #fff)',
              background: flagged ? 'var(--ds-text-subtlest, #6B778C)' : '#0C66E4',
              opacity: mutation.isPending ? 0.6 : 1,
            }}
          >
            {mutation.isPending ? 'Updating...' : flagged ? 'Remove flag' : 'Add comment'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ═══ 2. CLONE WIZARD ═══ */
export function CloneWizard({ issueId, issueKey, item, projectKey, onClose }: {
  issueId: string; issueKey: string; item: any; projectKey: string; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [summary, setSummary] = useState(`Clone - ${item?.summary ?? ''}`);
  const [description, setDescription] = useState(item?.description ?? '');
  const [copyAttachments, setCopyAttachments] = useState(true);
  const [copyLinks, setCopyLinks] = useState(true);
  const [copyComments, setCopyComments] = useState(false);
  const [issueType, setIssueType] = useState(item?.issue_type ?? 'Task');

  const STEPS = ['Clone Options', 'Fields', 'Confirm'];

  const cloneMutation = useMutation({
    mutationFn: async () => {
      // Generate a mock key (in production, this would be server-side)
      const { data: maxKey } = await supabase.from('ph_issues')
        .select('issue_key')
        .ilike('issue_key', `${projectKey}-%`)
        .order('issue_key', { ascending: false })
        .limit(1);
      const lastNum = maxKey?.[0]?.issue_key ? parseInt(maxKey[0].issue_key.split('-')[1]) : 0;
      const newKey = `${projectKey}-${lastNum + 1}`;

      const { error } = await supabase.from('ph_issues').insert({
        issue_key: newKey,
        summary,
        description,
        issue_type: issueType,
        status: 'To Do',
        status_category: 'new',
        priority: item?.priority ?? 'Medium',
        project_key: projectKey,
        project_name: item?.project_name,
        assignee_display_name: item?.assignee_display_name,
        assignee_account_id: item?.assignee_account_id,
        reporter_display_name: item?.reporter_display_name,
        labels: item?.labels,
      } as any);
      if (error) throw error;
      // Activity log
      await supabase.from('activity_logs').insert({
        entity_id: issueId, entity_type: 'ph_issue',
        action: 'cloned',
        after_json: { cloned_to: newKey },
      });
      return newKey;
    },
    onSuccess: (newKey) => {
      catalystToast.success('Issue cloned', `Cloned as ${newKey}`, undefined, 5000);
      queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
      queryClient.invalidateQueries({ queryKey: ['allwork-items'] });
      onClose();
    },
    onError: () => catalystToast.error('Clone failed'),
  });

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalBase, width: 600, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ds-text, #172B4D)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Copy size={20} color="#0C66E4" /> Clone Issue: {issueKey}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} color="var(--ds-text-subtlest, #6B778C)" /></button>
        </div>

        {/* Step indicator */}
        <div style={{ padding: '12px 24px', display: 'flex', gap: 8 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= step ? '#0C66E4' : 'var(--ds-border, #DFE1E6)',
            }} />
          ))}
        </div>
        <p style={{ padding: '0 24px', fontSize: 13, color: 'var(--ds-text-subtlest, #6B778C)', margin: '0 0 12px' }}>
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>

        <div style={{ padding: '0 24px 20px', flex: 1, overflow: 'auto' }}>
          {/* Step 0: Options */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Project</label>
                <div style={{ ...inputStyle, background: 'var(--ds-surface-sunken, #F4F5F7)', color: 'var(--ds-text, #172B4D)' }}>{projectKey}</div>
              </div>
              <div>
                <label style={labelStyle}>Issue Type</label>
                <select value={issueType} onChange={e => setIssueType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {['Story', 'Task', 'Bug', 'Sub-task', 'Epic', 'Frontend', 'Backend', 'QA Bug'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={labelStyle}>Include</label>
                {[
                  { label: 'Attachments', val: copyAttachments, set: setCopyAttachments },
                  { label: 'Links', val: copyLinks, set: setCopyLinks },
                  { label: 'Comments', val: copyComments, set: setCopyComments },
                ].map(({ label, val, set }) => (
                  <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--ds-text, #172B4D)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={val} onChange={() => set(!val)} style={{ accentColor: '#0C66E4' }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Fields */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Summary *</label>
                <input value={summary} onChange={e => setSummary(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* Step 2: Confirm */}
          {step === 2 && (
            <div style={{ borderTop: '1px solid #EBECF0' }}>
              {[
                ['Project', projectKey],
                ['Issue Type', issueType],
                ['Summary', summary],
                ['Attachments', copyAttachments ? 'Included' : 'Excluded'],
                ['Links', copyLinks ? 'Included' : 'Excluded'],
                ['Comments', copyComments ? 'Included' : 'Excluded'],
                ['Status', 'To Do (new)'],
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid #EBECF0' }}>
                  <span style={{ width: 140, fontSize: 13, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)' }}>{label}</span>
                  <span style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)' }}>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 24px', borderTop: '1px solid #EBECF0', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...btnSecondary, background: 'transparent', color: '#0C66E4' }}>Cancel</button>
          {step > 0 && <button onClick={() => setStep(s => s - 1)} style={btnSecondary}>Back</button>}
          {step < 2 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={step === 1 && !summary.trim()}
              style={{ ...btnPrimary, opacity: (step === 1 && !summary.trim()) ? 0.5 : 1 }}>Next</button>
          ) : (
            <button onClick={() => cloneMutation.mutate()} disabled={cloneMutation.isPending}
              style={btnPrimary}>{cloneMutation.isPending ? 'Cloning...' : 'Clone'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ 3. MOVE WIZARD ═══ */
export function MoveWizard({ issueId, issueKey, item, projectKey, onClose }: {
  issueId: string; issueKey: string; item: any; projectKey: string; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [destProject, setDestProject] = useState(projectKey);
  const [destType, setDestType] = useState(item?.issue_type ?? 'Task');
  const [newStatus, setNewStatus] = useState(item?.status ?? 'To Do');

  // Fetch available projects
  const { data: projects = [] } = useQuery({
    queryKey: ['move-projects'],
    queryFn: async () => {
      const { data } = await supabase.from('ph_jira_projects').select('project_key, project_name').order('project_name');
      return data ?? [];
    },
  });

  const STEPS = ['Destination', 'Field Mapping', 'Status', 'Confirm'];
  const allStatuses = useMemo(() => STATUS_OPTION_GROUPS.flatMap(g => g.statuses), []);

  const fields = [
    { name: 'Summary', current: item?.summary, result: 'Kept' },
    { name: 'Description', current: item?.description ? '(has content)' : '(empty)', result: 'Kept' },
    { name: 'Priority', current: item?.priority, result: 'Kept' },
    { name: 'Assignee', current: item?.assignee_display_name, result: 'Kept' },
    { name: 'Labels', current: item?.labels ? '(has labels)' : '—', result: destProject === projectKey ? 'Kept' : 'Dropped' },
    { name: 'Fix Versions', current: item?.fix_versions ? '(has versions)' : '—', result: destProject === projectKey ? 'Kept' : 'Dropped' },
    { name: 'Parent', current: item?.parent_key ?? '—', result: destProject === projectKey ? 'Kept' : 'Dropped' },
  ];

  const moveMutation = useMutation({
    mutationFn: async () => {
      const updates: any = {
        project_key: destProject,
        issue_type: destType,
        status: newStatus,
        status_category: resolveStatusCategory(newStatus),
      };
      if (destProject !== projectKey) {
        updates.parent_key = null;
        updates.labels = null;
        updates.fix_versions = null;
      }
      const { error } = await supabase.from('ph_issues').update(updates).eq('id', issueId);
      if (error) throw error;
      await supabase.from('activity_logs').insert({
        entity_id: issueId, entity_type: 'ph_issue',
        action: 'moved',
        before_json: { project_key: projectKey, issue_type: item?.issue_type },
        after_json: { project_key: destProject, issue_type: destType },
      });
    },
    onSuccess: () => {
      catalystToast.success('Issue moved');
      queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
      queryClient.invalidateQueries({ queryKey: ['allwork-items'] });
      onClose();
    },
    onError: () => catalystToast.error('Move failed'),
  });

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalBase, width: 640, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ds-text, #172B4D)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowRight size={20} color="#0C66E4" /> Move Issue: {issueKey}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} color="var(--ds-text-subtlest, #6B778C)" /></button>
        </div>
        <div style={{ padding: '12px 24px', display: 'flex', gap: 8 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? '#0C66E4' : 'var(--ds-border, #DFE1E6)' }} />
          ))}
        </div>
        <p style={{ padding: '0 24px', fontSize: 13, color: 'var(--ds-text-subtlest, #6B778C)', margin: '0 0 12px' }}>
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>

        <div style={{ padding: '0 24px 20px', flex: 1, overflow: 'auto' }}>
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Destination Project</label>
                <select value={destProject} onChange={e => setDestProject(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {projects.map((p: any) => (
                    <option key={p.project_key} value={p.project_key}>{p.project_key} — {p.project_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Issue Type</label>
                <select value={destType} onChange={e => setDestType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {['Story', 'Task', 'Bug', 'Epic', 'Sub-task', 'Frontend', 'Backend'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ borderTop: '1px solid #EBECF0' }}>
              <div style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid #EBECF0', fontWeight: 700, fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', textTransform: 'uppercase' }}>
                <span style={{ flex: 1 }}>Field</span>
                <span style={{ width: 180 }}>Current Value</span>
                <span style={{ width: 100, textAlign: 'right' }}>Result</span>
              </div>
              {fields.map(f => (
                <div key={f.name} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #EBECF0', fontSize: 13 }}>
                  <span style={{ flex: 1, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>{f.name}</span>
                  <span style={{ width: 180, color: 'var(--ds-text-subtlest, #6B778C)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.current || '—'}</span>
                  <span style={{ width: 100, textAlign: 'right', fontWeight: 600, color: f.result === 'Dropped' ? '#DE350B' : '#36B37E' }}>{f.result}</span>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              <label style={labelStyle}>Select New Status</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ padding: '4px 10px', borderRadius: 3, background: '#FFFAE6', border: '1px solid #FFE380', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const }}>{item?.status}</span>
                <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>→</span>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 180, cursor: 'pointer' }}>
                  {STATUS_OPTION_GROUPS.map(g => (
                    <optgroup key={g.groupLabel} label={g.groupLabel}>
                      {g.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ borderTop: '1px solid #EBECF0' }}>
              {[
                ['From Project', projectKey],
                ['To Project', destProject],
                ['From Type', item?.issue_type],
                ['To Type', destType],
                ['New Status', newStatus],
                ['Fields Dropped', fields.filter(f => f.result === 'Dropped').map(f => f.name).join(', ') || 'None'],
              ].map(([l, v]) => (
                <div key={l as string} style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid #EBECF0' }}>
                  <span style={{ width: 140, fontSize: 13, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)' }}>{l}</span>
                  <span style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '12px 24px', borderTop: '1px solid #EBECF0', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...btnSecondary, background: 'transparent', color: '#0C66E4' }}>Cancel</button>
          {step > 0 && <button onClick={() => setStep(s => s - 1)} style={btnSecondary}>Back</button>}
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} style={btnPrimary}>Next</button>
          ) : (
            <button onClick={() => moveMutation.mutate()} disabled={moveMutation.isPending}
              style={btnPrimary}>{moveMutation.isPending ? 'Moving...' : 'Move'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ 4. ARCHIVE DIALOG ═══ */
export function ArchiveDialog({ issueId, issueKey, onClose }: {
  issueId: string; issueKey: string; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() } as any).eq('id', issueId);
      await supabase.from('activity_logs').insert({
        entity_id: issueId, entity_type: 'ph_issue', action: 'archived',
      });
    },
    onSuccess: () => {
      catalystToast.success(
        'Issue archived',
        `${issueKey} has been archived and hidden from default views.`,
        undefined,
        5000
      );
      queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
      queryClient.invalidateQueries({ queryKey: ['allwork-items'] });
      onClose();
    },
    onError: () => catalystToast.error('Archive failed'),
  });

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalBase, width: 440, padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ds-text, #172B4D)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Archive size={20} color="var(--ds-text-subtlest, #6B778C)" /> Archive issue?
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} color="var(--ds-text-subtlest, #6B778C)" /></button>
        </div>
        <div style={{ background: '#FFFAE6', border: '1px solid #FFE380', borderRadius: 4, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>
          <strong>{issueKey}</strong> will be hidden from all default views and boards. You can restore it later from the archive.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            style={btnPrimary}>{mutation.isPending ? 'Archiving...' : 'Archive'}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══ 5. DELETE DIALOG ═══ */
export function DeleteDialog({ issueId, issueKey, onClose }: {
  issueId: string; issueKey: string; onClose: () => void;
}) {
  const [confirmKey, setConfirmKey] = useState('');
  const queryClient = useQueryClient();
  const canDelete = confirmKey.trim().toUpperCase() === issueKey.toUpperCase();

  const mutation = useMutation({
    mutationFn: async () => {
      // Soft delete
      await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() } as any).eq('id', issueId);
      await supabase.from('activity_logs').insert({
        entity_id: issueId, entity_type: 'ph_issue', action: 'deleted',
      });
    },
    onSuccess: () => {
      catalystToast.success('Issue deleted', issueKey);
      queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
      queryClient.invalidateQueries({ queryKey: ['allwork-items'] });
      onClose();
    },
    onError: () => catalystToast.error('Delete failed'),
  });

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ ...modalBase, width: 440, padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#DE350B', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trash2 size={20} color="#DE350B" /> Delete issue?
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} color="var(--ds-text-subtlest, #6B778C)" /></button>
        </div>
        <div style={{ background: '#FFEBE6', border: '1px solid #FF8F73', borderRadius: 4, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>
          <AlertTriangle size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom', color: '#DE350B' }} />
          This action <strong>cannot be undone</strong>. All comments, attachments, and history for <strong>{issueKey}</strong> will be permanently removed.
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Type <strong>{issueKey}</strong> to confirm</label>
          <input value={confirmKey} onChange={e => setConfirmKey(e.target.value)}
            placeholder={issueKey} style={inputStyle} autoFocus />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!canDelete || mutation.isPending}
            style={{ ...btnDanger, opacity: canDelete ? 1 : 0.4, cursor: canDelete ? 'pointer' : 'not-allowed' }}>
            {mutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
