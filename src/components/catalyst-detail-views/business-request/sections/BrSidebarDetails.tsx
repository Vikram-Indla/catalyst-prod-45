/**
 * BrSidebarDetails — right-rail field summary for the v2 Business Request
 * view. ADS-only, every field inline-editable.
 *
 * Cycle 2 deliverable. 11 editable rows + 2 read-only timestamps:
 *
 *  Editable:
 *   - Status            → process_step (workflow-driven Lozenge picker)
 *   - Type              → request_type (Select / REQUEST_TYPE_OPTIONS)
 *   - Priority          → urgency (Select / High|Normal|Low)
 *   - Category          → Select / 4 categories
 *   - Strategic theme   → theme (Select / THEME_OPTIONS)
 *   - Delivery Manager  → project_manager_user_id (UserSelect — profiles)
 *   - Product Owner     → po_user_id (UserSelect — profiles)
 *   - Stakeholders      → stakeholders (CreatableSelect, multi)
 *   - Planned release   → planned_quarter (CreatableSelect, multi)
 *   - Target date       → end_date (Atlaskit DatePicker)
 *   - Targeted feature  → targeted_feature (Checkbox)
 *
 *  Read-only:
 *   - Created at
 *   - Updated at
 *
 * Architecture: each field has a SidebarRow with label + Atlaskit input;
 * onChange writes via the parent's `onUpdate(field, value)` callback,
 * which in turn calls `useUpdateBusinessRequest` from `useBusinessRequests`.
 *
 * Profiles + releases data hooks are LOCAL to this file in cycle 2 to
 * keep the diff focused. Cycle 3 may extract them to
 * `src/components/business-requests/shared/` if other consumers need them.
 */
import React, { type ReactNode, useState } from 'react';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import { useQuery } from '@tanstack/react-query';
import Select, { CreatableSelect } from '@atlaskit/select';
import { Checkbox } from '@atlaskit/checkbox';
import { DatePicker } from '@atlaskit/datetime-picker';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useDemandProcessStepOptions } from '@/hooks/useDemandProcessSteps';
import {
  THEME_OPTIONS,
  STAKEHOLDER_OPTIONS,
  REQUEST_TYPE_OPTIONS,
} from '@/types/business-request';
import type { BusinessRequest } from '@/types/business-request';

// ─────────────────────────────────────────────────────────────────────────────
// Local data hooks (cycle 2 — extract to shared in cycle 3 if needed)
// ─────────────────────────────────────────────────────────────────────────────

interface ProfileOption {
  value: string;
  label: string;
}

function useProfiles() {
  return useQuery<ProfileOption[]>({
    queryKey: ['br-view-profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      return (data ?? []).map((p) => ({
        value: p.id,
        label: p.full_name || p.email || p.id,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

interface ReleaseOption {
  value: string;
  label: string;
}

function useReleases() {
  return useQuery<ReleaseOption[]>({
    queryKey: ['br-view-releases'],
    queryFn: async () => {
      const { data } = await supabase.from('releases').select('id, name').order('name');
      return (data ?? []).map((r) => ({ value: r.name, label: r.name }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Static option vocabularies (mirror CreateBusinessRequestModal)
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'Industrial', label: 'Industrial' },
  { value: 'Ministry Website', label: 'Ministry Website' },
  { value: 'Internal Services', label: 'Internal Services' },
  { value: 'Innovation Platform', label: 'Innovation Platform' },
];

const PRIORITY_OPTIONS = [
  { value: 'High', label: 'High' },
  { value: 'Normal', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

const THEME_SELECT_OPTIONS = THEME_OPTIONS.map((t) => ({
  value: t.value,
  label: t.labelEn ?? t.label,
}));
const STAKEHOLDER_SELECT_OPTIONS = STAKEHOLDER_OPTIONS.map((s) => ({
  value: s.value,
  label: s.label,
}));
const TYPE_SELECT_OPTIONS = REQUEST_TYPE_OPTIONS.map((t) => ({
  value: t.value,
  label: t.label,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Status appearance bridge
// ─────────────────────────────────────────────────────────────────────────────

// (Status appearance handled by the dedicated BrStatusSection at the top of
// the left rail. The sidebar mirrors it with the same dropdown picker so
// users can change status without scrolling back up.)

// ─────────────────────────────────────────────────────────────────────────────
// Row helpers
// ─────────────────────────────────────────────────────────────────────────────

function SidebarRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '6px 0',
      }}
    >
      <div
        style={{
          width: 110,
          flexShrink: 0,
          paddingTop: 8,
          fontSize: 12,
          fontWeight: 600,
          color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, minWidth: 0, fontFamily: 'var(--cp-font-body)' }}>
        {children}
      </div>
    </div>
  );
}

function ReadOnlyValue({ value }: { value: string }) {
  return (
    <div
      style={{
        padding: '6px 0',
        fontSize: 13,
        color: token('color.text', '#292A2E'),
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      {value}
    </div>
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  request: BusinessRequest | null;
  onUpdate: (field: string, value: unknown) => Promise<void>;
  /** Status pill — rendered in the right-rail header (V3 Story-parity pattern).
   *  When provided, the Status Select row is hidden from the Details section
   *  since the pill in the header already handles status changes. */
  statusPill?: React.ReactNode;
  /** AI improve dropdown — rendered in the right-rail header (C22). */
  improveDropdown?: React.ReactNode;
  /** Watchers chip — rendered beside the improve dropdown (C23). */
  watchersChip?: React.ReactNode;
}

export function BrSidebarDetails({ request, onUpdate, statusPill, improveDropdown, watchersChip }: Props) {
  const { options: statusOptions, isLoading: statusesLoading } = useDemandProcessStepOptions();
  const { data: profiles = [] } = useProfiles();
  const { data: releases = [] } = useReleases();
  // Collapsible "Details" section — mirrors CatalystSidebarDetails exact pattern
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);

  if (!request) return null;
  const requestTypeRaw = (request as unknown as { request_type?: string | null }).request_type ?? null;
  const categoryRaw = (request as unknown as { category?: string | null }).category ?? null;
  const plannedQuarter = request.planned_quarter ?? [];

  return (
    <aside
      data-cv-section="br-sidebar-details"
      aria-label="Business Request details"
      style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      {/* Header action row — status pill (V3) + watchers chip + improve dropdown */}
      {(statusPill || watchersChip || improveDropdown) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 8,
          minHeight: 28,
          flexWrap: 'wrap',
        }}>
          {statusPill}
          {watchersChip}
          {improveDropdown}
        </div>
      )}

      {/* "Details" section header — exact Story spec (CatalystSidebarDetails.tsx:560-574):
          16px/653/var(--ds-text,#292A2E), ChevronRight toggle, 40px height, no uppercase */}
      <div style={{ marginBottom: 8 }}>
        <div
          onClick={() => setDetailsCollapsed(c => !c)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, height: 40,
            padding: '0 0', background: 'transparent', cursor: 'pointer', userSelect: 'none',
          }}
        >
          <span style={{
            display: 'inline-flex',
            transition: 'transform 0.15s ease',
            transform: detailsCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
            color: 'var(--ds-icon-subtle, #626F86)',
          }}>
            <ChevronRightIcon size="small" primaryColor="currentColor" />
          </span>
          <div style={{ margin: 0, fontSize: 16, fontWeight: 653, lineHeight: '20px', color: 'var(--ds-text, #292A2E)' }}>
            Details
          </div>
        </div>

      {!detailsCollapsed && (
      <>

      {/* Status row — hidden when statusPill is in the header (V3 Story-parity).
          V2 callers that don't pass statusPill continue to see the Select row. */}
      {!statusPill && (
        <SidebarRow label="Status">
          <Select
            inputId="br-view--status"
            classNamePrefix="cv-br-select"
            options={statusOptions}
            value={statusOptions.find((o) => o.value === request.process_step) ?? null}
            onChange={(opt) => void onUpdate('process_step', (opt as { value: string } | null)?.value ?? null)}
            isClearable={false}
            isSearchable={false}
            isLoading={statusesLoading}
            placeholder="Select status"
          />
        </SidebarRow>
      )}

      <SidebarRow label="Type">
        <Select
          inputId="br-view--type"
          classNamePrefix="cv-br-select"
          options={TYPE_SELECT_OPTIONS}
          value={TYPE_SELECT_OPTIONS.find((o) => o.value === requestTypeRaw) ?? null}
          onChange={(opt) => void onUpdate('request_type', (opt as { value: string } | null)?.value ?? null)}
          isClearable
          isSearchable={false}
          placeholder="Feature · Gap · Integration · Data Request"
        />
      </SidebarRow>

      <SidebarRow label="Priority">
        <Select
          inputId="br-view--priority"
          classNamePrefix="cv-br-select"
          options={PRIORITY_OPTIONS}
          value={PRIORITY_OPTIONS.find((o) => o.value === request.urgency) ?? null}
          onChange={(opt) => void onUpdate('urgency', (opt as { value: string } | null)?.value ?? null)}
          isClearable
          isSearchable={false}
          placeholder="Select priority"
        />
      </SidebarRow>

      <SidebarRow label="Category">
        <Select
          inputId="br-view--category"
          classNamePrefix="cv-br-select"
          options={CATEGORY_OPTIONS}
          value={CATEGORY_OPTIONS.find((o) => o.value === categoryRaw) ?? null}
          onChange={(opt) => void onUpdate('category', (opt as { value: string } | null)?.value ?? null)}
          isClearable
          isSearchable={false}
          placeholder="Select category"
        />
      </SidebarRow>

      <SidebarRow label="Theme">
        <Select
          inputId="br-view--theme"
          classNamePrefix="cv-br-select"
          options={THEME_SELECT_OPTIONS}
          value={THEME_SELECT_OPTIONS.find((o) => o.value === request.theme) ?? null}
          onChange={(opt) => void onUpdate('theme', (opt as { value: string } | null)?.value ?? null)}
          isClearable
          isSearchable
          placeholder="Select theme"
        />
      </SidebarRow>

      <SidebarRow label="Delivery Manager">
        <Select
          inputId="br-view--dm"
          classNamePrefix="cv-br-select"
          options={profiles}
          value={profiles.find((p) => p.value === request.project_manager_user_id) ?? null}
          onChange={(opt) =>
            void onUpdate('project_manager_user_id', (opt as { value: string } | null)?.value ?? null)
          }
          isClearable
          isSearchable
          placeholder="Unassigned"
        />
      </SidebarRow>

      <SidebarRow label="Product Owner">
        <Select
          inputId="br-view--po"
          classNamePrefix="cv-br-select"
          options={profiles}
          value={profiles.find((p) => p.value === request.po_user_id) ?? null}
          onChange={(opt) =>
            void onUpdate('po_user_id', (opt as { value: string } | null)?.value ?? null)
          }
          isClearable
          isSearchable
          placeholder="Unassigned"
        />
      </SidebarRow>

      <SidebarRow label="Stakeholders">
        <CreatableSelect
          inputId="br-view--stakeholders"
          classNamePrefix="cv-br-select"
          isMulti
          isClearable={false}
          options={STAKEHOLDER_SELECT_OPTIONS}
          value={[
            ...STAKEHOLDER_SELECT_OPTIONS.filter((o) =>
              (request.stakeholders ?? []).includes(o.value),
            ),
            ...(request.stakeholders ?? [])
              .filter((v) => !STAKEHOLDER_SELECT_OPTIONS.find((o) => o.value === v))
              .map((v) => ({ value: v, label: v })),
          ]}
          onChange={(vals) =>
            void onUpdate(
              'stakeholders',
              (Array.from(vals ?? []) as { value: string }[]).map((v) => v.value),
            )
          }
          placeholder="+ Add stakeholder"
          formatCreateLabel={(input: string) => `Add "${input}"`}
        />
      </SidebarRow>

      <SidebarRow label="Planned release">
        <CreatableSelect
          inputId="br-view--planned-release"
          classNamePrefix="cv-br-select"
          isMulti
          isClearable
          options={releases}
          value={plannedQuarter.map((q) => {
            const match = releases.find((r) => r.value === q);
            return match ?? { value: q, label: q };
          })}
          onChange={(vals) =>
            void onUpdate(
              'planned_quarter',
              (Array.from(vals ?? []) as { value: string }[]).map((v) => v.value),
            )
          }
          placeholder="Link to releases"
          formatCreateLabel={(input: string) => `Add "${input}"`}
        />
      </SidebarRow>

      <SidebarRow label="Target date">
        <div className="cv-date-field">
          <DatePicker
            value={request.end_date || undefined}
            onChange={(val: string) => void onUpdate('end_date', val || null)}
            placeholder="Select date"
            dateFormat="DD/MM/YYYY"
          />
        </div>
      </SidebarRow>

      <SidebarRow label="Targeted feature">
        <div style={{ paddingTop: 8 }}>
          <Checkbox
            isChecked={!!request.targeted_feature}
            onChange={(e) =>
              void onUpdate('targeted_feature', (e.target as HTMLInputElement).checked)
            }
            label="Priority feature for the current cycle"
            name="br-view--targeted-feature"
          />
        </div>
      </SidebarRow>

      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <SidebarRow label="Created">
          <ReadOnlyValue value={fmtDate(request.created_at)} />
        </SidebarRow>
        <SidebarRow label="Updated">
          <ReadOnlyValue value={fmtDate(request.updated_at)} />
        </SidebarRow>
      </div>
        </>
      )}
      </div>
    </aside>
  );
}

export default BrSidebarDetails;
