/**
 * BrLinkedItemsSection — wraps the canonical `LinkedWorkItemsSection` for
 * the Business Request domain.
 *
 * The canonical molecule (per CLAUDE.md cycle 5/6 lessons) takes
 * `issueId` (UUID) + `issueKey` (display key like `BAU-4771`) + optional
 * `projectKey`, and reads/writes `ph_issue_links` (keyed on issue_key).
 *
 * For BR rows we pass `request.id` (UUID) and `request.request_key`
 * (e.g. `MIM-001`). Cycle 4 live-probe must verify that
 * `ph_issue_links` accepts BR-style keys. If not, the canonical molecule
 * needs an `issueKeyDomain` knob OR Catalyst introduces a parallel
 * `business_request_links` link table — file as a follow-up after
 * cycle 4 mount swap surfaces real failures.
 *
 * Per the cycle-2 user spec, Epics and Features MUST be selectable when
 * linking to a BR. The molecule's link picker uses
 * `useFuzzyChildSearch` under the hood (per CLAUDE.md hierarchy
 * lessons); whether it surfaces Epic + Feature for a BR-source link
 * depends on the picker's allowed-types config. Verification + any
 * required extension happens during cycle 4.
 */
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { token } from '@atlaskit/tokens';
import type { BusinessRequest } from '@/types/business-request';

interface Props {
  request: BusinessRequest | null;
  /** Optional Catalyst project key — defaults to "MIM" (BR canonical project). */
  projectKey?: string;
}

export function BrLinkedItemsSection({ request, projectKey = 'MIM' }: Props) {
  if (!request) return null;
  return (
    <section
      data-cv-section="br-linked-items"
      style={{ marginBottom: 20 }}
      aria-label="Linked items"
    >
      <div
        style={{
          fontSize: 11,
          color: token('color.text.subtle', '#6B6E76'),
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: 8,
          letterSpacing: '0.04em',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        Linked items
      </div>
      <LinkedWorkItemsSection
        issueId={request.id}
        issueKey={request.request_key}
        projectKey={projectKey}
      />
    </section>
  );
}

export default BrLinkedItemsSection;
