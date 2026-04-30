/**
 * BrLinkedItemsSection — cross-entity linked items (Epic + Feature must be
 * linkable per the cycle-1 spec, plus the standard work-item types).
 *
 * Cycle 1 stub. Cycle 2 will:
 *  - Wire to whatever links table backs Business Request links today
 *    (`business_request_links` is the candidate based on
 *    CreateBusinessRequestModal's BRD-upload writer; or a separate
 *    `ph_request_links` may exist — verify in cycle 2 audit).
 *  - Render via the existing canonical `LinkedWorkItemsSection` from
 *    `@/modules/project-work-hub/components/linked-work-items` IF it
 *    supports the BR data shape; otherwise wrap with an adapter.
 *  - Verify the work-item-type picker surfaces Epic + Feature as
 *    selectable types when linking from a BR; if not, extend the picker
 *    in `linked-work-items` (its filter currently lives in
 *    `useFuzzyChildSearch` per CLAUDE.md hierarchy lessons).
 */
import type { BusinessRequest } from '@/types/business-request';

interface Props {
  request: BusinessRequest | null;
}

export function BrLinkedItemsSection({ request }: Props) {
  if (!request) return null;
  return (
    <section
      data-cv-section="br-linked-items"
      style={{ marginBottom: 16 }}
      aria-label="Linked items"
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
        Linked items{' '}
        <span style={{ textTransform: 'none', color: '#8590A2' }}>
          (cycle 2 stub — Epic + Feature must be linkable)
        </span>
      </div>
      <div
        style={{
          fontSize: 13,
          color: '#42526E',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        Linked items list + Epic/Feature picker rendered here in cycle 2.
      </div>
    </section>
  );
}

export default BrLinkedItemsSection;
