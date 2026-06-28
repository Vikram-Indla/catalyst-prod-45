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
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '@atlaskit/button/new';
import FeedbackIcon from '@atlaskit/icon/core/feedback';
import ChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import CheckIcon from '@atlaskit/icon/glyph/check';
import CrossIcon from '@atlaskit/icon/glyph/cross';
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
import { TicketBreadcrumbs } from '@/modules/project-work-hub/components/TicketBreadcrumbs';
import { type EntityConfig, RELEASE_CONFIG } from '@/lib/entity-hub/config';

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
  section_name: string | null;
  section_description_adf: any | null;
}

interface ReleaseDetailPageProps {
  /** 2026-06-26: entity-hub config. Defaults to RELEASE_CONFIG so existing
   *  release-hub usages stay unchanged. Sprint surface mounts this component
   *  with SPRINT_CONFIG (table=ph_jira_sprints, query keys + labels swap). */
  config?: EntityConfig;
  /** When provided, overrides the URL `:releaseId` param. Used by SprintDetailPage
   *  which mounts on `/project-hub/:key/sprints/:sprintId`. */
  entityIdOverride?: string;
  /** Override the "Back to list" breadcrumb href. Defaults to config.baseUrl. */
  listHrefOverride?: string;
}

export function ReleaseDetailPage({
  config = RELEASE_CONFIG,
  entityIdOverride,
  listHrefOverride,
}: ReleaseDetailPageProps = {}) {
  const params = useParams<{ releaseId?: string; sprintId?: string }>();
  const releaseId = entityIdOverride ?? params.releaseId ?? params.sprintId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [collapsedNote, setCollapsedNote] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ issueKey: string; issueType: string | null } | null>(null);

  const { data: release, isLoading } = useQuery<ReleaseRow>({
    queryKey: [config.queryKeyPrefix, 'one', releaseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(config.table)
        .select('id, name, title, description, status, project_id, start_date, release_date, target_date, section_name, section_description_adf')
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
      const oldName = (release?.name || release?.title || '').trim();
      const newName = name.trim();

      if (oldName && oldName !== newName) {
        // Both release + sprint linkage live in ph_issues.sprint_release
        // JSONB (the canonical Jira payload). sprint_name text column is
        // wiped by jira-sync — never write to it.
        const { data: rows, error: rErr } = await (supabase as any)
          .from('ph_issues')
          .select('id, sprint_release')
          .contains('sprint_release', JSON.stringify([{ name: oldName }]));
        if (rErr) throw new Error(rErr.message);
        for (const row of rows ?? []) {
          const arr: any[] = Array.isArray((row as any).sprint_release) ? (row as any).sprint_release : [];
          const next = arr.map((el: any) =>
            el && el.name === oldName ? { ...el, name: newName } : el,
          );
          const { error: uErr } = await (supabase as any)
            .from('ph_issues')
            .update({ sprint_release: next })
            .eq('id', (row as any).id);
          if (uErr) throw new Error(uErr.message);
        }
      }

      const { error } = await (supabase as any)
        .from(config.table)
        .update({ name: newName, title: newName })
        .eq('id', releaseId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix, 'one', releaseId] });
      queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix] });
      queryClient.invalidateQueries({ queryKey: ['ph_release_items'] });
      catalystFlag.success(`${config.label.singular} name updated.`);
    },
    onError: (e: any) => catalystFlag.error(e?.message || 'Failed to update'),
  });

  // Section description (rich text) — lives on ph_releases.section_description_adf.
  // Intentionally separate from ph_releases.description (release-level plain text).
  const sectionDescriptionAdf: AdfDoc | null = useMemo(() => {
    const raw = release?.section_description_adf ?? null;
    if (!raw) return null;
    if (typeof raw === 'object') return raw as AdfDoc;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw) as AdfDoc; } catch { return null; }
    }
    return null;
  }, [release?.section_description_adf]);

  const saveSectionDescriptionAdf = async (adf: AdfDoc) => {
    const { error } = await (supabase as any)
      .from(config.table)
      .update({ section_description_adf: adf })
      .eq('id', releaseId!);
    if (error) throw new Error(error.message);
    queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix, 'one', releaseId] });
    catalystFlag.success('Section description updated.');
  };

  const saveSectionName = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await (supabase as any)
        .from(config.table)
        .update({ section_name: name })
        .eq('id', releaseId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKeyPrefix, 'one', releaseId] });
    },
    onError: (e: any) => catalystFlag.error(e?.message || 'Failed to update section name'),
  });

  const title = release?.name || release?.title || '';
  const [sectionName, setSectionName] = useState<string>('');
  useEffect(() => {
    setSectionName(release?.section_name ?? '');
  }, [release?.section_name]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  const startEditTitle = () => {
    setTitleDraft(title);
    setIsEditingTitle(true);
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 0);
  };
  const cancelEditTitle = () => {
    setIsEditingTitle(false);
    setTitleDraft('');
  };
  const canSaveTitle =
    titleDraft.trim().length > 0 && titleDraft.trim() !== title && !updateName.isPending;
  const saveTitle = () => {
    if (!canSaveTitle) return;
    updateName.mutate(titleDraft.trim(), {
      onSuccess: () => {
        setIsEditingTitle(false);
        setTitleDraft('');
      },
    });
  };

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
    return <div style={{ padding: 24 }}>Loading {config.label.lowerSingular}…</div>;
  }

  const handleSummarize = () => {
    setFeedbackVote(null);
    startSummary({
      releaseId: release.id,
      releaseName: release.name || release.title || null,
      entityKind: config.kind,
    });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', minHeight: 0, overflow: 'hidden', paddingRight: sidebarCollapsed ? 20 : 0 }}>
      <div style={{ flex: 1, minWidth: 0, height: '100%', overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb — canonical TicketBreadcrumbs. itemType + projectHref
          come from EntityConfig so sprint surface reads "Sprint / Iteration"
          and links back to /project-hub/:key/sprints. */}
      {project && (
        <TicketBreadcrumbs
          projectKey={project.key}
          projectName={project.name}
          itemType={config.kind === 'sprint' ? 'Sprint / Iteration' : 'Release'}
          itemKey={title}
          projectHref={listHrefOverride ?? (config.kind === 'sprint'
            ? `/project-hub/${project.key}/sprints`
            : '/release-hub/releases-management')}
        />
      )}

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {isEditingTitle ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); saveTitle(); }
                else if (e.key === 'Escape') { e.preventDefault(); cancelEditTitle(); }
              }}
              style={{
                flex: 1,
                fontSize: 24,
                fontWeight: 700,
                color: TEXT,
                fontFamily: 'inherit',
                lineHeight: 1.2,
                padding: '2px 6px',
                border: `2px solid ${LINK}`,
                borderRadius: 3,
                outline: 'none',
                background: 'var(--ds-surface, #FFFFFF)',
              }}
            />
            <button
              type="button"
              aria-label="Save title"
              disabled={!canSaveTitle}
              onClick={saveTitle}
              style={{
                all: 'unset',
                cursor: canSaveTitle ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 3,
                border: '1px solid var(--ds-border, #DFE1E6)',
                boxSizing: 'border-box',
                background: 'var(--ds-surface, #FFFFFF)',
                color: canSaveTitle ? 'var(--ds-text, #292A2E)' : 'var(--ds-text-disabled, #A5ADBA)',
                opacity: canSaveTitle ? 1 : 0.6,
              }}
              onMouseEnter={(e) => {
                if (canSaveTitle) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, var(--ds-background-neutral, #F1F2F4))';
              }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface, #FFFFFF)'; }}
            >
              <CheckIcon label="" size="medium" />
            </button>
            <button
              type="button"
              aria-label="Cancel"
              onClick={cancelEditTitle}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 3,
                border: '1px solid var(--ds-border, #DFE1E6)',
                boxSizing: 'border-box',
                background: 'var(--ds-surface, #FFFFFF)',
                color: 'var(--ds-text-subtle, #505258)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, var(--ds-background-neutral, #F1F2F4))'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface, #FFFFFF)'; }}
            >
              <CrossIcon label="" size="medium" />
            </button>
          </div>
        ) : (
          <h1
            onClick={startEditTitle}
            title="Click to edit"
            style={{
              margin: 0,
              padding: 0,
              fontSize: 24,
              fontWeight: 700,
              color: TEXT,
              flex: 1,
              cursor: 'pointer',
            }}
          >
            {title}
          </h1>
        )}
        <Button
          appearance="subtle"
          iconBefore={(p) => <FeedbackIcon {...p} label="" />}
          onClick={() => setIsFeedbackOpen(true)}
        >
          Give feedback
        </Button>
        <Button appearance="default" onClick={handleSummarize}>
          ✦ Summarize {config.label.singular}
        </Button>
      </div>

      {/* Editable section name — persists to ph_releases.section_name.
          Body description persists to ph_releases.section_description_adf
          (NOT ph_releases.description — that is the release-level field). */}
      <EditableSectionName
        name={sectionName}
        onNameChange={(n) => {
          setSectionName(n);
          saveSectionName.mutate(n);
        }}
        collapsed={collapsedNote}
        onToggleCollapsed={() => setCollapsedNote((v) => !v)}
      >
        <Description
          issue={{
            id: release.id,
            issue_key: `release-${release.id}`,
            description_adf: sectionDescriptionAdf as any,
          } as any}
          label=""
          loadAdf={sectionDescriptionAdf}
          saveOverride={saveSectionDescriptionAdf}
          emptyPlaceholder="Add your own text here! You can use rich text, hyperlinks, dates, emojis, and more."
          disableEmptyHover
          disableHover
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
          entityLabel={config.label.singular}
        />
      )}

      {/* Work items section */}
      <WorkItemsSection
        releaseId={release.id}
        releaseName={(release.name || release.title || '')}
        projectId={release.project_id}
        projectKey={project?.key ?? null}
        onOpenItem={(it) => setSelectedItem(it)}
        config={config}
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
            boxShadow: '0 1px 2px rgba(9,30,66,0.08)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
            zIndex: 1,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, var(--ds-background-neutral, #F1F2F4))'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface, #FFFFFF)'; }}
        >
          {sidebarCollapsed ? <ChevronLeftIcon label="" size="small" /> : <ChevronRightIcon label="" size="small" />}
        </button>
      </div>

      {!sidebarCollapsed && (
        selectedItem ? (
          <div style={{ height: '100%', overflowY: 'auto', flexShrink: 0 }}>
            <CatalystDetailPanel
              isOpen
              inline
              width={560}
              itemId={selectedItem.issueKey}
              itemType={selectedItem.issueType ?? undefined}
              typeIconLabel={selectedItem.issueType ?? undefined}
              projectId={release.project_id}
              projectKey={project?.key ?? ''}
              entityKind="ph_issue"
              onClose={() => setSelectedItem(null)}
            />
          </div>
        ) : (
          <div style={{ width: 440, flexShrink: 0, height: '100%', overflowY: 'auto', padding: '24px 32px 24px 24px' }}>
            <ReleaseSidePanel
              releaseId={release.id}
              releaseName={release.name || release.title || ''}
              status={release.status}
              startDate={release.start_date}
              releaseDate={release.release_date}
              projectId={release.project_id}
              projectKey={project?.key ?? null}
              description={release.description}
              config={config}
            />
          </div>
        )
      )}
    </div>
  );
}

export default ReleaseDetailPage;
