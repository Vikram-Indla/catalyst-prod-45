/**
 * PB-DEF-010 · governed Reviews ↔ Portfolio/Benefit references, shown ON the record so the link is
 * navigable in both directions: from the benefit/portfolio you see (and open) the reviews that
 * reference it, and you can link it to a review. Links are governed references (the RPC validates
 * the target and the review), never free-text ids, and never touch a review's locked snapshot.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ads';
import { Routes } from '@/lib/routes';
import { valueApi, governanceApi } from '../domain';
import { useInvalidateStrata } from '../hooks/useStrata';
import { StrataPanel, T } from './shared';
import { StrataFormModal } from './authoring';
import { fmtDate } from './format';

export function StrataReviewLinks({
  targetType, targetId,
}: {
  targetType: 'portfolio' | 'benefit';
  targetId: string;
}) {
  const navigate = useNavigate();
  const invalidate = useInvalidateStrata();
  const [linking, setLinking] = useState(false);
  const refsQ = useQuery({
    queryKey: ['strata', 'entity-reviews', targetType, targetId],
    queryFn: () => valueApi.reviewsReferencing(targetType, targetId),
    staleTime: 15_000,
  });
  // Preloaded (NOT gated on the dialog) so the governed picker has its options the instant it opens —
  // StrataFormModal reads its field options at open time, so late-arriving options render an empty picker.
  const reviewsQ = useQuery({
    queryKey: ['strata', 'reviews-all'],
    queryFn: () => governanceApi.reviews(),
    staleTime: 30_000,
  });
  const rows = refsQ.data ?? [];
  const reviewOptions = (reviewsQ.data ?? []).map((r) => ({
    value: r.id, label: `${r.name}${r.review_key ? ` · ${r.review_key}` : ''}`,
  }));

  return (
    <>
      <StrataPanel
        title="Linked reviews"
        count={rows.length}
        actions={(
          <Button appearance="default" spacing="compact" onClick={() => setLinking(true)} testId="strata-link-review">
            Link to review
          </Button>
        )}
        noPadding
      >
        <div data-testid="strata-review-links">
          {rows.length === 0 ? (
            <p style={{ color: T.subtlest, margin: 0, padding: '12px 16px', fontSize: 'var(--ds-font-size-100)' }}>Not referenced by any review yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {rows.map((r) => (
                <div key={r.review_id} style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                  <div style={{ minWidth: 0 }}>
                    <Button appearance="link" spacing="none" onClick={() => navigate(Routes.strata.reviews())} testId={`strata-open-review-${r.review_id}`}>
                      {r.review_name}
                    </Button>
                    <span style={{ color: T.subtlest, fontSize: 'var(--ds-font-size-075)', marginLeft: 8 }}>
                      {r.review_key}{r.scheduled_for ? ` · ${fmtDate(r.scheduled_for)}` : ''}
                    </span>
                  </div>
                  <Button appearance="subtle" spacing="compact" testId={`strata-unlink-review-${r.review_id}`}
                    onClick={async () => { if (!window.confirm(`Unlink “${r.review_name}” from this ${targetType}?`)) return; try { await valueApi.unlinkReview(r.review_id, targetType, targetId); invalidate(); refsQ.refetch(); } catch (e) { window.alert((e as Error).message); } }}>
                    Unlink
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </StrataPanel>
      {/* Rendered as a SIBLING of the panel (never inside its overflow-clipped body). */}
      <StrataFormModal
        open={linking}
        onClose={() => setLinking(false)}
        title="Link to a review"
        submitLabel="Link"
        description="Governed reference — pick an existing review. The RPC validates that both the review and this record exist; the review's locked snapshot and issued board pack are untouched."
        fields={[
          {
            key: 'reviewId', label: 'Review', kind: 'select', required: true, options: reviewOptions,
            helper: reviewsQ.isLoading ? 'Loading reviews…' : reviewOptions.length === 0 ? 'No reviews available' : 'Search and select a review',
          },
          { key: 'note', label: 'Note', kind: 'textarea' },
        ]}
        onSubmit={async (v) => {
          await valueApi.linkReview(String(v.reviewId), targetType, targetId, (v.note as string | null) ?? undefined);
          invalidate();
          refsQ.refetch();
        }}
        testId="strata-link-review-modal"
      />
    </>
  );
}
