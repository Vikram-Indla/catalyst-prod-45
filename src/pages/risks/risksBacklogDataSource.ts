/**
 * risksBacklogDataSource — adapter that lets the canonical BacklogPage
 * render Risks using the same chrome as /project-hub/BAU/backlog: same
 * JiraTable, same column picker, same toolbar, same bulk-select.
 *
 * CAT-AUDIT-1053 (features/CAT-AUDIT-FULLSWEEP-20260703-001/lanes/LANE-12_cross-surface.md):
 * migrate RisksGridPage off bespoke shadcn-table chrome onto the
 * BacklogPage + data-adapter pattern already proven by incidenthub
 * (see incidentsBacklogDataSource.ts).
 *
 * Data: `risks` table via useRisks() — a real Catalyst-owned table (NOT
 * Jira-sourced), so unlike incidents this adapter wires REAL mutations:
 * update / delete / create all call the existing useRisks() mutations.
 * There is no risk-rank column, so onSetRank is intentionally omitted.
 *
 * Detail panel: risks have NO entry in CatalystDetailRouter's
 * resolveItemType() (checked 2026-07-03 — only story/epic/feature/defect/
 * incident/task/business_request/subtask/idea are handled). There is also
 * no standalone risk detail route — the existing page opens risks in a
 * local RiskDetailPanel drawer keyed by the full Risk row, not a route.
 * BacklogPage's default row-click behavior would resolve any BIZ_SOURCE
 * row to itemType='business_request' (see BacklogPage.atlaskit.tsx
 * openDetail/openModal) — mis-rendering a risk as a Business Request.
 * To avoid that, this adapter sets `onRowClick`, a new optional
 * BacklogDataSource field (added alongside this migration) that fully
 * replaces BacklogPage's default panel-opening for the row. RisksGridPage.tsx
 * passes a callback here that looks the row up by id and opens the
 * existing RiskDetailPanel drawer, preserving current behavior exactly.
 *
 * ROAM (resolution_method) and Occurrence/Impact/Critical-path have no
 * equivalent columns in BacklogPage's shared column registry — they are
 * risk-domain-specific fields, not part of the Jira-parity ph_issues
 * schema. Rather than fabricate new shared columns (out of scope for a
 * table-chrome migration), `allowedColumnIds` is restricted to the
 * generic columns that map cleanly (key/status/priority/dates/
 * description). The ROAM badge is preserved as page-level chrome above
 * the BacklogPage mount in RisksGridPage.tsx, per the audit note "ROAM
 * badge/detail-panel wiring must be preserved."
 */

import { useMemo, useCallback } from 'react';
import type { LozengeAppearance, StatusOption } from '@/components/shared/JiraTable';
import { useRisks, type RiskWithBR } from '@/hooks/risks/useRisks';
import type { Risk } from '@/types/risks';
import {
  BIZ_SOURCE,
  type BacklogDataSource,
} from '@/modules/project-work-hub/adapters/backlogDataSource';
import type { BacklogStory } from '@/modules/project-work-hub/types/backlog.types';

/* ── Risk status vocabulary ──────────────────────────────────────────────
   RiskStatus is a fixed 2-value enum (Source: FieldValidation-Risks). No
   canonical workflow groups exist for risks, so this is a static map —
   mirrors constants/risks.ts RISK_STATUSES exactly (no fabricated values). */
const RISK_STATUSES = ['Open', 'Closed'] as const;

function riskStatusAppearance(s: string | null | undefined): LozengeAppearance {
  if (!s) return 'default';
  const k = String(s).toLowerCase();
  if (k === 'closed') return 'success';
  if (k === 'open') return 'removed';
  return 'default';
}

/** Only allow columns that have a real ph_issues-parity meaning. ROAM,
 *  Occurrence, Impact, Critical Path have no shared-registry equivalent
 *  and are intentionally NOT exposed here (preserved instead as the ROAM
 *  badge chrome above BacklogPage — see RisksGridPage.tsx). */
const RISKS_ALLOWED_COLUMN_IDS = [
  'key', 'status', 'priority', 'due_date', 'created', 'updated',
  'description', '__drag', '__actions',
] as const;

function riskToBacklogStory(r: RiskWithBR): BacklogStory {
  return {
    id: r.id,
    story_key: String(r.risk_number),
    title: r.title ?? '',
    name: r.title ?? null,
    description: r.description ?? null,
    status: r.status ?? null,
    feature_id: null,
    assignee_id: r.owner_id ?? null,
    assignee_name: null,
    reporter_name: null,
    start_date: null,
    priority: null,
    deleted_at: r.deleted_at ?? null,
    jira_created_at: r.created_at ?? null,
    jira_updated_at: r.updated_at ?? null,
    /* Use BIZ_SOURCE so BacklogPage routes mutations to this adapter and
       doesn't try to update ph_issues directly. */
    source: BIZ_SOURCE as any,
    issue_type: 'Risk',
    parent_key: null,
    parent_summary: null,
    labels: null,
    sprint_release: null,
    rank_order: null,
    feature: null,
  } as any;
}

/**
 * useRisksBacklogSource — pass to <BacklogPage dataSource={...} />.
 *
 * @param onOpenRisk  called with the full Risk row when a row is opened
 *   (row click / Work-cell link). RisksGridPage.tsx uses this to open the
 *   existing RiskDetailPanel drawer, unchanged from current behavior.
 */
export function useRisksBacklogSource(
  onOpenRisk: (risk: Risk) => void,
): BacklogDataSource | null {
  const { risks, isLoading, createRisk, updateRisk, deleteRisk } = useRisks();

  const rows = (risks ?? []) as RiskWithBR[];

  const extraStories: BacklogStory[] = useMemo(
    () => rows.map(riskToBacklogStory),
    [rows],
  );

  const statusOptions: StatusOption[] = useMemo(
    () => RISK_STATUSES.map((s) => ({ value: s, label: s, appearance: riskStatusAppearance(s) })),
    [],
  );

  const onOpenItem = useCallback(
    (_key: string | null, id: string) => {
      const row = rows.find((r) => r.id === id);
      if (row) onOpenRisk(row as Risk);
    },
    [rows, onOpenRisk],
  );

  const onRowClick = useCallback(
    ({ id }: { id: string; key: string | null }) => {
      const row = rows.find((r) => r.id === id);
      if (row) onOpenRisk(row as Risk);
    },
    [rows, onOpenRisk],
  );

  const onUpdate = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      const row = rows.find((r) => r.id === id);
      if (!row) throw new Error(`Risk not found: ${id}`);
      const riskPatch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'title') riskPatch.title = v;
        else if (k === 'status') riskPatch.status = v;
        else if (k === 'description') riskPatch.description = v;
        // Unknown/unsupported keys are silently dropped — no fabricated
        // writes to columns the risks table doesn't expose here.
      }
      if (Object.keys(riskPatch).length > 0) {
        updateRisk({ id, ...riskPatch } as any);
      }
    },
    [rows, updateRisk],
  );

  const onDelete = useCallback(
    async (id: string) => {
      deleteRisk(id);
    },
    [deleteRisk],
  );

  const onBulkDelete = useCallback(
    async (ids: string[]) => {
      ids.forEach((id) => deleteRisk(id));
    },
    [deleteRisk],
  );

  const onCreate = useCallback(
    async ({ title }: { title: string }) => {
      createRisk({ title, status: 'Open' } as any);
    },
    [createRisk],
  );

  return useMemo<BacklogDataSource>(() => ({
    sourceTag: BIZ_SOURCE,
    extraStories,
    extraEpics: [],
    isLoading,

    statusOptions,
    statusAppearance: riskStatusAppearance,
    statusLabel: (s) => (s ? String(s) : '—'),
    allStatuses: [...RISK_STATUSES],

    // "Open full page" button inside a detail panel — not reachable for
    // risks since onRowClick (below) bypasses panel-opening entirely, but
    // required by the BacklogDataSource interface, so it points at the
    // same drawer for consistency if BacklogPage's internals ever change.
    onOpenItem,

    /* Row click / Work-cell click: fully replaces BacklogPage's default
       detail-panel opening. There is no 'risk' entry in
       CatalystDetailRouter.resolveItemType() and no standalone risk detail
       route — without this override BacklogPage would default BIZ_SOURCE
       rows to itemType='business_request' and mis-render a risk as a
       Business Request. Opens the existing RiskDetailPanel drawer instead,
       preserving current behavior exactly (see BacklogPage.atlaskit.tsx
       dataSource.onRowClick, CAT-AUDIT-1053). */
    onRowClick,

    onUpdate,
    onDelete,
    onBulkDelete,
    onCreate,

    invalidationKeys: [['risks']] as const,

    allowedColumnIds: RISKS_ALLOWED_COLUMN_IDS,

    /* Risks are Catalyst-owned (real CRUD), so the default kebab actions
       (delete etc.) are safe to keep — nonDestructiveActions intentionally
       left unset (defaults to the normal kebab, matching the current
       page's Delete-from-Actions-menu support). */

    productId: 'risks',
  }), [extraStories, isLoading, statusOptions, onOpenItem, onRowClick, onUpdate, onDelete, onBulkDelete, onCreate]);
}
