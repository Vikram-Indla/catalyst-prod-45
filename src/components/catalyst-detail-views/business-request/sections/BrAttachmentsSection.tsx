/**
 * BrAttachmentsSection — generic attachments list (ports
 * `DetailTabAttachments` from `src/components/producthub/timeline/`).
 *
 * Cycle 1 stub. Cycle 2 will:
 *  - Read `business_request_attachments` (or wherever attachments live)
 *  - Render an Atlaskit DynamicTable / list with file icon + name + size
 *    + uploader + download link via @atlaskit/button
 *  - Provide an Atlaskit drag-drop upload zone (ADS-rebuilt)
 *
 * Distinct from `BrBrdUploadSection`, which targets the BRD / scope-doc
 * field specifically (mirrors CreateBusinessRequestModal's BRDUploadZone).
 */
import type { BusinessRequest } from '@/types/business-request';

interface Props {
  request: BusinessRequest | null;
}

export function BrAttachmentsSection({ request }: Props) {
  if (!request) return null;
  return (
    <section
      data-cv-section="br-attachments"
      style={{ marginBottom: 16 }}
      aria-label="Attachments"
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
        Attachments <span style={{ textTransform: 'none', color: '#8590A2' }}>(cycle 2 stub)</span>
      </div>
      <div
        style={{
          fontSize: 13,
          color: '#42526E',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        Attachments list will render here in cycle 2.
      </div>
    </section>
  );
}

export default BrAttachmentsSection;
