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
import { isValidUUID } from '@/lib/utils/assertUuid';
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
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { type EntityConfig, RELEASE_CONFIG } from '@/lib/entity-hub/config';
import HealthPanel from '@/features/health/components/HealthPanel';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';

const BORDER = 'var(--ds-border)';
const TEXT = 'var(--ds-text)';
const SUBTLE = 'var(--ds-text-subtle)';
const LINK = 'var(--ds-link)';

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
  /** Milestone-only — populated when config.kind === 'milestone'. */
  quarter?: string | null;
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
  const params = useParams<{ releaseSlug?: string; sprintSlug?: string }>();
  const releaseId = entityIdOverride ?? params.releaseSlug ?? params.sprintSlug;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [collapsedNote, setCollapsedNote] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ issueKey: string; issueType: string | null } | null>(null);
  // Health panel — CAT-HEALTH-ENGINE-20260702-001 Phase 3/4 (Sprint + Timeline
  // share this detail page via EntityConfig, so one flag covers both).
  const [healthOpen, setHealthOpen] = useState(false);

  // 2026-06-30: select string is config-aware so milestone (product_milestones)
  // can alias title→name, product_id→project_id, target_date→release_date and
  // re-use the ReleaseRow shape without forking this component.
  const selectString = useMemo(() => {
    const cm = config.columnMap;
    const cols: string[] = ['id'];
    cols.push(cm.nameColumn === 'name' ? 'name, title' : `name:${cm.nameColumn}`);
    cols.push('description', 'status');
    cols.push(cm.fkProjectColumn === 'project_id' ? 'project_id' : `project_id:${cm.fkProjectColumn}`);
    cols.push('start_date');
    cols.push(cm.releaseDateColumn === 'release_date' ? 'release_date, target_date' : `release_date:${cm.releaseDateColumn}`);
    cols.push('section_name', 'section_description_adf');
    if (config.kind === 'milestone') cols.push('quarter');
    return cols.join(', ');
  }, [config]);

  const { data: release, isLoading, error: releaseError } = useQuery<ReleaseRow>({
    queryKey: [config.queryKeyPrefix, 'one', releaseId],
    queryFn: async () => {
      const field = isValidUUID(releaseId ?? '') ? 'id' : 'slug';
      const { data, error } = await (supabase as any)
        .from(config.table)
        .select(selectString)
        .eq(field, releaseId!)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as ReleaseRow;
    },
    enabled: !!releaseId,
  });

  // Parent entity: release/sprint live under ph_projects.
  // milestone lives under products (different table, different code column).
  const { data: project } = useQuery({
    queryKey: ['entity-parent', config.kind, release?.project_id],
    queryFn: async () => {
      if (config.kind === 'milestone') {
        const { data, error } = await supabase
          .from('products')
          .select('id, code, name')
          .eq('id', release!.project_id)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) return null;
        return { id: data.id, key: data.code, name: data.name } as { id: string; key: string; name: string };
      }
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

      if (oldName && oldName !== newName && config.kind !== 'milestone') {
        // Both release + sprint linkage live in ph_issues.sprint_release
        // JSONB (the canonical Jira payload). sprint_name text column is
        // wiped by jira-sync — never write to it. Milestones link via
        // business_request_milestone_links instead of ph_issues, so this
        // rename loop does not apply when config.kind === 'milestone'.
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

      const updatePayload: Record<string, string> = {
        [config.columnMap.nameColumn]: newName,
      };
      // ph_releases / ph_jira_sprints carry both `name` and `title` columns;
      // keep them in sync. product_milestones only has `title`.
      if (config.columnMap.nameColumn === 'name') {
        updatePayload.title = newName;
      }
      const { error } = await (supabase as any)
        .from(config.table)
        .update(updatePayload)
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

  if (releaseError) {
    return (
      <div style={{ padding: 24, color: 'var(--ds-text-danger)' }}>
        Failed to load {config.label.lowerSingular}: {releaseError.message}
      </div>
    );
  }

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
      <div style={{ flex: 1, minWidth: 0, height: '100%', overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Breadcrumb.
          All three entity surfaces (release / sprint / milestone) use the
          canonical ProjectPageHeader so breadcrumb + title styling stays
          uniform with /project-hub/:key/dashboard etc. */}
      {project && (
        <ProjectPageHeader
          hubType={
            config.kind === 'sprint'    ? 'project' :
            config.kind === 'milestone' ? 'product' :
            'release'
          }
          projectKey={
            config.kind === 'sprint' || config.kind === 'milestone'
              ? project.key
              : undefined
          }
          paddingX={0}
          trail={
            config.kind === 'sprint'    ? [
              { text: 'Sprints', href: listHrefOverride ?? `/project-hub/${project.key}/sprints` },
            ]
          : config.kind === 'milestone' ? [
              { text: 'Milestones', href: listHrefOverride ?? `/product-hub/${project.key}/milestones` },
            ]
          : [
              { text: 'Releases', href: listHrefOverride ?? '/release-hub/releases-management' },
            ]
          }
          title={
            isEditingTitle ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input
                  ref={titleInputRef}
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); saveTitle(); }
                    else if (e.key === 'Escape') { e.preventDefault(); cancelEditTitle(); }
                  }}
                  style={{
                    font: 'inherit',
                    color: TEXT,
                    padding: '0 6px',
                    border: `2px solid ${LINK}`,
                    borderRadius: 3,
                    outline: 'none',
                    background: 'var(--ds-surface)',
                    minWidth: 240,
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
                    width: 28,
                    height: 28,
                    borderRadius: 3,
                    border: '1px solid var(--ds-border)',
                    background: 'var(--ds-surface)',
                    color: canSaveTitle ? 'var(--ds-text)' : 'var(--ds-text-disabled)',
                    opacity: canSaveTitle ? 1 : 0.6,
                  }}
                >
                  <CheckIcon label="" size="small" />
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
                    width: 28,
                    height: 28,
                    borderRadius: 3,
                    border: '1px solid var(--ds-border)',
                    background: 'var(--ds-surface)',
                    color: 'var(--ds-text-subtle)',
                  }}
                >
                  <CrossIcon label="" size="small" />
                </button>
              </span>
            ) : (
              <span
                onClick={startEditTitle}
                title="Click to edit"
                style={{ cursor: 'pointer' }}
              >
                {title}
              </span>
            )
          }
          actions={
            <>
              {config.kind !== 'milestone' && (
                <button
                  type="button"
                  aria-label={`View ${config.label.lowerSingular} health`}
                  title={`View ${config.label.lowerSingular} health`}
                  onClick={() => { setSelectedItem(null); setHealthOpen((o) => !o); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, padding: 0, border: 'none', borderRadius: 3,
                    background: healthOpen ? 'var(--ds-background-selected)' : 'transparent',
                    cursor: 'pointer', transition: 'background 100ms ease',
                  }}
                  onMouseEnter={(e) => { if (!healthOpen) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered)'; }}
                  onMouseLeave={(e) => { if (!healthOpen) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <CatyPulseIcon size={16} title={`View ${config.label.lowerSingular} health`} />
                </button>
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
            </>
          }
        />
      )}
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
        onOpenItem={(it) => { setHealthOpen(false); setSelectedItem(it); }}
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
          background: 'var(--ds-border)',
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
            background: 'var(--ds-surface)',
            border: '1px solid var(--ds-border)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ds-text-subtle)',
            boxShadow: 'var(--ds-shadow-raised)',
            zIndex: 1,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, var(--ds-background-neutral))'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface)'; }}
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
        ) : healthOpen ? (
          <div style={{ width: 440, flexShrink: 0, height: '100%', overflowY: 'auto' }}>
            <HealthPanel
              scope={
                config.kind === 'sprint'
                  ? { moduleKey: 'sprint', sprintId: release.id }
                  : { moduleKey: 'timeline', releaseId: release.id }
              }
              entityConfig={config}
              entityName={release.name || release.title || null}
              title={release.name || release.title || config.label.singular}
              subtitle={config.label.lowerSingular}
              onOpenItem={(item) => {
                if (!item.itemKey) return;
                setHealthOpen(false);
                setSelectedItem({ issueKey: item.itemKey, issueType: item.type ?? null });
              }}
              onClose={() => setHealthOpen(false)}
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
              quarter={release.quarter ?? null}
              config={config}
            />
          </div>
        )
      )}
    </div>
  );
}

export default ReleaseDetailPage;
