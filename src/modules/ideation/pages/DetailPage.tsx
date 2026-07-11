/**
 * Ideation · Idea detail — /ideation/ideas/:slug.
 *
 * Phase 2 S3: real detail page — problem/proposed-value ADF, a read-only
 * property rail, and working comments. Structural evidence: 05 §C row 4
 * (Linear issue detail — "Structural 1:1 with C.4 (CatalystViewBase +
 * ActivityPanel + rail) — confirmed"). AI Copilot rail tab, votes, evidence,
 * and scoring stay out of scope (see 03_PLAN_LOCK_PHASE2_S3_DETAIL.md).
 */
import { useMemo, useState } from 'react';
import Button from '@atlaskit/button/new';
import { useNavigate, useParams } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import { HubPageHeader } from '@/components/layout/HubPageHeader';
import { EmptyState } from '@/components/ads/EmptyState';
import { SectionMessage } from '@/components/ads/SectionMessage';
import { Routes } from '@/lib/routes';
import { DisplayView } from '@/components/catalyst-detail-views/shared/sections/Description/_components/DisplayView/DisplayView';
import { ActivityPanel } from '@/components/catalyst-ds/activity/ActivityPanel';
import type { CdsComment, CdsUser } from '@/components/catalyst-ds/types';
import { StatusLozenge } from '@/components/shared/StatusLozenge/StatusLozenge';
import { ReasonCaptureModal } from '@/components/catalyst-detail-views/shared/workflow/ReasonCaptureModal';
import { VoteControl } from '@/modules/ideation/components/VoteControl';
import { WatchControl } from '@/modules/ideation/components/WatchControl';
import { useAuth } from '@/hooks/useAuth';
import { useConvertIdeaToBusinessRequest } from '@/hooks/useIdeationConvert';
import { useMergeIdea } from '@/hooks/useIdeationMerge';
import Textfield from '@atlaskit/textfield';
import {
  useIdeationIdea,
  useIdeationComments,
  useAddIdeationComment,
  useIdeaApprovalGuardCheck,
  useDecideIdeaTransition,
} from '@/hooks/useIdeationDetail';
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

/** Approve/Decline/Park — Phase 3 S1. Advisory only (see Plan Lock non-scope:
 *  ph_wf_enforcement_config has no 'ideation' row, so gateTransition never
 *  blocks here); guard results render inline so reviewers see the real
 *  strategy-link/scores/duplicate-review evidence before deciding, not just
 *  after. Merge is excluded — needs a merge-target picker (own C.6 surface). */
function DecisionArea({ idea }: { idea: IdeaDetailRow }) {
  const { data: guardResults, isLoading: guardsLoading } = useIdeaApprovalGuardCheck(idea);
  const decide = useDecideIdeaTransition(idea);
  const [reasonTarget, setReasonTarget] = useState<'declined' | 'parked' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const failing = (guardResults ?? []).filter((g) => g.passed === false);
  const passing = (guardResults ?? []).filter((g) => g.passed === true);

  const handleDecide = async (toStatusKey: string, reason?: { code: string | null; text: string | null }) => {
    setError(null);
    try {
      await decide.mutateAsync({ toStatusKey, reasonCode: reason?.code, reasonText: reason?.text });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the decision.');
    }
  };

  return (
    <div style={{ marginTop: 32, borderTop: `1px solid ${token('color.border', 'var(--ds-border)')}`, paddingTop: 20 }}>
      <div
        style={{
          font: '600 12px/16px var(--ds-font-family-body, "Atlassian Sans")',
          color: token('color.text.subtle', 'var(--ds-text-subtle)'),
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 12,
        }}
      >
        Decision
      </div>

      {!guardsLoading && (passing.length > 0 || failing.length > 0) && (
        <div style={{ marginBottom: 12 }}>
          <SectionMessage appearance={failing.length > 0 ? 'warning' : 'success'}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {[...failing, ...passing].map((g, i) => (
                <li key={i}>
                  {g.guardType.replace(/_/g, ' ')}: {g.detail}
                </li>
              ))}
            </ul>
          </SectionMessage>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 12 }}>
          <SectionMessage appearance="error">{error}</SectionMessage>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <Button appearance="primary" isDisabled={decide.isPending} onClick={() => handleDecide('approved')}>
          Approve
        </Button>
        <Button isDisabled={decide.isPending} onClick={() => setReasonTarget('declined')}>
          Decline
        </Button>
        <Button isDisabled={decide.isPending} onClick={() => setReasonTarget('parked')}>
          Park
        </Button>
      </div>

      {reasonTarget && (
        <ReasonCaptureModal
          entityType="ideation"
          itemKey={idea.idea_key}
          itemTitle={idea.title}
          fromStatus={idea.workflow_status_key}
          toStatus={reasonTarget}
          onSubmit={(reason) => {
            setReasonTarget(null);
            void handleDecide(reasonTarget, reason);
          }}
          onCancel={() => setReasonTarget(null)}
        />
      )}
    </div>
  );
}

/** Approved → Business Request — Phase 5 S1. Direct single-step conversion,
 *  not the full AI-draft wizard (see Plan Lock non-scope). Shows the
 *  created request_key as confirmation text — no deep link, since building
 *  the /product-hub/:productCode/backlog/:key route needs a resolved
 *  product code this idea may not have. */
function ConvertArea({ idea }: { idea: IdeaDetailRow }) {
  const convert = useConvertIdeaToBusinessRequest(idea);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ requestKey: string } | null>(null);

  const handleConvert = async () => {
    setError(null);
    try {
      const res = await convert.mutateAsync();
      setResult({ requestKey: res.requestKey });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not convert this idea.');
    }
  };

  if (result) {
    return (
      <div style={{ marginTop: 32, borderTop: `1px solid ${token('color.border', 'var(--ds-border)')}`, paddingTop: 20 }}>
        <SectionMessage appearance="success">Converted to {result.requestKey}.</SectionMessage>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 32, borderTop: `1px solid ${token('color.border', 'var(--ds-border)')}`, paddingTop: 20 }}>
      <div
        style={{
          font: '600 12px/16px var(--ds-font-family-body, "Atlassian Sans")',
          color: token('color.text.subtle', 'var(--ds-text-subtle)'),
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 12,
        }}
      >
        Conversion
      </div>
      {error && (
        <div style={{ marginBottom: 12 }}>
          <SectionMessage appearance="error">{error}</SectionMessage>
        </div>
      )}
      <Button appearance="primary" isDisabled={convert.isPending} onClick={handleConvert}>
        Convert to Business Request
      </Button>
    </div>
  );
}

/** screening → merged — Phase 3 S5. Winner-takes V1: status transition +
 *  terminal lock only, no vote/evidence/watcher transfer (RLS blocks a
 *  client session from touching other users' rows — needs a migration-
 *  backed RPC, flagged honestly rather than faked). See Plan Lock. */
function MergeArea({ idea }: { idea: IdeaDetailRow }) {
  const merge = useMergeIdea(idea);
  const [targetKey, setTargetKey] = useState('');
  const [showReason, setShowReason] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merged, setMerged] = useState<string | null>(null);

  const handleMerge = async (reason: { code: string | null; text: string | null }) => {
    setShowReason(false);
    setError(null);
    try {
      const res = await merge.mutateAsync({ targetIdeaKey: targetKey, reason: reason.text ?? reason.code ?? '' });
      setMerged(res.targetIdeaKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not merge this idea.');
    }
  };

  if (merged) {
    return (
      <div style={{ marginTop: 32, borderTop: `1px solid ${token('color.border', 'var(--ds-border)')}`, paddingTop: 20 }}>
        <SectionMessage appearance="success">Merged into {merged}.</SectionMessage>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 32, borderTop: `1px solid ${token('color.border', 'var(--ds-border)')}`, paddingTop: 20 }}>
      <div
        style={{
          font: '600 12px/16px var(--ds-font-family-body, "Atlassian Sans")',
          color: token('color.text.subtle', 'var(--ds-text-subtle)'),
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 12,
        }}
      >
        Duplicate?
      </div>
      <div style={{ marginBottom: 12 }}>
        <SectionMessage appearance="information">
          Merging locks this idea as read-only and links it to the target. Votes, evidence, and watchers do not
          transfer automatically yet — that needs a follow-up change.
        </SectionMessage>
      </div>
      {error && (
        <div style={{ marginBottom: 12 }}>
          <SectionMessage appearance="error">{error}</SectionMessage>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: 360 }}>
        <div style={{ flex: 1 }}>
          <label
            htmlFor="merge-target-key"
            style={{ display: 'block', font: '600 12px/16px var(--ds-font-family-body, "Atlassian Sans")', color: token('color.text.subtle', 'var(--ds-text-subtle)'), marginBottom: 4 }}
          >
            Merge into (idea key)
          </label>
          <Textfield
            id="merge-target-key"
            placeholder="IDEA-9"
            value={targetKey}
            onChange={(e) => setTargetKey((e.target as HTMLInputElement).value)}
          />
        </div>
        <Button isDisabled={merge.isPending || !targetKey.trim()} onClick={() => setShowReason(true)}>
          Merge
        </Button>
      </div>
      {showReason && (
        <ReasonCaptureModal
          entityType="ideation"
          itemKey={idea.idea_key}
          itemTitle={idea.title}
          fromStatus={idea.workflow_status_key}
          toStatus="merged"
          onSubmit={handleMerge}
          onCancel={() => setShowReason(false)}
        />
      )}
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

          {idea.workflow_status_key === 'evaluation' && <DecisionArea idea={idea} />}
          {idea.workflow_status_key === 'approved' && <ConvertArea idea={idea} />}
          {idea.workflow_status_key === 'screening' && <MergeArea idea={idea} />}
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
          {idea.decision && (
            <RailRow label="Decision">
              {idea.decision}
              {idea.decision_reason && ` — ${idea.decision_reason}`}
            </RailRow>
          )}
          <RailRow label="Community">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <VoteControl ideaId={idea.id} />
              <WatchControl ideaId={idea.id} />
            </div>
          </RailRow>
        </aside>
      </div>
    </div>
  );
}
