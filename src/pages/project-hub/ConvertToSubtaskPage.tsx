/**
 * ConvertToSubtaskPage — Jira-parity wizard for converting an issue into a sub-task.
 *
 * Route: /project-hub/:key/issue/:issueKey/convert-to-subtask
 *
 * Layout:
 *   - Universal shell owns the left sidebar + top header (mounted at the app root).
 *   - This page owns everything else: title + divider, steps rail (left), current
 *     step content (right), shared footer (Next / Cancel).
 *
 * Steps (Jira flow):
 *   1. Select Parent and Sub-task Type
 *   2. Select New Status
 *   3. Update Fields
 *   4. Confirmation
 *
 * Step 1 (this phase): parent-issue picker placeholder + Sub-task type dropdown
 * (single option — "Sub-task"). The parent-picker popover is stubbed for now;
 * Vikram is going to spec it in the next phase.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { StatusLozengeDropdown } from '@/components/shared/StatusLozenge';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { ProfilePicker, type ProfilePickerMember } from '@/components/ads/ProfilePicker';
import { PriorityIcon } from '@/components/icons/PriorityIcon';
import ArrowRightIcon from '@atlaskit/icon/utility/arrow-right';
import InfoIcon from '@atlaskit/icon/utility/information';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useCatalystIssue } from '@/components/catalyst-detail-views/shared/hooks/useCatalystIssue';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystFlag } from '@/lib/catalystFlag';

/* ─── Steps rail model ───────────────────────────────────────────────────── */

interface WizardStep {
  index: number;
  label: string;
  shortHelper: string;
}

const STEPS: WizardStep[] = [
  { index: 1, label: 'Select Parent and Sub-task Type', shortHelper: 'Select parent issue and sub-task type…' },
  { index: 2, label: 'Select New Status', shortHelper: 'Select a valid status for the new sub-task…' },
  { index: 3, label: 'Update Fields', shortHelper: 'Fill in any required fields for the new sub-task type…' },
  { index: 4, label: 'Confirmation', shortHelper: 'Confirm the conversion with all of the details you have just configured.' },
];

/* ─── Style tokens (ADS only) ────────────────────────────────────────────── */

const pageWrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100%',
  background: 'var(--ds-surface)',
  color: 'var(--ds-text)',
};

/* Title left-aligns with the step labels in the rail (Vikram 2026-07-04).
   No dividers anywhere — layout separates via whitespace only. */
const RAIL_WIDTH = 260;
const CONTENT_PADDING_X = 32;
const RAIL_PADDING_LEFT = 32;
const BULLET_SIZE = 10;
const BULLET_GAP = 12;

/* Title now lives INSIDE the content column (not full-width above it). Its
   border-bottom therefore stops at the content column's edges — no long
   line across the empty rail area. */
const titleBar: React.CSSProperties = {
  padding: `0 0 0 0`,
  fontSize: 'var(--ds-font-size-700)',
  fontWeight: 700,
  lineHeight: 1.2,
  color: 'var(--ds-text)',
  borderBottom: '1px solid var(--ds-border)',
  marginBottom: 8,
};

const bodyLayout: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
};

const stepsRail: React.CSSProperties = {
  width: RAIL_WIDTH,
  /* Top padding pushes the first step down so its baseline aligns with the
     BOTTOM of the page title (not vertically centered). Value = content
     padding-top (20) + title height ≈ (font-size-700 * 1.2 ≈ 34) - step text
     height (~18) = ~36. */
  padding: `36px ${CONTENT_PADDING_X}px 24px ${RAIL_PADDING_LEFT}px`,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  flexShrink: 0,
};

/* Step colour states (Jira parity):
   - active   → bold black + blue dot
   - completed→ blue link colour (past step)
   - inactive → gray */
const stepRow = (active: boolean, completed: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: BULLET_GAP,
  color: active ? 'var(--ds-text)' : completed ? 'var(--ds-link)' : 'var(--ds-text-subtle)',
  fontWeight: active ? 700 : 400,
  fontSize: 'var(--ds-font-size-300)',
  lineHeight: 1.35,
});

const stepMetaWrap: React.CSSProperties = {
  paddingLeft: BULLET_SIZE + BULLET_GAP,
  fontSize: 'var(--ds-font-size-200)',
  color: 'var(--ds-text)',
  lineHeight: 1.5,
};

/* Only the ACTIVE step renders a filled brand-bold dot. Inactive steps get
   an invisible spacer of the same size so the label column stays aligned. */
const stepBullet = (active: boolean): React.CSSProperties => ({
  width: BULLET_SIZE,
  height: BULLET_SIZE,
  borderRadius: '50%',
  background: active ? 'var(--ds-background-brand-bold)' : 'transparent',
  flexShrink: 0,
});

const contentArea: React.CSSProperties = {
  flex: 1,
  padding: '20px 32px 24px 0',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  minWidth: 0,
};

/* Footer lives INSIDE the content column so its borders stop at the content
   edges (don't cross the rail area). Buttons left-aligned; Next first, then
   Cancel as a blue link. Top + bottom divider match Jira. */
const footer: React.CSSProperties = {
  padding: '12px 0',
  marginTop: 16,
  borderTop: '1px solid var(--ds-border)',
  borderBottom: '1px solid var(--ds-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 16,
};

const cancelLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '4px 4px',
  cursor: 'pointer',
  color: 'var(--ds-link)',
  fontSize: 'var(--ds-font-size-300)',
  fontWeight: 500,
  fontFamily: 'inherit',
};

const stepHeaderStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-300)',
  lineHeight: 1.5,
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 700,
  color: 'var(--ds-text)',
  fontSize: 'var(--ds-font-size-300)',
  marginBottom: 6,
};

/* Two-column form: label column on the left (right-aligned), value column
   on the right. Matches Jira's convert-to-subtask layout. */
const FIELD_LABEL_COL = 180;

const fieldRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `${FIELD_LABEL_COL}px 1fr`,
  columnGap: 24,
  alignItems: 'start',
};

const fieldRowLabelStyle: React.CSSProperties = {
  fontWeight: 700,
  color: 'var(--ds-text)',
  fontSize: 'var(--ds-font-size-300)',
  textAlign: 'left',
  paddingTop: 6,
};

const helperTextStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-200)',
  color: 'var(--ds-text-subtle)',
  lineHeight: 1.4,
};

const parentPickerBox: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  width: 220,
  minHeight: 32,
  border: '1px solid var(--ds-border-input)',
  borderRadius: 3,
  background: 'var(--ds-surface)',
  color: 'var(--ds-text-subtle)',
  fontSize: 'var(--ds-font-size-300)',
  cursor: 'pointer',
};

const parentPickerLink: React.CSSProperties = {
  color: 'var(--ds-link)',
  fontWeight: 500,
  textDecoration: 'none',
};

/* ─── Component ──────────────────────────────────────────────────────────── */

const SUBTASK_TYPE_OPTIONS = [
  { label: 'Sub-task', value: 'Sub-task' },
];

/**
 * renderFieldEditor — type-aware canonical editor per catalyst_field_layouts
 * row. Falls back to a plain Textfield for unhandled types (fix_versions,
 * severity, issuelink) so the wizard doesn't crash; those get a warning in
 * the label.
 */
function renderFieldEditor({
  field,
  value,
  onChange,
  members,
  priorityOptions,
}: {
  field: { field_key: string; field_label: string; field_type: string; is_system_field: boolean };
  value: any;
  onChange: (v: any) => void;
  members: ProfilePickerMember[];
  priorityOptions: Array<{ value: string; label: string }>;
}): React.ReactNode {
  const t = (field.field_type ?? '').toLowerCase();

  if (t === 'date') {
    return (
      <CatalystDatePicker
        value={value ?? null}
        onChange={(d) => onChange(d ? d.toISOString().split('T')[0] : null)}
      />
    );
  }

  if (t === 'textarea' || field.field_key === 'description') {
    return (
      <TextArea
        value={value ?? ''}
        onChange={(e) => onChange((e.currentTarget as HTMLTextAreaElement).value)}
        minimumRows={4}
        placeholder={`Enter ${field.field_label.toLowerCase()}`}
      />
    );
  }

  if (t === 'user_picker') {
    const selected = value ? members.find((m) => m.userId === value) ?? null : null;
    return (
      <ProfilePicker
        value={selected}
        onChange={(next) => onChange(next?.userId ?? null)}
        members={members}
        fieldLabel={field.field_label}
        bordered
      />
    );
  }

  if (t === 'priority') {
    return (
      <Select
        value={value ? { label: value, value } : null}
        options={priorityOptions}
        onChange={(next) => onChange((next as { value: string } | null)?.value ?? null)}
        placeholder="Select priority"
        isClearable={false}
        isSearchable={false}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        styles={{ menuPortal: (base) => ({ ...base, zIndex: 3000 }) }}
      />
    );
  }

  if (t === 'labels') {
    /* Simple comma-separated labels editor for MVP. Users type
       "one, two, three"; on submit callers split by comma. */
    return (
      <Textfield
        value={Array.isArray(value) ? value.join(', ') : (value ?? '')}
        onChange={(e) => onChange((e.currentTarget as HTMLInputElement).value)}
        placeholder="Comma-separated labels"
      />
    );
  }

  return (
    <Textfield
      value={value ?? ''}
      onChange={(e) => onChange((e.currentTarget as HTMLInputElement).value)}
      placeholder={`Enter ${field.field_label.toLowerCase()}`}
    />
  );
}

/* Bolds the substring of `text` that matches `query` — used in the
   autocomplete rows so the search term stands out (Jira parity). */
function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <strong>{match}</strong>
      {after}
    </>
  );
}

export default function ConvertToSubtaskPage() {
  const { key: projectKey, issueKey } = useParams<{ key: string; issueKey: string }>();
  const navigate = useNavigate();
  const { data: issue } = useCatalystIssue(issueKey ?? '', !!issueKey);

  const [currentStep, setCurrentStep] = useState(1);
  const [parentIssueKey, setParentIssueKey] = useState<string | null>(null);
  const [parentQuery, setParentQuery] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [subtaskType, setSubtaskType] = useState<{ label: string; value: string }>(SUBTASK_TYPE_OPTIONS[0]);

  /* Listen for the parent pick coming back from the Issue Selector browser
     popup (`window.opener.postMessage(...)`). Same origin only. */
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: string; issueKey?: string } | null;
      if (data?.type === 'CONVERT_PARENT_SELECT' && data.issueKey) {
        setParentIssueKey(data.issueKey);
        setParentQuery(data.issueKey);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  /* Parent-issue summary — surfaced in the steps rail after step 1. Only
     summary is used from parent; per Jira semantics the sub-task's STATUS
     stays from the source issue (`issue.status`), not from parent. */
  const { data: parentIssue } = useQuery({
    queryKey: ['convert-parent-issue', parentIssueKey],
    enabled: !!parentIssueKey,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('issue_key, summary')
        .eq('issue_key', parentIssueKey!)
        .maybeSingle();
      return data as { issue_key: string; summary: string } | null;
    },
  });

  /* Allowed statuses for the Sub-task workflow in this project. Drives Step 2
     conditional display: if source's current status is in this list → step
     is skipped (Jira parity); otherwise step 2 shows a dropdown of valid
     statuses. Query chain (canonical → legacy → last-resort):
       1. `ph_workflow_type_statuses` join `ph_workflow_statuses` for
          (project_id, work_item_type='Sub-task') — CANONICAL per-type list.
       2. `ph_project_workflow_assignments` → `template_id` →
          `ph_workflow_template_statuses` — legacy template-based path.
       3. `ph_workflow_statuses` project-wide — coarse fallback only when
          the project has no Sub-task workflow configured at all. */
  const { data: subtaskStatuses = [] } = useQuery({
    queryKey: ['convert-subtask-statuses', issue?.project_key],
    enabled: !!issue?.project_key,
    staleTime: 60_000,
    queryFn: async (): Promise<Array<{ name: string; category: string }>> => {
      const pk = issue!.project_key;
      const { data: proj } = await supabase
        .from('ph_projects')
        .select('id')
        .eq('key', pk)
        .maybeSingle();
      const projectId = (proj as { id: string } | null)?.id;
      if (!projectId) return [];

      /* 1. CANONICAL: per-type status list — this is the shortlist that
            the Sub-task type can actually transition into on this project.
            Two-step query (id list → hydrate) to sidestep PostgREST embed
            RLS quirks that can silently return empty rows. */
      const { data: typeRows } = await (supabase as any)
        .from('ph_workflow_type_statuses')
        .select('status_id, position')
        .eq('project_id', projectId)
        .eq('work_item_type', 'Sub-task')
        .order('position', { ascending: true });
      const statusIds = ((typeRows ?? []) as Array<{ status_id: string }>)
        .map((r) => r.status_id)
        .filter(Boolean);
      if (statusIds.length > 0) {
        const { data: canonical } = await supabase
          .from('ph_workflow_statuses')
          .select('name, category, archived_at')
          .in('id', statusIds)
          .is('archived_at', null);
        if (canonical && canonical.length > 0) {
          return canonical.map((s: any) => ({ name: s.name, category: s.category }));
        }
      }

      /* 2. LEGACY template path — projects that use ph_workflow_templates. */
      const { data: assign } = await (supabase as any)
        .from('ph_project_workflow_assignments')
        .select('template_id')
        .eq('project_id', projectId)
        .eq('work_item_type', 'Sub-task')
        .maybeSingle();
      const templateId = (assign as { template_id: string | null } | null)?.template_id;
      if (templateId) {
        const { data: tstatuses } = await supabase
          .from('ph_workflow_template_statuses')
          .select('name, category')
          .eq('template_id', templateId);
        if (tstatuses && tstatuses.length > 0) {
          return tstatuses as Array<{ name: string; category: string }>;
        }
      }

      /* 3. Last resort — project-wide list. Broad, but strictly better than
            empty (empty would silently skip step 2 or force an unusable
            picker). Only reached when the project has no Sub-task workflow
            configured at all. */
      const { data: pstatuses } = await supabase
        .from('ph_workflow_statuses')
        .select('name, category')
        .eq('project_id', projectId)
        .is('archived_at', null)
        .order('position', { ascending: true });
      return (pstatuses ?? []) as Array<{ name: string; category: string }>;
    },
  });

  /* Case-insensitive check — status names may vary in casing across projects.
     Guard flip (2026-07-04): if the allowed-status list is empty (RLS block,
     query still loading, or truly unconfigured), assume INVALID so step 2 is
     shown. Previous default (assume valid → skip) let step 2 be silently
     bypassed whenever the query returned empty, which was wrong for issues
     whose status wasn't in the project workflow. */
  const sourceStatusValid = useMemo(() => {
    if (!issue?.status) return true;
    if (subtaskStatuses.length === 0) return false;
    const target = issue.status.trim().toLowerCase();
    return subtaskStatuses.some((s) => s.name.trim().toLowerCase() === target);
  }, [issue?.status, subtaskStatuses]);

  /* Sub-task required fields in this project. `project_key = null` rows are
     GLOBAL defaults and apply when there's no project-specific override —
     match Jira "default field configuration". Fields already handled by the
     wizard (summary/parent/status) are excluded from the step-3 diff.
     Fetched only when the wizard reaches step 3. */
  const HANDLED_BY_WIZARD = new Set(['summary', 'parent', 'parent_key', 'status']);
  const { data: subtaskRequiredFields = [] } = useQuery({
    queryKey: ['convert-subtask-required-fields', issue?.project_key],
    enabled: !!issue?.project_key && currentStep >= 3,
    staleTime: 60_000,
    queryFn: async (): Promise<Array<{ field_key: string; field_label: string; field_type: string; is_system_field: boolean }>> => {
      const pk = issue!.project_key;
      /* Try project-specific first. */
      const { data: proj } = await supabase
        .from('catalyst_field_layouts')
        .select('field_key, field_label, field_type, is_system_field')
        .eq('project_key', pk)
        .eq('issue_type', 'Sub-task')
        .eq('is_required', true);
      if (proj && proj.length > 0) {
        return proj as Array<{ field_key: string; field_label: string; field_type: string; is_system_field: boolean }>;
      }
      /* Fallback to global defaults (project_key IS NULL). */
      const { data: global } = await supabase
        .from('catalyst_field_layouts')
        .select('field_key, field_label, field_type, is_system_field')
        .is('project_key', null)
        .eq('issue_type', 'Sub-task')
        .eq('is_required', true);
      return (global ?? []) as Array<{ field_key: string; field_label: string; field_type: string; is_system_field: boolean }>;
    },
  });

  /* Step-3 diff: sub-task required fields the source did NOT populate. Values
     handled elsewhere in the wizard (summary/parent/status) are excluded so
     the user isn't asked twice. */
  const stepThreeMissingFields = useMemo(() => {
    if (!issue) return [];
    return subtaskRequiredFields.filter((f) => {
      if (HANDLED_BY_WIZARD.has(f.field_key)) return false;
      const value = (issue as unknown as Record<string, unknown>)[f.field_key];
      if (value === null || value === undefined) return true;
      if (typeof value === 'string' && value.trim() === '') return true;
      if (Array.isArray(value) && value.length === 0) return true;
      return false;
    });
  }, [issue, subtaskRequiredFields]);

  /* Field patch stores raw values per field_key. Values are typed loosely
     because the step-3 form covers heterogeneous inputs (text/date/select/
     user/priority) — callers cast on submit. */
  const [fieldPatch, setFieldPatch] = useState<Record<string, any>>({});

  /* Approved profiles — used to populate `user_picker` field renderers. */
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['convert-all-profiles'],
    enabled: currentStep >= 3 && stepThreeMissingFields.some((f) => f.field_type === 'user_picker'),
    staleTime: 300_000,
    queryFn: async (): Promise<ProfilePickerMember[]> => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('approval_status', 'APPROVED');
      return (data ?? []).map((p: any) => ({
        userId: p.id,
        name: p.full_name ?? p.email ?? 'Unknown',
        email: p.email ?? null,
        avatarUrl: p.avatar_url ?? null,
      }));
    },
  });

  const PRIORITY_OPTIONS = [
    { value: 'Highest', label: 'Highest' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
    { value: 'Lowest', label: 'Lowest' },
  ];

  const openIssueSelectorPopup = () => {
    if (!projectKey) return;
    const url = `/project-hub/${projectKey}/issue-selector?source=${encodeURIComponent(issueKey ?? '')}`;
    const features = 'width=900,height=700,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes';
    window.open(url, 'IssueSelector', features);
  };

  /* Type-ahead suggestions — searches ph_issues by key or summary in the
     current project, excludes subtask-type rows and the source issue itself.
     Returns `{ rows, total }` so the header can show "Showing N of M".
     `suggestLimit` grows on scroll to the bottom (infinite scroll). */
  const SUGGEST_PAGE = 20;
  const [suggestLimit, setSuggestLimit] = useState(SUGGEST_PAGE);
  const inputWrapperRef = useRef<HTMLDivElement | null>(null);
  const dropdownListRef = useRef<HTMLDivElement | null>(null);

  /* Reset the page window whenever the query changes so a new search starts
     from the first N rows. */
  useEffect(() => {
    setSuggestLimit(SUGGEST_PAGE);
  }, [parentQuery]);

  const { data: suggestionResult } = useQuery({
    queryKey: ['convert-parent-suggest', projectKey, issueKey, parentQuery, suggestLimit],
    enabled: suggestOpen && !!projectKey && parentQuery.trim().length > 0,
    staleTime: 15_000,
    queryFn: async () => {
      const q = parentQuery.trim();
      const { data, count } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, issue_type', { count: 'exact' })
        .eq('project_key', projectKey!)
        .is('deleted_at', null)
        .or(`issue_key.ilike.%${q}%,summary.ilike.%${q}%`)
        .limit(suggestLimit);
      const raw = (data ?? []) as Array<{ issue_key: string; summary: string; issue_type: string | null }>;
      const rows = raw.filter((r) => {
        if (r.issue_key === issueKey) return false;
        const t = (r.issue_type ?? '').toLowerCase().trim();
        return !['sub-task','subtask','backend','frontend','integration'].includes(t);
      });
      return { rows, total: count ?? rows.length };
    },
  });
  const suggestions = suggestionResult?.rows ?? [];
  const suggestionsTotal = suggestionResult?.total ?? suggestions.length;

  /* Portal-position the dropdown relative to the input so it isn't clipped
     by parent overflow/stacking contexts. Re-measured on open + on scroll/
     resize while open. */
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  useEffect(() => {
    if (!suggestOpen) { setDropdownPos(null); return; }
    const measure = () => {
      const el = inputWrapperRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 4, left: r.left, width: 460 });
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [suggestOpen]);

  const projectName = issue?.project_name ?? projectKey ?? '';
  const workType = issue?.issue_type ?? 'Issue';
  const sourceStatus = issue?.status ?? null;
  const activeStep = useMemo(() => STEPS.find((s) => s.index === currentStep) ?? STEPS[0], [currentStep]);

  /* Jira parity: step 2 is required only when the source's current status
     is NOT valid under the Sub-task workflow for this project. */
  const stepNeedsStatus = !sourceStatusValid;

  /* Effective status after conversion: source's status if valid; else the
     user-picked new status from step 2. */
  const [selectedNewStatus, setSelectedNewStatus] = useState<string | null>(null);
  const effectiveStatus = sourceStatusValid ? sourceStatus : selectedNewStatus;

  const canGoNext =
    currentStep === 1 ? !!parentIssueKey :
    currentStep === 2 ? !!selectedNewStatus :
    currentStep === 3
      ? stepThreeMissingFields.every((f) => {
          const v = fieldPatch[f.field_key];
          if (v === undefined || v === null) return false;
          if (typeof v === 'string') return v.trim().length > 0;
          return true;
        })
      : currentStep === 4 ? true :
    false;

  /* Confirmation table (Step 4) — one row per field that will change. */
  const step4DiffRows: Array<{ key: string; label: string; original: string | null; next: string | null }> = [];
  step4DiffRows.push({
    key: 'type',
    label: 'Type',
    original: workType,
    next: subtaskType.label,
  });
  if (parentIssueKey && parentIssueKey !== issue?.parent_key) {
    step4DiffRows.push({
      key: 'parent',
      label: 'Parent',
      original: issue?.parent_key ?? null,
      next: parentIssueKey,
    });
  }
  if (stepNeedsStatus && selectedNewStatus && selectedNewStatus !== sourceStatus) {
    step4DiffRows.push({
      key: 'status',
      label: 'Status',
      original: sourceStatus,
      next: selectedNewStatus,
    });
  }
  stepThreeMissingFields.forEach((f) => {
    const val = fieldPatch[f.field_key];
    if (val === undefined || val === null || val === '') return;
    const originalVal = (issue as any)?.[f.field_key];
    step4DiffRows.push({
      key: f.field_key,
      label: f.field_label,
      original: originalVal !== undefined && originalVal !== null && originalVal !== '' ? String(originalVal) : null,
      next: typeof val === 'string' ? val : String(val),
    });
  });

  const handleCancel = () => navigate(-1);
  const queryClient = useQueryClient();
  const [converting, setConverting] = useState(false);

  const handleFinish = async () => {
    if (!issueKey || !issue?.id) return;
    setConverting(true);
    try {
      const patch: Record<string, unknown> = {
        issue_type: subtaskType.value,
        parent_key: parentIssueKey,
      };
      if (stepNeedsStatus && selectedNewStatus) {
        patch.status = selectedNewStatus;
        const cat = subtaskStatuses.find((s) => s.name === selectedNewStatus)?.category;
        if (cat) patch.status_category = cat;
      }
      /* Apply step-3 field patch — best-effort passthrough to matching ph_issues
         columns. Unknown columns silently fail (Supabase rejects). */
      for (const f of stepThreeMissingFields) {
        const v = fieldPatch[f.field_key];
        if (v === undefined || v === null || v === '') continue;
        patch[f.field_key] = v;
      }

      const { error } = await supabase
        .from('ph_issues')
        .update(patch as any)
        .eq('id', issue.id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', issueKey] });
      catalystFlag.success({
        title: `Converted ${issueKey} to Sub-task`,
        description: `Parent: ${parentIssueKey}`,
      });
      /* Navigate to the converted item's detail page — same issue_key. The
         canonical breadcrumb + shell render there. */
      navigate(`/project-hub/${projectKey}/issue/${issueKey}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as any)?.message ?? 'Unknown error';
      catalystFlag.error({ title: 'Conversion failed', description: msg });
    } finally {
      setConverting(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 4) {
      void handleFinish();
      return;
    }
    setCurrentStep((prev) => {
      /* Step 1 → skip step 2 unless the workflow-compat check needs it. */
      if (prev === 1) return stepNeedsStatus ? 2 : 3;
      if (prev === 2) return 3;
      if (prev === 3) return 4;
      return prev;
    });
  };

  /* TEMP DEBUG (2026-07-04) — remove once verified. Logs the values that
     drive step-2 skipping so Vikram can see them in the browser console. */
  if (typeof window !== 'undefined') {
    (window as any).__convertDebug = {
      issueKey,
      sourceStatus,
      workType,
      projectKey,
      subtaskStatusCount: subtaskStatuses.length,
      subtaskStatuses: subtaskStatuses.map((s) => s.name),
      sourceStatusValid,
      stepNeedsStatus,
      currentStep,
    };
  }

  return (
    <div style={pageWrap}>
      <div style={bodyLayout}>
        {/* Uses <div> not <aside> — global sidebar CSS in index.css paints
           EVERY <aside> with `--bg-1` bg + inset right-border, which showed
           up here as the phantom "gray rail with vertical divider". */}
        <div role="navigation" aria-label="Convert wizard steps" style={stepsRail}>
          {STEPS.map((s) => {
            const active = s.index === currentStep;
            const completed = s.index < currentStep;
            return (
              <div key={s.index} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={stepRow(active, completed)}>
                  <span aria-hidden="true" style={stepBullet(active)} />
                  <span>{s.label}</span>
                </div>
                {completed && s.index === 1 && parentIssueKey && (
                  <div style={stepMetaWrap}>
                    <div><strong>Parent Issue:</strong> {parentIssueKey}</div>
                    <div><strong>Sub-task Type:</strong> {subtaskType.label}</div>
                  </div>
                )}
                {completed && s.index === 2 && effectiveStatus && (
                  <div style={stepMetaWrap}>
                    <div><strong>Status:</strong> {effectiveStatus}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={contentArea}>
          <div style={titleBar}>
            Convert Issue to Sub-task: {issueKey ?? ''}
          </div>
          <div style={stepHeaderStyle}>
            <span style={{ fontWeight: 700, color: 'var(--ds-text)' }}>
              Step {activeStep.index} of {STEPS.length}
            </span>
            <span style={{ color: 'var(--ds-text-subtle)' }}>
              {': '}{activeStep.shortHelper}
            </span>
          </div>

          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingLeft: 32 }}>
              <div style={fieldRowStyle}>
                <label style={fieldRowLabelStyle}>Select Parent Issue:</label>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                    <div ref={inputWrapperRef} style={{ ...parentPickerBox, position: 'relative' }}>
                      <input
                        type="text"
                        value={parentQuery}
                        onChange={(e) => {
                          setParentQuery(e.target.value);
                          setSuggestOpen(true);
                          if (parentIssueKey && e.target.value !== parentIssueKey) {
                            setParentIssueKey(null);
                          }
                        }}
                        onFocus={() => setSuggestOpen(true)}
                        onBlur={() => window.setTimeout(() => setSuggestOpen(false), 150)}
                        placeholder=""
                        style={{
                          flex: 1,
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          padding: 0,
                          fontSize: 'var(--ds-font-size-300)',
                          color: 'var(--ds-text)',
                        }}
                      />
                      {suggestOpen && parentQuery.trim().length > 0 && suggestions.length > 0 && dropdownPos && createPortal(
                        <div
                          /* Prevent input blur when interacting with the dropdown
                             (scrollbar drag, row click). Without this, the input's
                             onBlur closes the dropdown before the scroll registers. */
                          onMouseDown={(e) => e.preventDefault()}
                          style={{
                            position: 'fixed',
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            width: dropdownPos.width,
                            background: 'var(--ds-surface-overlay)',
                            border: '1px solid var(--ds-border)',
                            borderRadius: 3,
                            boxShadow: 'var(--ds-shadow-overlay)',
                            zIndex: 3000,
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          <div style={{ padding: '6px 10px', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', borderBottom: '1px solid var(--ds-border)' }}>
                            History Search(Showing {suggestions.length} of {suggestionsTotal} matching issues)
                          </div>
                          <div
                            ref={dropdownListRef}
                            /* Fixed height for ~8 rows (row = 30px). Infinite scroll
                               kicks in when the user hits ~32px from the bottom. */
                            style={{ maxHeight: 240, overflowY: 'auto' }}
                            onScroll={(e) => {
                              const el = e.currentTarget;
                              if (
                                el.scrollTop + el.clientHeight >= el.scrollHeight - 32 &&
                                suggestions.length < suggestionsTotal
                              ) {
                                setSuggestLimit((n) => n + SUGGEST_PAGE);
                              }
                            }}
                          >
                            {suggestions.map((s) => (
                              <button
                                key={s.issue_key}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setParentIssueKey(s.issue_key);
                                  setParentQuery(s.issue_key);
                                  setSuggestOpen(false);
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  width: '100%', padding: '6px 10px',
                                  background: 'none',
                                  border: 'none',
                                  borderBottom: '1px solid var(--ds-border)',
                                  textAlign: 'left',
                                  fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span aria-hidden="true" style={{ display: 'inline-flex', flexShrink: 0 }}>
                                  <JiraIssueTypeIcon type={s.issue_type ?? 'Task'} size={16} />
                                </span>
                                <span style={{ color: 'var(--ds-text)' }}>
                                  {highlightMatch(s.issue_key, parentQuery)}
                                </span>
                                <span style={{ color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {s.summary}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>,
                        document.body,
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={openIssueSelectorPopup}
                      style={{ ...parentPickerLink, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      [select issue]
                    </button>
                  </div>
                  <div style={{ ...helperTextStyle, marginTop: 8 }}>
                    <div>Begin typing to search for issues to link</div>
                    <div>
                      Only non-sub-task issues from the same project <strong>{projectName}</strong> can be selected.
                    </div>
                  </div>
                </div>
              </div>

              <div style={fieldRowStyle}>
                <label style={fieldRowLabelStyle}>Select Sub-task Type:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>
                    Current Issue Type: <strong>{workType}</strong>
                  </span>
                  <span aria-hidden="true" style={{ display: 'inline-flex', color: 'var(--ds-icon)' }}>
                    <ArrowRightIcon label="" />
                  </span>
                  <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', fontWeight: 500 }}>
                    New Sub-task Type:
                  </span>
                  <div style={{ minWidth: 160 }}>
                    <Select
                      value={subtaskType}
                      options={SUBTASK_TYPE_OPTIONS}
                      onChange={(next) => next && setSubtaskType(next as any)}
                      isClearable={false}
                      isSearchable={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingLeft: 32 }}>
              <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>
                The current status <strong>{sourceStatus}</strong> is not a valid status for the new
                sub-task workflow. Please select a new status.
              </div>
              <div style={fieldRowStyle}>
                <label style={fieldRowLabelStyle}>New Status:</label>
                <div>
                  {/* Canonical pill dropdown — same component the detail-view
                     sidebar uses. `statusOptions` bypass the transition-filter
                     so every valid sub-task status is selectable as a starting
                     value. */}
                  {/* `issueType` intentionally omitted — passing 'Sub-task'
                     activates the canonical workflow's `requiresReason` gate,
                     which swallows the pick before `onStatusChange` fires and
                     leaves `selectedNewStatus` null → trigger stays gray on
                     'Backlog' default. Injected `statusOptions` still win over
                     the STATUS_OPTION_GROUPS fallback via `activeGroups`. */}
                  <StatusLozengeDropdown
                    /* Placeholder label until the user picks — the dropdown's
                       default fallback ('Backlog') was misleading + rendered
                       as a real status pill on first paint. */
                    status={selectedNewStatus ?? 'Select a status'}
                    statusOptions={subtaskStatuses.map((s) => ({
                      value: s.name,
                      label: s.name,
                      color_category: s.category,
                    }))}
                    onStatusChange={(next) => setSelectedNewStatus(next)}
                    interactive
                    size="md"
                    lockWhenDone={false}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingLeft: 32 }}>
              {/* "Step 2 not required" note only when step 2 was skipped —
                  Jira parity (2026-07-04). */}
              {!stepNeedsStatus && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingLeft: 60 }}>
                  <span aria-hidden="true" style={{ display: 'inline-flex', color: 'var(--ds-icon-brand)', marginTop: 2 }}>
                    <InfoIcon label="" />
                  </span>
                  <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>
                    <strong>Note:</strong> Step 2 is not required.
                  </div>
                </div>
              )}

              {stepThreeMissingFields.length === 0 ? (
                <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>
                  All fields will be updated automatically.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)' }}>
                    The following fields are required on <strong>Sub-task</strong> but not set on the source item. Please fill them in:
                  </div>
                  {stepThreeMissingFields.map((f) => (
                    <div key={f.field_key} style={fieldRowStyle}>
                      <label style={fieldRowLabelStyle}>{f.field_label}:</label>
                      <div style={{ width: 320 }}>
                        {renderFieldEditor({
                          field: f,
                          value: fieldPatch[f.field_key],
                          onChange: (v) => setFieldPatch((prev) => ({ ...prev, [f.field_key]: v })),
                          members: allProfiles,
                          priorityOptions: PRIORITY_OPTIONS,
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingLeft: 32 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr 1fr',
                columnGap: 24,
                rowGap: 12,
                fontSize: 'var(--ds-font-size-300)',
              }}>
                <div style={{ borderBottom: '1px solid var(--ds-border)', paddingBottom: 8 }} />
                <div style={{ fontWeight: 700, color: 'var(--ds-text)', paddingBottom: 8, borderBottom: '1px solid var(--ds-border)' }}>
                  Original Value (before conversion)
                </div>
                <div style={{ fontWeight: 700, color: 'var(--ds-text)', paddingBottom: 8, borderBottom: '1px solid var(--ds-border)' }}>
                  New Value (after conversion)
                </div>

                {step4DiffRows.map((row) => (
                  <React.Fragment key={row.key}>
                    <div style={{ fontWeight: 700, color: 'var(--ds-text)' }}>{row.label}</div>
                    <div style={{ color: 'var(--ds-text-danger)' }}>{row.original ?? 'None'}</div>
                    <div style={{ color: 'var(--ds-text-success)' }}>{row.next ?? 'None'}</div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          <div style={footer}>
            <Button
              appearance="primary"
              isDisabled={!canGoNext || converting}
              onClick={handleNext}
            >
              {currentStep === 4 ? (converting ? 'Converting…' : 'Finish') : 'Next >>'}
            </Button>
            <button type="button" onClick={handleCancel} style={cancelLinkStyle}>
              Cancel
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
