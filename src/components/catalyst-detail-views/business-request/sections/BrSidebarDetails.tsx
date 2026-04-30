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
import { type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import Select, { CreatableSelect } from '@atlaskit/select';
import { Checkbox } from '@atlaskit/checkbox';
import { DatePicker } from '@atlaskit/datetime-picker';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useCatalystWorkflow } from '@/hooks/useCatalystWorkflow';
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
          color: token('color.text.subtle', '#44546F'),
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
}

export function BrSidebarDetails({ request, onUpdate }: Props) {
  const { statuses: workflowStatuses, isLoading: statusesLoading } =
    useCatalystWorkflow('Business Request');
  const { data: profiles = [] } = useProfiles();
  const { data: releases = [] } = useReleases();

  if (!request) return null;

  const statusOptions = workflowStatuses.map((s) => ({ value: s.slug, label: s.name }));
  const requestTypeRaw = (request as unknown as { request_type?: string | null }).request_type ?? null;
  const categoryRaw = (request as unknown as { category?: string | null }).category ?? null;
  const plannedQuarter = request.planned_quarter ?? [];

  return (
    <aside
      data-cv-section="br-sidebar-details"
      aria-label="Business Request details"
      style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      <div
        style={{
          fontSize: 11,
          color: token('color.text.subtle', '#6B6E76'),
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontFamily: 'var(--cp-font-body)',
          marginBottom: 8,
        }}
      >
        Details
      </div>

      <SidebarRow label="Status">
        <Select
          inputId="br-view--status"
          options={statusOptions}
          value={statusOptions.find((o) => o.value === request.process_step) ?? null}
          onChange={(opt) => void onUpdate('process_step', (opt as { value: string } | null)?.value ?? null)}
          isClearable={false}
          isSearchable={false}
          isLoading={statusesLoading}
          placeholder="Select status"
        />
      </SidebarRow>

      <SidebarRow label="Type">
        <Select
          inputId="br-view--type"
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
              ((vals ?? []) as { value: string }[]).map((v) => v.value),
            )
          }
          placeholder="+ Add stakeholder"
          formatCreateLabel={(input: string) => `Add "${input}"`}
        />
      </SidebarRow>

      <SidebarRow label="Planned release">
        <CreatableSelect
          inputId="br-view--planned-release"
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
              ((vals ?? []) as { value: string }[]).map((v) => v.value),
            )
          }
          placeholder="Link to releases"
          formatCreateLabel={(input: string) => `Add "${input}"`}
        />
      </SidebarRow>

      <SidebarRow label="Target date">
        <DatePicker
          value={request.end_date || undefined}
          onChange={(val: string) => void onUpdate('end_date', val || null)}
          placeholder="Select date"
          dateFormat="DD/MM/YYYY"
        />
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
          borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
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
    </aside>
  );
}

export default BrSidebarDetails;
