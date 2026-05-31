/**
 * BrKeyDetails — compact left-rail key metadata for Business Request.
 *
 * Shows Priority (urgency), Type (request_type), Category, Target date
 * in a 2×2 grid — same visual contract as CatalystKeyDetails but using
 * BR-specific fields from business_requests, not ph_issues.
 *
 * Read-only chips. Editing is done via BrSidebarDetails (right rail).
 * 100% ADS tokens — no raw hex.
 */
import { token } from '@atlaskit/tokens';
import type { BusinessRequest } from '@/types/business-request';

interface Props {
  request: BusinessRequest | null;
}

const URGENCY_COLOR: Record<string, string> = {
  high:     token('color.icon.danger',   '#E5484D'),
  critical: token('color.icon.danger',   '#E5484D'),
  normal:   token('color.icon.warning',  'var(--cp-amber, #F59E0B)'),
  medium:   token('color.icon.warning',  'var(--cp-amber, #F59E0B)'),
  low:      token('color.text.subtlest', '#8590A2'),
};

const TYPE_LABEL: Record<string, string> = {
  feature:      'Feature',
  gap:          'Business Gap',
  integration:  'Integration',
  data_request: 'Data Request',
};

function fieldLabel(text: string) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 600,
      color: token('color.text.subtlest', '#8590A2'),
      letterSpacing: '0.03em',
      marginBottom: 4,
      fontFamily: 'var(--cp-font-body)',
    }}>
      {text}
    </div>
  );
}

function fieldValue(text: string, color?: string) {
  return (
    <div style={{
      fontSize: 13,
      fontWeight: 500,
      color: color ?? token('color.text', '#292A2E'),
      fontFamily: 'var(--cp-font-body)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}>
      {text || '—'}
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function BrKeyDetails({ request }: Props) {
  if (!request) return null;

  const urgencyKey = (request.urgency ?? '').toLowerCase();
  const urgencyColor = URGENCY_COLOR[urgencyKey] ?? token('color.text.subtlest', '#8590A2');
  const urgencyLabel = request.urgency ?? '—';

  const typeLabel = TYPE_LABEL[(request.request_type ?? '').toLowerCase()] ?? request.request_type ?? '—';

  return (
    <section
      data-cv-section="br-key-details"
      style={{ marginBottom: 16 }}
      aria-label="Key details"
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
      }}>
        {/* Priority */}
        <div style={{
          padding: '8px 10px',
          background: token('elevation.surface.sunken', '#F7F8F9'),
          borderRadius: 4,
          border: `1px solid ${token('color.border', 'var(--cp-border-neutral, #DFE1E6)')}`,
          minWidth: 0,
        }}>
          {fieldLabel('Priority')}
          {fieldValue(urgencyLabel, urgencyColor)}
        </div>

        {/* Type */}
        <div style={{
          padding: '8px 10px',
          background: token('elevation.surface.sunken', '#F7F8F9'),
          borderRadius: 4,
          border: `1px solid ${token('color.border', 'var(--cp-border-neutral, #DFE1E6)')}`,
          minWidth: 0,
        }}>
          {fieldLabel('Type')}
          {fieldValue(typeLabel)}
        </div>

        {/* Department */}
        <div style={{
          padding: '8px 10px',
          background: token('elevation.surface.sunken', '#F7F8F9'),
          borderRadius: 4,
          border: `1px solid ${token('color.border', 'var(--cp-border-neutral, #DFE1E6)')}`,
          minWidth: 0,
        }}>
          {fieldLabel('Department')}
          {fieldValue((request as any).department ?? '—')}
        </div>

        {/* Target date */}
        <div style={{
          padding: '8px 10px',
          background: token('elevation.surface.sunken', '#F7F8F9'),
          borderRadius: 4,
          border: `1px solid ${token('color.border', 'var(--cp-border-neutral, #DFE1E6)')}`,
          minWidth: 0,
        }}>
          {fieldLabel('Target date')}
          {fieldValue(formatDate(request.end_date ?? null))}
        </div>
      </div>
    </section>
  );
}

export default BrKeyDetails;
