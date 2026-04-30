/**
 * BrSidebarDetails — right-rail field summary for the v2 Business Request
 * view. Mirrors `CatalystSidebarDetails` (Story / Epic / etc.) but with
 * BR-specific field set.
 *
 * Cycle 1 stub. Cycle 2 will render every editable BR field as a labelled
 * row with an Atlaskit input (Select / DatePicker / CreatableSelect /
 * Checkbox / Textfield) inline-edit against `onUpdate(field, value)`.
 *
 * Field rows planned (mirrors CreateBusinessRequestModal):
 *  - Status            → process_step (workflow-driven Lozenge picker)
 *  - Type              → request_type
 *  - Priority          → urgency (PriorityIcon + Select)
 *  - Category
 *  - Strategic theme   → theme
 *  - Delivery Manager  → project_manager_user_id (UserSelect)
 *  - Product Owner     → po_user_id (UserSelect)
 *  - Stakeholders      → stakeholders (CreatableSelect, multi)
 *  - Planned release   → planned_quarter (Select, multi possible)
 *  - Target date       → end_date (DatePicker)
 *  - Targeted feature  → targeted_feature (Checkbox)
 *  - Created / Updated → created_at / updated_at (read-only, relative time)
 */
import type { BusinessRequest } from '@/types/business-request';

interface Props {
  request: BusinessRequest | null;
  onUpdate: (field: string, value: unknown) => Promise<void>;
}

export function BrSidebarDetails({ request, onUpdate: _onUpdate }: Props) {
  if (!request) return null;
  return (
    <aside
      data-cv-section="br-sidebar-details"
      aria-label="Business Request details"
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div
        style={{
          fontSize: 11,
          color: '#6B6E76',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        Details <span style={{ textTransform: 'none', color: '#8590A2' }}>(cycle 2 stub)</span>
      </div>
      <Row label="Status" value={request.process_step ?? '—'} />
      <Row label="Priority" value={request.urgency ?? '—'} />
      <Row label="Theme" value={request.theme ?? '—'} />
      <Row label="Targeted feature" value={request.targeted_feature ? 'Yes' : 'No'} />
      <Row label="Target date" value={request.end_date ?? '—'} />
      <Row label="Stakeholders" value={(request.stakeholders ?? []).join(', ') || '—'} />
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
      <div
        style={{
          width: 96,
          flexShrink: 0,
          fontSize: 12,
          color: '#6B6E76',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 13,
          color: '#292A2E',
          fontFamily: 'var(--cp-font-body)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default BrSidebarDetails;
