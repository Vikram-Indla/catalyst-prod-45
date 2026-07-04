/**
 * MovePage — Jira-parity wizard for moving a work item to another project
 * (+ optionally switching its issue type).
 *
 * Route: /project-hub/:key/issue/:issueKey/move
 *
 * Steps (Jira):
 *   1. Select destination project and issue type   (this phase)
 *   2. Map statuses                                (later phase)
 *   3. Update fields                               (later phase)
 *   4. Confirm changes                             (later phase)
 *
 * Layout mirrors ConvertToSubtaskPage: stepper rail on the left, current
 * step content on the right, common footer with Next/Cancel.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { catalystFlag } from '@/lib/catalystFlag';
import Button from '@atlaskit/button/new';
import Select, { components as SelectComponents, type OptionProps, type SingleValueProps } from '@atlaskit/select';
import ArrowRightIcon from '@atlaskit/icon/utility/arrow-right';
import QuestionCircleIcon from '@atlaskit/icon/glyph/question-circle';
import Tooltip from '@atlaskit/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useCatalystIssue } from '@/components/catalyst-detail-views/shared/hooks/useCatalystIssue';
import { generateIssueKey } from '@/modules/project-work-hub/lib/generateIssueKey';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { ProjectIcon as CanonicalProjectIcon } from '@/components/shared/ProjectIcon';
import { StatusLozenge, StatusLozengeDropdown } from '@/components/shared/StatusLozenge';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';

/* ─── Wizard step model (mirrors ConvertToSubtaskPage) ───────────────────── */

function buildSteps(kindLabel: 'Project' | 'Product') {
  return [
    { index: 1, label: `Select destination ${kindLabel.toLowerCase()} and work type` },
    { index: 2, label: 'Map statuses' },
    { index: 3, label: 'Update fields' },
    { index: 4, label: 'Confirm changes' },
  ] as const;
}

/* ─── Style tokens (ADS only) ────────────────────────────────────────────── */

const pageWrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100%',
  background: 'var(--ds-surface)',
  color: 'var(--ds-text)',
};

const RAIL_WIDTH = 280;
const CONTENT_PADDING_X = 32;
const RAIL_PADDING_LEFT = 32;
const BULLET_SIZE = 10;
const BULLET_GAP = 12;

/* Page title lives at the top-left of the page (above the stepper + content
   split). No divider — Jira-parity reference (2026-07-04 Vikram). */
const pageTitleStyle: React.CSSProperties = {
  padding: '24px 32px 4px',
  fontSize: 'var(--ds-font-size-700)',
  fontWeight: 700,
  lineHeight: 1.2,
  color: 'var(--ds-text)',
};

const bodyLayout: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  minHeight: 0,
};

const stepsRail: React.CSSProperties = {
  width: RAIL_WIDTH,
  padding: `36px ${CONTENT_PADDING_X}px 24px ${RAIL_PADDING_LEFT}px`,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  flexShrink: 0,
};

const stepRow = (active: boolean, completed: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: BULLET_GAP,
  color: active ? 'var(--ds-text)' : completed ? 'var(--ds-link)' : 'var(--ds-text-subtle)',
  fontWeight: active ? 700 : 400,
  fontSize: 'var(--ds-font-size-400)',
  lineHeight: 1.35,
});

const stepMetaWrap: React.CSSProperties = {
  paddingLeft: BULLET_SIZE + BULLET_GAP,
  fontSize: 'var(--ds-font-size-300)',
  color: 'var(--ds-text)',
  lineHeight: 1.5,
};

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

const stepTitleStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-500)',
  fontWeight: 700,
  color: 'var(--ds-text)',
  paddingBottom: 8,
  borderBottom: '1px solid var(--ds-border)',
};

const stepDescStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-200)',
  color: 'var(--ds-text-subtle)',
  lineHeight: 1.5,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 'var(--ds-font-size-200)',
  color: 'var(--ds-text-subtle)',
  marginBottom: 4,
};

const inlineFieldRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '160px 180px 20px 120px 1fr',
  alignItems: 'center',
  columnGap: 14,
};

const boldFieldLabelStyle: React.CSSProperties = {
  fontWeight: 700,
  color: 'var(--ds-text)',
  fontSize: 'var(--ds-font-size-200)',
};

/* ─── Option renderers for canonical icon + label pairs ──────────────────── */

interface ProjectOption {
  value: string;
  label: string;
  key: string;
  icon: string | null;
  color: string | null;
}

interface TypeOption {
  value: string;
  label: string;
}

function ProjectOptionInner(props: OptionProps<ProjectOption, false>) {
  return (
    <SelectComponents.Option {...props}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 'var(--ds-font-size-200)' }}>
        <CanonicalProjectIcon
          projectKey={props.data.key}
          iconName={props.data.icon}
          color={props.data.color}
          name={props.data.label}
          size="xsmall"
        />
        <span>{props.data.label} ({props.data.key})</span>
      </span>
    </SelectComponents.Option>
  );
}

function ProjectSingleValue(props: SingleValueProps<ProjectOption, false>) {
  return (
    <SelectComponents.SingleValue {...props}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 'var(--ds-font-size-200)' }}>
        <CanonicalProjectIcon
          projectKey={props.data.key}
          iconName={props.data.icon}
          color={props.data.color}
          name={props.data.label}
          size="xsmall"
        />
        <span>{props.data.label} ({props.data.key})</span>
      </span>
    </SelectComponents.SingleValue>
  );
}

function TypeOptionInner(props: OptionProps<TypeOption, false>) {
  return (
    <SelectComponents.Option {...props}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 'var(--ds-font-size-200)' }}>
        <JiraIssueTypeIcon type={props.data.value} size={14} />
        <span>{props.data.label}</span>
      </span>
    </SelectComponents.Option>
  );
}

function TypeSingleValue(props: SingleValueProps<TypeOption, false>) {
  return (
    <SelectComponents.SingleValue {...props}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 'var(--ds-font-size-200)' }}>
        <JiraIssueTypeIcon type={props.data.value} size={14} />
        <span>{props.data.label}</span>
      </span>
    </SelectComponents.SingleValue>
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */

/**
 * renderMoveFieldEditor — type-aware canonical editor per
 * catalyst_field_layouts row. Mirrors the version in ConvertToSubtaskPage
 * so the diff form looks + behaves identically across both wizards.
 */
function renderMoveFieldEditor({
  field,
  value,
  onChange,
}: {
  field: { field_key: string; field_label: string; field_type: string; is_system_field: boolean };
  value: any;
  onChange: (v: any) => void;
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

  if (t === 'labels') {
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

export default function MovePage() {
  const { key: projectKey, issueKey, requestKey } = useParams<{ key: string; issueKey: string; requestKey: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  /* Container-kind detection — routes:
       project:  /project-hub/:key/issue/:issueKey/move
       product:  /product-hub/requests/:requestKey/move
     Vikram (2026-07-04): project items may only move into projects;
     product items may only move into products. Labels + queries switch
     off this single flag. */
  const containerKind: 'project' | 'product' =
    location.pathname.includes('/product-hub/') ? 'product' : 'project';

  const sourcePhKey = containerKind === 'project' ? (issueKey ?? '') : '';
  const { data: issue } = useCatalystIssue(sourcePhKey, !!sourcePhKey);

  /* Product-source: fetch business_requests row when in product mode. */
  const { data: brSource } = useQuery({
    queryKey: ['move-br-source', requestKey],
    enabled: containerKind === 'product' && !!requestKey,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('business_requests')
        .select('id, request_key, title, product_id, process_step')
        .eq('request_key', requestKey!)
        .maybeSingle();
      return data as { id: string; request_key: string; title: string; product_id: string; process_step: string | null } | null;
    },
  });

  const kindLabel: 'Project' | 'Product' = containerKind === 'project' ? 'Project' : 'Product';
  const STEPS = useMemo(() => buildSteps(kindLabel), [kindLabel]);

  const [currentStep, setCurrentStep] = useState(1);
  const [newProject, setNewProject] = useState<ProjectOption | null>(null);
  const [newIssueType, setNewIssueType] = useState<TypeOption | null>(null);
  const [mappedStatus, setMappedStatus] = useState<string | null>(null);
  const [moveFieldPatch, setMoveFieldPatch] = useState<Record<string, any>>({});

  /* Target-container list — kind-specific.
     `project`: ph_projects filtered to exclude rows that overlap with the
        `products` table (a project item can never land inside a product).
     `product`: `products` table only, excluding the source product. */
  const { data: projectOptions = [] } = useQuery({
    queryKey: ['move-target-containers', containerKind, projectKey, brSource?.product_id],
    enabled: containerKind === 'project'
      ? !!projectKey
      : !!brSource?.product_id,
    staleTime: 300_000,
    queryFn: async (): Promise<ProjectOption[]> => {
      if (containerKind === 'product') {
        const { data } = await (supabase as any)
          .from('products')
          .select('id, code, name, icon_key, color')
          .eq('is_active', true)
          .neq('id', brSource!.product_id)
          .order('name', { ascending: true });
        return ((data ?? []) as Array<{ id: string; code: string | null; name: string; icon_key: string | null; color: string | null }>)
          .map((p) => ({ value: p.id, key: p.code ?? '', label: p.name, icon: p.icon_key, color: p.color }));
      }
      const [{ data: projects }, { data: products }] = await Promise.all([
        supabase
          .from('ph_projects')
          .select('id, key, name, icon, color')
          .is('archived_at', null)
          .neq('key', projectKey!)
          .order('name', { ascending: true }),
        (supabase as any)
          .from('products')
          .select('code, jira_project_key'),
      ]);
      const productKeys = new Set<string>();
      for (const row of (products ?? []) as Array<{ code: string | null; jira_project_key: string | null }>) {
        if (row.code) productKeys.add(row.code);
        if (row.jira_project_key) productKeys.add(row.jira_project_key);
      }
      return ((projects ?? []) as Array<{ id: string; key: string; name: string; icon: string | null; color: string | null }>)
        .filter((p) => !productKeys.has(p.key))
        .map((p) => ({ value: p.id, key: p.key, label: p.name, icon: p.icon, color: p.color }));
    },
  });

  /* Work types available on the destination container.
     - project kind: distinct `ph_issues.issue_type` on the target project,
       with `ph_workflow_type_statuses` fallback.
     - product kind: fixed to `Business Request` — the only work type that
       lives directly under a product. */
  const { data: typeOptions = [] } = useQuery({
    queryKey: ['move-target-types', containerKind, newProject?.key, newProject?.value],
    enabled: !!newProject?.value,
    staleTime: 300_000,
    queryFn: async (): Promise<TypeOption[]> => {
      if (containerKind === 'product') {
        return [{ value: 'Business Request', label: 'Business Request' }];
      }

      const collect = new Set<string>();
      const { data: issueRows } = await supabase
        .from('ph_issues')
        .select('issue_type')
        .eq('project_key', newProject!.key)
        .is('deleted_at', null)
        .not('issue_type', 'is', null)
        .limit(5000);
      for (const row of (issueRows ?? []) as Array<{ issue_type: string | null }>) {
        if (row.issue_type) collect.add(row.issue_type);
      }

      if (collect.size === 0) {
        const { data: wfRows } = await (supabase as any)
          .from('ph_workflow_type_statuses')
          .select('work_item_type')
          .eq('project_id', newProject!.value);
        for (const row of (wfRows ?? []) as Array<{ work_item_type: string }>) {
          if (row.work_item_type) collect.add(row.work_item_type);
        }
      }

      return Array.from(collect)
        .sort((a, b) => a.localeCompare(b))
        .map((t) => ({ value: t, label: t }));
    },
  });

  /* Auto-select the sole "Business Request" option in product mode so the
     user only has to pick the destination product. */
  useEffect(() => {
    if (containerKind === 'product' && typeOptions.length === 1 && !newIssueType) {
      setNewIssueType(typeOptions[0]);
    }
  }, [containerKind, typeOptions, newIssueType]);

  const sourceProjectName = containerKind === 'project'
    ? (issue?.project_name ?? projectKey ?? '')
    : ''; /* populated below via useQuery for BR case */
  const sourceType = containerKind === 'project'
    ? (issue?.issue_type ?? '')
    : 'Business Request';
  const sourceStatus = containerKind === 'project'
    ? (issue?.status ?? '')
    : (brSource?.process_step ?? '');
  const sourceStatusCategory = issue?.status_category ?? null;

  /* Source product name — only queried in product mode. */
  const { data: sourceProductName = '' } = useQuery({
    queryKey: ['move-src-product-name', brSource?.product_id],
    enabled: containerKind === 'product' && !!brSource?.product_id,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('products')
        .select('name')
        .eq('id', brSource!.product_id)
        .maybeSingle();
      return (data as { name: string } | null)?.name ?? '';
    },
  });
  const displaySourceContainerName = containerKind === 'product' ? sourceProductName : sourceProjectName;

  /* Statuses valid on the destination (container + work type).
     - project kind: same 3-tier chain used by ConvertToSubtaskPage.
     - product kind: distinct BR `process_step` values (BR workflow surface). */
  const { data: targetStatuses = [] } = useQuery({
    queryKey: ['move-target-statuses', containerKind, newProject?.value, newIssueType?.value],
    enabled: currentStep >= 2 && !!newProject?.value && !!newIssueType?.value,
    staleTime: 60_000,
    queryFn: async (): Promise<Array<{ name: string; category: string }>> => {
      if (containerKind === 'product') {
        /* Scope to the TARGET product — only surface statuses that already
           exist on that product's BRs (Vikram 2026-07-04). Falls back to
           the global distinct process_step list when the target product has
           no BRs yet (fresh product). */
        const { data: scoped } = await (supabase as any)
          .from('business_requests')
          .select('process_step')
          .eq('product_id', newProject!.value)
          .not('process_step', 'is', null)
          .limit(5000);
        const seen = new Set<string>();
        for (const row of (scoped ?? []) as Array<{ process_step: string }>) {
          if (row.process_step) seen.add(row.process_step);
        }
        if (seen.size === 0) {
          const { data: global } = await (supabase as any)
            .from('business_requests')
            .select('process_step')
            .not('process_step', 'is', null)
            .limit(5000);
          for (const row of (global ?? []) as Array<{ process_step: string }>) {
            if (row.process_step) seen.add(row.process_step);
          }
        }
        return Array.from(seen)
          .sort((a, b) => a.localeCompare(b))
          .map((n) => ({ name: n, category: n.toLowerCase() === 'done' || n.toLowerCase() === 'rejected' ? 'done' : 'todo' }));
      }

      const projectId = newProject!.value;
      const workType = newIssueType!.value;
      const projectKey = newProject!.key;

      /* PRIMARY (Vikram 2026-07-04): ground-truth per (project + work_type)
         via distinct status values on ph_issues. Only surfaces statuses
         the target project's items of this exact type actually use — no
         extra project-wide entries. */
      const { data: issueStatusRows } = await supabase
        .from('ph_issues')
        .select('status')
        .eq('project_key', projectKey)
        .eq('issue_type', workType)
        .is('deleted_at', null)
        .not('status', 'is', null)
        .limit(5000);
      const usedStatusNames = new Set<string>();
      for (const row of (issueStatusRows ?? []) as Array<{ status: string | null }>) {
        if (row.status) usedStatusNames.add(row.status);
      }
      if (usedStatusNames.size > 0) {
        /* Hydrate categories by joining name → ph_workflow_statuses for the
           same project (case-insensitive match). Unknown categories → null. */
        const { data: catRows } = await supabase
          .from('ph_workflow_statuses')
          .select('name, category')
          .eq('project_id', projectId)
          .is('archived_at', null);
        const catByName = new Map<string, string>();
        for (const r of (catRows ?? []) as Array<{ name: string; category: string }>) {
          catByName.set(r.name.trim().toLowerCase(), r.category);
        }
        return Array.from(usedStatusNames)
          .sort((a, b) => a.localeCompare(b))
          .map((n) => ({ name: n, category: catByName.get(n.trim().toLowerCase()) ?? 'todo' }));
      }

      const { data: typeRows } = await (supabase as any)
        .from('ph_workflow_type_statuses')
        .select('status_id, position')
        .eq('project_id', projectId)
        .eq('work_item_type', workType)
        .order('position', { ascending: true });
      const statusIds = ((typeRows ?? []) as Array<{ status_id: string }>)
        .map((r) => r.status_id).filter(Boolean);
      if (statusIds.length > 0) {
        const { data } = await supabase
          .from('ph_workflow_statuses')
          .select('name, category, archived_at')
          .in('id', statusIds)
          .is('archived_at', null);
        if (data && data.length > 0) {
          return (data as any[]).map((s) => ({ name: s.name, category: s.category }));
        }
      }

      const { data: assign } = await (supabase as any)
        .from('ph_project_workflow_assignments')
        .select('template_id')
        .eq('project_id', projectId)
        .eq('work_item_type', workType)
        .maybeSingle();
      const templateId = (assign as { template_id: string | null } | null)?.template_id;
      if (templateId) {
        const { data: t } = await supabase
          .from('ph_workflow_template_statuses')
          .select('name, category')
          .eq('template_id', templateId);
        if (t && t.length > 0) return t as Array<{ name: string; category: string }>;
      }

      const { data: p } = await supabase
        .from('ph_workflow_statuses')
        .select('name, category')
        .eq('project_id', projectId)
        .is('archived_at', null)
        .order('position', { ascending: true });
      return (p ?? []) as Array<{ name: string; category: string }>;
    },
  });

  /* Workflow name for source (source project + source work type) and target
     (destination project + destination work type) — surfaced in the "Current
     Issue (Workflow: X → Y)" line of step 2. */
  const { data: sourceWorkflowName } = useQuery({
    queryKey: ['move-source-workflow-name', projectKey, sourceType],
    enabled: currentStep >= 2 && !!projectKey && !!sourceType,
    staleTime: 300_000,
    queryFn: async (): Promise<string | null> => {
      const { data: proj } = await supabase.from('ph_projects').select('id').eq('key', projectKey!).maybeSingle();
      const pid = (proj as { id: string } | null)?.id;
      if (!pid) return null;
      const { data: a } = await (supabase as any)
        .from('ph_project_workflow_assignments')
        .select('template_id')
        .eq('project_id', pid)
        .eq('work_item_type', sourceType)
        .maybeSingle();
      const tid = (a as { template_id: string | null } | null)?.template_id;
      if (!tid) return `${sourceProjectName} workflow`;
      const { data: tpl } = await (supabase as any)
        .from('ph_workflow_templates')
        .select('name')
        .eq('id', tid)
        .maybeSingle();
      return (tpl as { name: string | null } | null)?.name ?? `${sourceProjectName} workflow`;
    },
  });

  const { data: targetWorkflowName } = useQuery({
    queryKey: ['move-target-workflow-name', newProject?.value, newIssueType?.value],
    enabled: currentStep >= 2 && !!newProject?.value && !!newIssueType?.value,
    staleTime: 300_000,
    queryFn: async (): Promise<string | null> => {
      const { data: a } = await (supabase as any)
        .from('ph_project_workflow_assignments')
        .select('template_id')
        .eq('project_id', newProject!.value)
        .eq('work_item_type', newIssueType!.value)
        .maybeSingle();
      const tid = (a as { template_id: string | null } | null)?.template_id;
      if (!tid) return `${newProject!.label} workflow`;
      const { data: tpl } = await (supabase as any)
        .from('ph_workflow_templates')
        .select('name')
        .eq('id', tid)
        .maybeSingle();
      return (tpl as { name: string | null } | null)?.name ?? `${newProject!.label} workflow`;
    },
  });
  const activeStep = useMemo(() => STEPS.find((s) => s.index === currentStep) ?? STEPS[0], [currentStep]);
  void activeStep;

  /* Step 3 diff: destination (project + work_type) required fields the
     source didn't populate. Project mode only — product mode skips
     diffing because catalyst_field_layouts is keyed by project_key.
     Handled-by-wizard fields (title / status / parent) are excluded so
     the user isn't asked twice. */
  const HANDLED_BY_WIZARD_FIELDS = useMemo(
    () => new Set(['summary', 'title', 'status', 'parent', 'parent_key', 'project_key']),
    [],
  );
  const { data: destRequiredFields = [] } = useQuery({
    queryKey: ['move-dest-required-fields', containerKind, newProject?.key, newIssueType?.value],
    enabled: containerKind === 'project' && currentStep >= 3 && !!newProject?.key && !!newIssueType?.value,
    staleTime: 60_000,
    queryFn: async (): Promise<Array<{ field_key: string; field_label: string; field_type: string; is_system_field: boolean }>> => {
      const { data: scoped } = await supabase
        .from('catalyst_field_layouts')
        .select('field_key, field_label, field_type, is_system_field')
        .eq('project_key', newProject!.key)
        .eq('issue_type', newIssueType!.value)
        .eq('is_required', true);
      if (scoped && scoped.length > 0) {
        return scoped as Array<{ field_key: string; field_label: string; field_type: string; is_system_field: boolean }>;
      }
      const { data: global } = await supabase
        .from('catalyst_field_layouts')
        .select('field_key, field_label, field_type, is_system_field')
        .is('project_key', null)
        .eq('issue_type', newIssueType!.value)
        .eq('is_required', true);
      return (global ?? []) as Array<{ field_key: string; field_label: string; field_type: string; is_system_field: boolean }>;
    },
  });

  const stepThreeMissingFields = useMemo(() => {
    if (containerKind !== 'project' || !issue) return [];
    return destRequiredFields.filter((f) => {
      if (HANDLED_BY_WIZARD_FIELDS.has(f.field_key)) return false;
      const value = (issue as unknown as Record<string, unknown>)[f.field_key];
      if (value === null || value === undefined) return true;
      if (typeof value === 'string' && value.trim() === '') return true;
      if (Array.isArray(value) && value.length === 0) return true;
      return false;
    });
  }, [containerKind, issue, destRequiredFields, HANDLED_BY_WIZARD_FIELDS]);

  const canGoNext =
    currentStep === 1 ? !!newProject && !!newIssueType :
    currentStep === 2 ? !!mappedStatus :
    currentStep === 3
      ? stepThreeMissingFields.every((f) => {
          const v = moveFieldPatch[f.field_key];
          if (v === undefined || v === null) return false;
          if (typeof v === 'string') return v.trim().length > 0;
          return true;
        })
      : currentStep === 4 ? true :
    false;

  const handleCancel = () => navigate(-1);
  const queryClient = useQueryClient();
  const [moving, setMoving] = useState(false);

  const handleFinish = async () => {
    if (!newProject || !newIssueType || !mappedStatus) return;
    setMoving(true);
    try {
      if (containerKind === 'project') {
        if (!issue?.id || !issueKey) throw new Error('Missing source');
        if (newProject.key === (issue.project_key ?? projectKey)) {
          throw new Error(`This work item is already in ${newProject.label}.`);
        }
        /* Jira-parity: re-key the item to the destination project (e.g.
           BAU-4771 → IRP-1234). This requires ON UPDATE CASCADE on the
           FKs that reference ph_issues.issue_key (ph_issue_dependencies,
           chat_conversations, etc.) — applied via migration. */
        const newIssueKey = await generateIssueKey(newProject.key);

        const patch: Record<string, unknown> = {
          issue_key: newIssueKey,
          project_key: newProject.key,
          /* Denormalised `project_name` is what the breadcrumb + list rails
             read — must be updated in lockstep with `project_key`. */
          project_name: newProject.label,
          issue_type: newIssueType.value,
          status: mappedStatus,
        };
        const cat = targetStatuses.find((s) => s.name === mappedStatus)?.category;
        if (cat) patch.status_category = cat;
        for (const f of stepThreeMissingFields) {
          const v = moveFieldPatch[f.field_key];
          if (v === undefined || v === null || v === '') continue;
          patch[f.field_key] = v;
        }
        const { data: updated, error } = await supabase
          .from('ph_issues')
          .update(patch as any)
          .eq('id', issue.id)
          .select('id, issue_key, project_key, issue_type, status');
        if (error) throw error;
        if (!updated || updated.length === 0) {
          throw new Error('Update returned 0 rows — RLS may be blocking the write.');
        }
        queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', issueKey] });
        queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', newIssueKey] });
        queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && String(q.queryKey[0]).startsWith('project-') });
        catalystFlag.success({
          title: `Moved ${issueKey} → ${newIssueKey}`,
          description: `${newProject.label} · ${newIssueType.label} · ${mappedStatus}`,
        });
        navigate(`/project-hub/${newProject.key}/issue/${newIssueKey}`, { replace: true });
      } else {
        if (!brSource?.id || !requestKey) throw new Error('Missing source');
        if (newProject.value === brSource.product_id) {
          throw new Error(`This work item is already in ${newProject.label}.`);
        }
        const patch: Record<string, unknown> = {
          product_id: newProject.value,
          process_step: mappedStatus,
        };
        const { data: updated, error } = await (supabase as any)
          .from('business_requests')
          .update(patch)
          .eq('id', brSource.id)
          .select('id, product_id, process_step');
        if (error) throw error;
        if (!updated || updated.length === 0) {
          throw new Error('Update returned 0 rows — RLS may be blocking the write.');
        }
        catalystFlag.success({
          title: `Moved ${requestKey} to ${newProject.label}`,
          description: `Status: ${mappedStatus}`,
        });
        navigate(`/product-hub/requests/${requestKey}`, { replace: true });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as any)?.message ?? 'Unknown error';
      catalystFlag.error({ title: 'Move failed', description: msg });
    } finally {
      setMoving(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 4) {
      void handleFinish();
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  return (
    <div style={pageWrap}>
      {/* Page title lives at the top-left of the page — outside the stepper/
         content split, no border-bottom (Jira parity). */}
      <div style={pageTitleStyle}>Move Work Item</div>

      <div style={bodyLayout}>
        <div role="navigation" aria-label="Move wizard steps" style={stepsRail}>
          {STEPS.map((s) => {
            const active = s.index === currentStep;
            const completed = s.index < currentStep;
            return (
              <div key={s.index} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={stepRow(active, completed)}>
                  <span aria-hidden="true" style={stepBullet(active)} />
                  <span>{s.label}</span>
                </div>
                {completed && s.index === 1 && newProject && newIssueType && (
                  <div style={stepMetaWrap}>
                    <div><strong>{kindLabel}:</strong> {newProject.label}</div>
                    <div><strong>Work Type:</strong> {newIssueType.label}</div>
                  </div>
                )}
                {completed && s.index === 2 && mappedStatus && (
                  <div style={stepMetaWrap}>
                    <div><strong>Status:</strong> {mappedStatus}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={contentArea}>
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={stepTitleStyle}>Select destination {kindLabel.toLowerCase()} and work type</div>
              <div style={stepDescStyle}>
                Your work item's destination {kindLabel.toLowerCase()} may have different settings than your source {kindLabel.toLowerCase()}.
                Even if they're named the same, work types may use different workflows and fields.
                You may lose data when moving work items between {kindLabel.toLowerCase()}s.
              </div>

              <div>
                <div style={sectionLabelStyle}>Select {kindLabel}</div>
                <div style={inlineFieldRowStyle}>
                  <span style={boldFieldLabelStyle}>Current {kindLabel}:</span>
                  <span style={{ color: 'var(--ds-text)', fontSize: 'var(--ds-font-size-200)' }}>{displaySourceContainerName}</span>
                  <span aria-hidden="true" style={{ display: 'inline-flex', color: 'var(--ds-icon)' }}>
                    <ArrowRightIcon label="" />
                  </span>
                  <span style={boldFieldLabelStyle}>New {kindLabel}:</span>
                  <div style={{ maxWidth: 320 }}>
                    <Select<ProjectOption, false>
                      value={newProject}
                      options={projectOptions}
                      onChange={(next) => {
                        const picked = next as ProjectOption | null;
                        /* Defensive: source-container is already filtered out
                           of the options list, but block re-selection anyway. */
                        const sourceMatch = containerKind === 'project'
                          ? picked?.key === (issue?.project_key ?? projectKey)
                          : picked?.value === brSource?.product_id;
                        if (picked && sourceMatch) {
                          catalystFlag.error({
                            title: `Already in ${picked.label}`,
                            description: `This work item is already in ${picked.label}. Pick a different ${kindLabel.toLowerCase()}.`,
                          });
                          return;
                        }
                        setNewProject(picked);
                        setNewIssueType(null); /* Reset type when container changes. */
                      }}
                      placeholder={`Select a ${kindLabel.toLowerCase()}`}
                      isClearable={false}
                      isSearchable
                      components={{ Option: ProjectOptionInner, SingleValue: ProjectSingleValue }}
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                      styles={{ menuPortal: (base) => ({ ...base, zIndex: 3000 }) }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div style={sectionLabelStyle}>Select Work Type</div>
                <div style={inlineFieldRowStyle}>
                  <span style={boldFieldLabelStyle}>Current Work Type:</span>
                  <span style={{ color: 'var(--ds-text)', fontSize: 'var(--ds-font-size-200)' }}>{sourceType}</span>
                  <span aria-hidden="true" style={{ display: 'inline-flex', color: 'var(--ds-icon)' }}>
                    <ArrowRightIcon label="" />
                  </span>
                  <span style={boldFieldLabelStyle}>New Work Type:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 360 }}>
                    <div style={{ flex: 1 }}>
                      <Select<TypeOption, false>
                        value={newIssueType}
                        options={typeOptions}
                        onChange={(next) => setNewIssueType(next as TypeOption | null)}
                        placeholder={newProject ? 'Select a work type' : 'Pick a project first'}
                        isClearable={false}
                        isSearchable
                        isDisabled={!newProject}
                        components={{ Option: TypeOptionInner, SingleValue: TypeSingleValue }}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                        styles={{ menuPortal: (base) => ({ ...base, zIndex: 3000 }) }}
                      />
                    </div>
                    <Tooltip content={`The list reflects work types the destination ${kindLabel.toLowerCase()} actually uses.`}>
                      <span aria-hidden="true" style={{ display: 'inline-flex', color: 'var(--ds-icon-subtle)' }}>
                        <QuestionCircleIcon label="" />
                      </span>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={stepTitleStyle}>
                Map statuses for '{sourceType}' work items in the '{newProject?.label ?? ''}' {kindLabel.toLowerCase()}
              </div>
              <div style={stepDescStyle}>
                The '{sourceType}' workflow in your destination {kindLabel.toLowerCase()} uses different statuses than the
                '{sourceType}' workflow in your source {kindLabel.toLowerCase()}. Select which status your work items should
                be in following the move.
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)',
              }}>
                <span>Current Work Item</span>
                <span>(</span>
                <span style={{ fontWeight: 700, color: 'var(--ds-text)' }}>Workflow:</span>
                <span style={{ color: 'var(--ds-link)' }}>{sourceWorkflowName ?? '—'}</span>
                <span aria-hidden="true" style={{ display: 'inline-flex', color: 'var(--ds-icon-brand)' }}>
                  <ArrowRightIcon label="" />
                </span>
                <span style={{ color: 'var(--ds-link)' }}>{targetWorkflowName ?? '—'}</span>
                <span>)</span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '160px auto 24px 120px 1fr',
                alignItems: 'center',
                columnGap: 14,
              }}>
                <span style={boldFieldLabelStyle}>Current Status:</span>
                <span>
                  {sourceStatus
                    ? <StatusLozenge status={sourceStatus} statusCategory={sourceStatusCategory} size="sm" />
                    : <span style={{ color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)' }}>—</span>}
                </span>
                <span aria-hidden="true" style={{ display: 'inline-flex', color: 'var(--ds-icon)' }}>
                  <ArrowRightIcon label="" />
                </span>
                <span style={boldFieldLabelStyle}>New Status:</span>
                <div>
                  <StatusLozengeDropdown
                    status={mappedStatus ?? 'Select a status'}
                    statusOptions={targetStatuses.map((s) => ({
                      value: s.name,
                      label: s.name,
                      color_category: s.category,
                    }))}
                    onStatusChange={(next) => setMappedStatus(next)}
                    interactive
                    size="md"
                    lockWhenDone={false}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={stepTitleStyle}>
                Update fields for '{sourceType}' work items in the '{newProject?.label ?? ''}' {kindLabel.toLowerCase()}
              </div>
              <div style={stepDescStyle}>
                Your destination's '{sourceType}' work items may have different field settings than your source {kindLabel.toLowerCase()}.
                Update the values for fields in these work items, or select <strong>Retain</strong> to keep the field's current value.
                <br />
                <strong>Component</strong> or <strong>Version</strong> field data is permanently lost, if you move work items between {kindLabel.toLowerCase()}s.
                Other incompatible fields will appear empty, even if you choose to retain their values.
              </div>

              {stepThreeMissingFields.length === 0 ? (
                <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)' }}>
                  All fields will be updated automatically.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {stepThreeMissingFields.map((f) => (
                    <div key={f.field_key} style={{
                      display: 'grid',
                      gridTemplateColumns: '180px 1fr',
                      alignItems: 'center',
                      columnGap: 16,
                    }}>
                      <label style={boldFieldLabelStyle}>{f.field_label}:</label>
                      <div style={{ width: 320 }}>
                        {renderMoveFieldEditor({
                          field: f,
                          value: moveFieldPatch[f.field_key],
                          onChange: (v) => setMoveFieldPatch((prev) => ({ ...prev, [f.field_key]: v })),
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={stepTitleStyle}>Confirm changes</div>
              <div style={stepDescStyle}>Confirm the move with all of the details you have just configured.</div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr 1fr',
                columnGap: 24,
                rowGap: 12,
                fontSize: 'var(--ds-font-size-200)',
              }}>
                <div style={{ borderBottom: '1px solid var(--ds-border)', paddingBottom: 8 }} />
                <div style={{ fontWeight: 700, color: 'var(--ds-text)', paddingBottom: 8, borderBottom: '1px solid var(--ds-border)' }}>
                  Original Value (before move)
                </div>
                <div style={{ fontWeight: 700, color: 'var(--ds-text)', paddingBottom: 8, borderBottom: '1px solid var(--ds-border)' }}>
                  New Value (after move)
                </div>

                <div style={{ fontWeight: 700, color: 'var(--ds-text)' }}>{kindLabel}</div>
                <div style={{ color: 'var(--ds-text-danger)' }}>{displaySourceContainerName || '—'}</div>
                <div style={{ color: 'var(--ds-text-success)' }}>{newProject?.label ?? '—'}</div>

                <div style={{ fontWeight: 700, color: 'var(--ds-text)' }}>Type</div>
                <div style={{ color: 'var(--ds-text-danger)' }}>{sourceType || '—'}</div>
                <div style={{ color: 'var(--ds-text-success)' }}>{newIssueType?.label ?? '—'}</div>

                <div style={{ fontWeight: 700, color: 'var(--ds-text)' }}>
                  Status <span style={{ color: 'var(--ds-text-subtle)', fontWeight: 400 }}>(Workflow)</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {sourceStatus
                    ? <StatusLozenge status={sourceStatus} statusCategory={sourceStatusCategory} size="sm" />
                    : <span style={{ color: 'var(--ds-text-danger)' }}>—</span>}
                  <span style={{ color: 'var(--ds-text-danger)' }}>({sourceWorkflowName ?? '—'})</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {mappedStatus
                    ? <StatusLozenge status={mappedStatus} size="sm" />
                    : <span style={{ color: 'var(--ds-text-success)' }}>—</span>}
                  <span style={{ color: 'var(--ds-text-success)' }}>({targetWorkflowName ?? '—'})</span>
                </div>

                {stepThreeMissingFields.map((f) => {
                  const v = moveFieldPatch[f.field_key];
                  if (v === undefined || v === null || v === '') return null;
                  const originalVal = (issue as any)?.[f.field_key];
                  return (
                    <React.Fragment key={f.field_key}>
                      <div style={{ fontWeight: 700, color: 'var(--ds-text)' }}>{f.field_label}</div>
                      <div style={{ color: 'var(--ds-text-danger)' }}>
                        {originalVal !== undefined && originalVal !== null && originalVal !== '' ? String(originalVal) : 'None'}
                      </div>
                      <div style={{ color: 'var(--ds-text-success)' }}>
                        {typeof v === 'string' ? v : String(v)}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          <div style={footer}>
            <Button
              appearance="primary"
              isDisabled={!canGoNext || moving}
              onClick={handleNext}
            >
              {currentStep === 4 ? (moving ? 'Moving…' : 'Confirm') : 'Next'}
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
