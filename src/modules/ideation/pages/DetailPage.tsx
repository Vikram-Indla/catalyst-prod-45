/**
 * Ideation · Idea detail — /ideation/ideas/:slug.
 *
 * Phase 2 S3: real detail page — problem/proposed-value ADF, a read-only
 * property rail, and working comments. Structural evidence: 05 §C row 4
 * (Linear issue detail — "Structural 1:1 with C.4 (CatalystViewBase +
 * ActivityPanel + rail) — confirmed"). AI Copilot rail tab, votes, evidence,
 * and scoring stay out of scope (see 03_PLAN_LOCK_PHASE2_S3_DETAIL.md).
 */
import { useMemo } from 'react';
import Button from '@atlaskit/button/new';
import { useNavigate, useParams } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyState } from '@/components/ads/EmptyState';
import { Routes } from '@/lib/routes';
import { DisplayView } from '@/components/catalyst-detail-views/shared/sections/Description/_components/DisplayView/DisplayView';
import { ActivityPanel } from '@/components/catalyst-ds/activity/ActivityPanel';
import type { CdsComment, CdsUser } from '@/components/catalyst-ds/types';
import { StatusLozenge } from '@/components/shared/StatusLozenge/StatusLozenge';
import { useAuth } from '@/hooks/useAuth';
import { useIdeationIdea, useIdeationComments, useAddIdeationComment } from '@/hooks/useIdeationDetail';
import type { IdeaDetailRow } from '@/modules/ideation/types';

const CLASS_LABEL: Record<IdeaDetailRow['idea_class'], string> = {
  problem: 'Problem',
  opportunity: 'Opportunity',
  improvement: 'Improvement',
};

function ClassBadge({ ideaClass }: { ideaClass: IdeaDetailRow['idea_class'] }) {
  return (
    <span
      style={{
        font: '600 11px/16px var(--ds-font-family-body, "Atlassian Sans", ui-sans-serif, sans-serif)',
        color: token('color.text.subtle', 'var(--ds-text-subtle)'),
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {CLASS_LABEL[ideaClass]}
    </span>
  );
}

function RailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          font: '600 11px/16px var(--ds-font-family-body, "Atlassian Sans")',
          color: token('color.text.subtlest', 'var(--ds-text-subtlest)'),
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ color: token('color.text', 'var(--ds-text)'), font: '400 14px/20px var(--ds-font-family-body, "Atlassian Sans")' }}>
        {children}
      </div>
    </div>
  );
}

export default function DetailPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const { data: idea, isLoading: ideaLoading, isError: ideaError } = useIdeationIdea(slug);
  const { data: comments, isLoading: commentsLoading } = useIdeationComments(idea?.id);
  const addComment = useAddIdeationComment(idea?.id);

  const currentUser: CdsUser | undefined = user
    ? { id: user.id, name: user.user_metadata?.full_name ?? user.email ?? 'You', email: user.email ?? undefined }
    : undefined;

  const cdsComments: CdsComment[] = useMemo(
    () =>
      (comments ?? []).map((c) => ({
        id: c.id,
        author: { id: c.user_id, name: c.author_name ?? 'Unknown' },
        content: JSON.stringify(c.content),
        createdAt: c.created_at,
        parentId: c.parent_comment_id,
      })),
    [comments]
  );

  if (ideaLoading) {
    return (
      <div data-testid="ideation-detail-page" style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (ideaError || !idea) {
    return (
      <div data-testid="ideation-detail-page">
        <HubPageHeader title="Idea" />
        <EmptyState
          header="Idea not available"
          description={
            slug
              ? `There's no idea to show for "${slug}" yet. Idea pages open here once submissions begin.`
              : 'Idea pages open here once submissions begin.'
          }
          primaryAction={
            <Button appearance="primary" onClick={() => navigate(Routes.ideation.explore())}>
              Back to Explore
            </Button>
          }
          testId="ideation-detail-empty"
        />
      </div>
    );
  }

  return (
    <div data-testid="ideation-detail-page">
      <HubPageHeader title={idea.idea_key} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, padding: '0 16px 32px', alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <StatusLozenge status={idea.workflow_status_key} />
            <ClassBadge ideaClass={idea.idea_class} />
          </div>
          <h1
            style={{
              font: '600 24px/30px var(--ds-font-family-body, "Atlassian Sans")',
              color: token('color.text', 'var(--ds-text)'),
              margin: '0 0 20px',
            }}
          >
            {idea.title}
          </h1>

          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                font: '600 12px/16px var(--ds-font-family-body, "Atlassian Sans")',
                color: token('color.text.subtle', 'var(--ds-text-subtle)'),
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 4,
              }}
            >
              Problem
            </div>
            <DisplayView adf={idea.problem_statement as never} issueKey={idea.idea_key} />
          </div>

          {idea.proposed_value != null && (
            <div style={{ marginTop: 20, marginBottom: 8 }}>
              <div
                style={{
                  font: '600 12px/16px var(--ds-font-family-body, "Atlassian Sans")',
                  color: token('color.text.subtle', 'var(--ds-text-subtle)'),
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 4,
                }}
              >
                Proposed value
              </div>
              <DisplayView adf={idea.proposed_value as never} issueKey={idea.idea_key} />
            </div>
          )}

          <div style={{ marginTop: 32 }}>
            {commentsLoading ? (
              <Spinner size="small" />
            ) : (
              <ActivityPanel
                comments={cdsComments}
                historyItems={[]}
                currentUser={currentUser}
                hiddenTabs={['history', 'worklog']}
                onAddComment={async (content) => {
                  await addComment.mutateAsync(content);
                }}
                isSubmitting={addComment.isPending}
              />
            )}
          </div>
        </div>

        <aside
          style={{
            borderLeft: `1px solid ${token('color.border', 'var(--ds-border)')}`,
            paddingLeft: 20,
          }}
          data-testid="ideation-detail-rail"
        >
          <RailRow label="Stage">
            <StatusLozenge status={idea.workflow_status_key} />
          </RailRow>
          <RailRow label="Class">
            <ClassBadge ideaClass={idea.idea_class} />
          </RailRow>
          {idea.submitter_name && <RailRow label="Submitter">{idea.submitter_name}</RailRow>}
          {idea.product_name && <RailRow label="Product">{idea.product_name}</RailRow>}
        </aside>
      </div>
    </div>
  );
}
