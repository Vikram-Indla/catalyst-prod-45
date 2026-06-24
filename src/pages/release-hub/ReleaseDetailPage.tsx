/**
 * ReleaseDetailPage — release detail view.
 *
 * Layout (Phase 1 — left + main only; right rail to follow):
 *   - Breadcrumb: Spaces / [Product] / Releases
 *   - Title row: H1 + Give feedback + Summarize Release
 *   - EditableSectionName (collapsible body) with placeholder copy
 *   - Description (TODO: wire canonical Description with ADF adapter)
 *   - Work items section
 */
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '@atlaskit/button/new';
import FeedbackIcon from '@atlaskit/icon/core/feedback';
import ChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystFlag } from '@/lib/catalystFlag';
import { ShareFeedbackModal } from '@/components/releases/ShareFeedbackModal';
import { EditableSectionName } from '@/components/releases/detail/EditableSectionName';
import { WorkItemsSection } from '@/components/releases/detail/WorkItemsSection';
import { ReleaseSidePanel } from '@/components/releases/detail/ReleaseSidePanel';
import { Description } from '@/components/catalyst-detail-views/shared/sections/Description';
import type { AdfDoc } from '@/components/catalyst-detail-views/shared/sections/Description';
import { ReleaseSummaryCard } from '@/components/releases/detail/summarize/ReleaseSummaryCard';
import { useCatyReleaseSummarize } from '@/components/releases/detail/summarize/catyReleaseSummarizeStore';
import { useReleaseSummaryStream } from '@/components/releases/detail/summarize/useReleaseSummaryStream';
import { CatalystDetailPanel } from '@/components/shared/CatalystDetailPanel';

const BORDER = 'var(--ds-border, #DFE1E6)';
const TEXT = 'var(--ds-text, #292A2E)';
const SUBTLE = 'var(--ds-text-subtle, #505258)';
const LINK = 'var(--ds-link, #0052CC)';

interface ReleaseRow {
  id: string;
  name: string | null;
  title: string | null;
  description: string | null;
  status: string;
  project_id: string;
  start_date: string | null;
  release_date: string | null;
  target_date: string | null;
}

export function ReleaseDetailPage() {
  const { releaseId } = useParams<{ releaseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [collapsedNote, setCollapsedNote] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ issueKey: string; issueType: string | null } | null>(null);

  const { data: release, isLoading } = useQuery<ReleaseRow>({
    queryKey: ['ph-release', releaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_releases')
        .select('id, name, title, description, status, project_id, start_date, release_date, target_date')
        .eq('id', releaseId!)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as ReleaseRow;
    },
    enabled: !!releaseId,
  });

  const { data: project } = useQuery({
    queryKey: ['ph-project', release?.project_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_projects')
        .select('id, key, name')
        .eq('id', release!.project_id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as { id: string; key: string; name: string } | null;
    },
    enabled: !!release?.project_id,
  });

  const updateName = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('ph_releases')
        .update({ name, title: name })
        .eq('id', releaseId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-release', releaseId] });
      queryClient.invalidateQueries({ queryKey: ['projecthub', 'releases'] });
      catalystFlag.success('Section name updated.');
    },
    onError: (e: any) => catalystFlag.error(e?.message || 'Failed to update'),
  });

  const descriptionAdf: AdfDoc | null = useMemo(() => {
    const raw = release?.description ?? null;
    if (!raw) return null;
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try { return JSON.parse(trimmed) as AdfDoc; } catch { /* fall through */ }
    }
    return {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: raw }] }],
    } as AdfDoc;
  }, [release?.description]);

  const saveDescriptionAdf = async (adf: AdfDoc) => {
    const json = JSON.stringify(adf);
    const { error } = await supabase
      .from('ph_releases')
      .update({ description: json })
      .eq('id', releaseId!);
    if (error) throw new Error(error.message);
    queryClient.invalidateQueries({ queryKey: ['ph-release', releaseId] });
    catalystFlag.success('Description updated.');
  };

  const title = release?.name || release?.title || '';
  const sectionNameInitial = useMemo(() => '', []);
  const [sectionName, setSectionName] = useState<string>(sectionNameInitial);

  // ── Release summary (Summarize release button) ──────────────────
  useReleaseSummaryStream({ mountedForReleaseId: releaseId ?? null });
  const summaryPayload = useCatyReleaseSummarize((s) => s.payload);
  const summaryStatus = useCatyReleaseSummarize((s) => s.status);
  const summaryText = useCatyReleaseSummarize((s) => s.streamingText);
  const summaryError = useCatyReleaseSummarize((s) => s.errorMessage);
  const summaryAuto = useCatyReleaseSummarize((s) => s.autoEnabled);
  const dismissSummary = useCatyReleaseSummarize((s) => s.dismiss);
  const setSummaryAuto = useCatyReleaseSummarize((s) => s.setAuto);
  const startSummary = useCatyReleaseSummarize((s) => s.start);
  const [feedbackVote, setFeedbackVote] = useState<'up' | 'down' | null>(null);

  const showSummaryCard =
    !!releaseId &&
    summaryPayload?.releaseId === releaseId &&
    summaryStatus !== 'idle';

  if (isLoading || !release) {
    return <div style={{ padding: 24 }}>Loading release…</div>;
  }

  const handleSummarize = () => {
    setFeedbackVote(null);
    startSummary({
      releaseId: release.id,
      releaseName: release.name || release.title || null,
    });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '100%', paddingRight: sidebarCollapsed ? 20 : 0 }}>
      <div style={{ flex: 1, minWidth: 0, padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: 13, color: SUBTLE, display: 'flex', alignItems: 'center', gap: 6 }}>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); navigate('/release-hub/releases-management'); }}
          style={{ color: LINK, textDecoration: 'none' }}
        >
          Spaces
        </a>
        <span>/</span>
        {project && (
          <>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); navigate('/release-hub/releases-management'); }}
              style={{ color: LINK, textDecoration: 'none' }}
            >
              {project.name}
            </a>
            <span>/</span>
          </>
        )}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); navigate('/release-hub/releases-management'); }}
          style={{ color: LINK, textDecoration: 'none' }}
        >
          Releases
        </a>
      </nav>

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: TEXT, flex: 1 }}>
          {title}
        </h1>
        <Button
          appearance="subtle"
          iconBefore={(p) => <FeedbackIcon {...p} label="" />}
          onClick={() => setIsFeedbackOpen(true)}
        >
          Give feedback
        </Button>
        <Button appearance="default" onClick={handleSummarize}>
          ✦ Summarize Release
        </Button>
      </div>

      {/* Editable section name */}
      <EditableSectionName
        name={sectionName}
        onNameChange={(n) => { setSectionName(n); }}
        collapsed={collapsedNote}
        onToggleCollapsed={() => setCollapsedNote((v) => !v)}
      >
        <Description
          issue={{
            id: release.id,
            issue_key: `release-${release.id}`,
            description_adf: descriptionAdf as any,
          } as any}
          label=""
          loadAdf={descriptionAdf}
          saveOverride={saveDescriptionAdf}
          emptyPlaceholder="Add your own text here! You can use rich text, hyperlinks, dates, emojis, and more."
          disableEmptyHover
        />
      </EditableSectionName>

      {showSummaryCard && (
        <ReleaseSummaryCard
          status={summaryStatus}
          text={summaryText}
          errorMessage={summaryError}
          releaseId={release.id}
          onDismiss={dismissSummary}
          autoEnabled={summaryAuto}
          onToggleAuto={setSummaryAuto}
          onFeedback={(vote) => setFeedbackVote(vote)}
          selectedVote={feedbackVote}
        />
      )}

      {/* Work items section */}
      <WorkItemsSection
        releaseId={release.id}
        releaseName={(release.name || release.title || '')}
        projectId={release.project_id}
        projectKey={project?.key ?? null}
        onOpenItem={(it) => setSelectedItem(it)}
      />

      <ShareFeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
      </div>

      {/* Vertical divider + collapse toggle (full-height, touches header bottom) */}
      <div
        style={{
          position: 'relative',
          alignSelf: 'stretch',
          width: 1,
          background: 'var(--ds-border, #DFE1E6)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          aria-label={sidebarCollapsed ? 'Expand details panel' : 'Collapse details panel'}
          aria-expanded={!sidebarCollapsed}
          onClick={() => setSidebarCollapsed((v) => !v)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            position: 'absolute',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--ds-surface, #FFFFFF)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ds-text-subtle, #505258)',
            boxShadow: '0 1px 2px rgba(9,30,66,0.08)',
            zIndex: 1,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F1F2F4'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface, #FFFFFF)'; }}
        >
          {sidebarCollapsed ? <ChevronLeftIcon label="" size="small" /> : <ChevronRightIcon label="" size="small" />}
        </button>
      </div>

      {!sidebarCollapsed && (
        selectedItem ? (
          <CatalystDetailPanel
            isOpen
            inline
            width={440}
            itemId={selectedItem.issueKey}
            itemType={selectedItem.issueType ?? undefined}
            typeIconLabel={selectedItem.issueType ?? undefined}
            projectId={release.project_id}
            projectKey={project?.key ?? ''}
            entityKind="ph_issue"
            onClose={() => setSelectedItem(null)}
          />
        ) : (
          <div style={{ width: 360, flexShrink: 0, padding: '24px 32px 24px 24px' }}>
            <ReleaseSidePanel
              releaseId={release.id}
              releaseName={release.name || release.title || ''}
              status={release.status}
              startDate={release.start_date}
              releaseDate={release.release_date}
              projectId={release.project_id}
              projectKey={project?.key ?? null}
              description={release.description}
            />
          </div>
        )
      )}
    </div>
  );
}

export default ReleaseDetailPage;
