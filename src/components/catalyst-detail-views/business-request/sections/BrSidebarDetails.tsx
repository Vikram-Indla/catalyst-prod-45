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
 *   - Target date       → end_date (CatalystDueDateField — canonical inline-edit)
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
import { CatalystDueDateField } from '@/components/shared/CatalystDueDateField';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useDemandProcessStepOptions } from '@/hooks/useDemandProcessSteps';
import { PriorityIcon } from '@/components/icons';
import { resolveAvatarUrl } from '@/lib/avatars';
import { useAuth } from '@/lib/auth';
import type { BusinessRequest } from '@/types/business-request';

// ─────────────────────────────────────────────────────────────────────────────
// Local data hooks (cycle 2 — extract to shared in cycle 3 if needed)
// ─────────────────────────────────────────────────────────────────────────────

interface ProfileOption {
  value: string;
  label: string;
  avatarUrl: string | null;
}

function useProfiles() {
  return useQuery<ProfileOption[]>({
    queryKey: ['br-view-profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .order('full_name');
      return (data ?? []).map((p) => ({
        value: p.id,
        label: p.full_name || p.email || p.id,
        avatarUrl: (p as any).avatar_url ?? resolveAvatarUrl(p.full_name ?? p.email) ?? null,
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

// iconLevel maps DB urgency value → PriorityIcon level string
const PRIORITY_OPTIONS = [
  { value: 'High',   label: 'High',   iconLevel: 'High' },
  { value: 'Normal', label: 'Medium', iconLevel: 'Medium' },
  { value: 'Low',    label: 'Low',    iconLevel: 'Low' },
];

function PriorityOptionLabel({ opt }: { opt: typeof PRIORITY_OPTIONS[number] }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <PriorityIcon level={opt.iconLevel} size={16} label="" />
      <span style={{ fontSize: 14, color: 'var(--ds-text, #292A2E)' }}>{opt.label}</span>
    </span>
  );
}

function PersonOptionLabel({ opt }: { opt: ProfileOption }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {opt.avatarUrl ? (
        <img src={opt.avatarUrl} alt={opt.label} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--ds-background-accent-blue-subtler, #CCE0FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 700, color: 'var(--ds-text-inverse, #fff)' }}>
          {opt.label.charAt(0).toUpperCase()}
        </div>
      )}
      <span style={{ fontSize: 14, color: 'var(--ds-text, #172B4D)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
    </span>
  );
}

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
        gap: 8,
        alignItems: 'center',
        padding: '4px 4px',
        minHeight: 32,
      }}
    >
      <div
        style={{
          width: 128,
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 500,
          lineHeight: '20px',
          color: 'var(--ds-text-subtle, #505258)',
          alignSelf: 'center',
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}

function ReadOnlyValue({ value }: { value: string }) {
  return (
    <div
      style={{
        padding: '4px 0',
        fontSize: 14,
        color: token('color.text', '#292A2E'),
      }}
    >
      {value}
    </div>
  );
}

// Matches Story's fmtJiraDate exactly: "May 11, 2026 at 11:42 PM"
// (CatalystSidebarDetails.tsx fmtJiraDate — full month, "at" separator).
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} at ${time}`;
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
  const { user } = useAuth();
  // Collapsible "Details" section — mirrors CatalystSidebarDetails exact pattern
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);

  if (!request) return null;
  const plannedQuarter = request.planned_quarter ?? [];

  return (
    <div
      data-cv-section="br-sidebar-details"
      role="complementary"
      aria-label="Business Request details"
      style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'transparent' }}
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
            appearance="subtle"
            spacing="compact"
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

      <SidebarRow label="Priority">
        <Select
          inputId="br-view--priority"
          appearance="subtle"
          spacing="compact"
          options={PRIORITY_OPTIONS}
          value={PRIORITY_OPTIONS.find((o) => o.value === request.urgency) ?? null}
          onChange={(opt) => void onUpdate('urgency', (opt as { value: string } | null)?.value ?? null)}
          isClearable
          isSearchable={false}
          placeholder="Select priority"
          formatOptionLabel={(opt) => <PriorityOptionLabel opt={opt as typeof PRIORITY_OPTIONS[number]} />}
        />
      </SidebarRow>

      <SidebarRow label="Delivery Manager">
        <div>
          <Select
            inputId="br-view--dm"
            appearance="subtle"
            spacing="compact"
            options={profiles}
            value={profiles.find((p) => p.value === request.project_manager_user_id) ?? null}
            onChange={(opt) =>
              void onUpdate('project_manager_user_id', (opt as ProfileOption | null)?.value ?? null)
            }
            isClearable
            isSearchable
            placeholder="Unassigned"
            formatOptionLabel={(opt) => <PersonOptionLabel opt={opt as ProfileOption} />}
          />
          {user?.id && user.id !== request.project_manager_user_id && (
            <button
              type="button"
              onClick={() => void onUpdate('project_manager_user_id', user.id)}
              style={{ fontSize: 11, color: 'var(--ds-link, #0052CC)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontFamily: 'inherit' }}
            >
              Assign to me
            </button>
          )}
        </div>
      </SidebarRow>

      <SidebarRow label="Product Owner">
        <div>
          <Select
            inputId="br-view--po"
            appearance="subtle"
            spacing="compact"
            options={profiles}
            value={profiles.find((p) => p.value === request.po_user_id) ?? null}
            onChange={(opt) =>
              void onUpdate('po_user_id', (opt as ProfileOption | null)?.value ?? null)
            }
            isClearable
            isSearchable
            placeholder="Unassigned"
            formatOptionLabel={(opt) => <PersonOptionLabel opt={opt as ProfileOption} />}
          />
          {user?.id && user.id !== request.po_user_id && (
            <button
              type="button"
              onClick={() => void onUpdate('po_user_id', user.id)}
              style={{ fontSize: 11, color: 'var(--ds-link, #0052CC)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', fontFamily: 'inherit' }}
            >
              Assign to me
            </button>
          )}
        </div>
      </SidebarRow>

      <SidebarRow label="Planned release">
        <CreatableSelect
          inputId="br-view--planned-release"
          appearance="subtle"
          spacing="compact"
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
        <CatalystDueDateField
          value={request.end_date ?? null}
          onSave={(val) => onUpdate('end_date', val)}
        />
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
        </>
      )}
      </div>
    </div>
  );
}

export default BrSidebarDetails;
