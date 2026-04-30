/**
 * BrBrdUploadSection — BRD / scope-document upload section.
 *
 * Mirrors `BRDUploadZone` from `CreateBusinessRequestModal` so users can
 * add or replace BRD docs from the view modal too.
 *
 * Cycle 1 stub. Cycle 2 will:
 *  - Extract `BRDUploadZone` from CreateBusinessRequestModal into a
 *    shared component (likely under `src/components/business-requests/
 *    shared/BrdUploadZone.tsx`) so both Create and View consume the same
 *    drag-drop affordance
 *  - List existing BRD docs via Supabase storage + `business_request_links`
 *    where `kind = 'document'`
 *  - Allow add / remove operations
 */
import type { BusinessRequest } from '@/types/business-request';

interface Props {
  request: BusinessRequest | null;
  onUpdate: (field: string, value: unknown) => Promise<void>;
}

export function BrBrdUploadSection({ request, onUpdate: _onUpdate }: Props) {
  if (!request) return null;
  return (
    <section
      data-cv-section="br-brd-upload"
      style={{ marginBottom: 16 }}
      aria-label="BRD / scope documents"
    >
      <div
        style={{
          fontSize: 11,
          color: '#6B6E76',
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: 4,
          letterSpacing: '0.04em',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        BRD / scope documents{' '}
        <span style={{ textTransform: 'none', color: '#8590A2' }}>(cycle 2 stub)</span>
      </div>
      <div
        style={{
          fontSize: 13,
          color: '#42526E',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        BRD upload + existing-doc list rendered here in cycle 2 via shared{' '}
        <code>BrdUploadZone</code>.
      </div>
    </section>
  );
}

export default BrBrdUploadSection;
