/**
 * CatalystViewBusinessRequestV3 — Business Request detail view.
 *
 * Structurally cloned from CatalystViewStory: same CatalystViewBase shell,
 * same leftContent/rightContent memo pattern, same CatalystViewBaseProps
 * contract (itemId = request key, e.g. "MDT-688").
 *
 * Data: useProductHubBusinessRequest (business_requests table) instead of
 * useCatalystIssue (ph_issues). Left rail uses BR-specific sections;
 * right rail uses BrSidebarDetails with the status pill in the header
 * (matching Story's "In Requirements ▾" + "Improve Story" header pattern).
 *
 * Replaces CatalystViewBusinessRequest.v2 on all mount sites:
 *   - CatalystDetailRouter (primary)
 *   - KanbanPage, CardsPage, RequestListingPage, ProductRoadmapPage
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { catalystToast } from '@/lib/catalystToast';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useProductHubBusinessRequest } from './useProductHubBusinessRequest';
import { useDuplicateBusinessRequest } from '@/hooks/useBusinessRequests';
import {
  BrAttachmentsSection,
  BrActivitySection,
} from './sections';
import { CatalystStatusPill } from '../shared/sections/CatalystStatusPill';
import { CatalystSidebarDetails } from '../shared/sections/CatalystSidebarDetails';
import { CatalystTitleEditor } from '../shared/sections/CatalystTitleEditor';
import { CatalystKeyDetails, KeyDetailsFieldRow } from '../shared/sections/CatalystKeyDetails';
import { Description } from '../shared/sections/Description';
import { mapBrToIssueLike } from './sections/BrSidebarAdapter';
import { CatalystQuickActions } from '../shared/sections';
import Select, { CreatableSelect } from '@atlaskit/select';
import { Checkbox } from '@atlaskit/checkbox';
import {
  THEME_OPTIONS,
  STAKEHOLDER_OPTIONS,
  REQUEST_TYPE_OPTIONS,
} from '@/types/business-request';
import { ProductReleasePicker } from '@/components/product/ProductReleasePicker';
import { HealthStatusBadge } from '@/components/business-request/HealthStatusBadge';
import type { AdfDoc } from '../shared/sections/Description/utils/adfToTiptap';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { ImproveIssueDropdown } from '../improve';
import { WatchersChip } from '../shared/WatchersChip';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import { ConfirmCloneDialog } from '../shared/ConfirmCloneDialog';
import { BrMoveProductDialog } from './BrMoveProductDialog';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { BUSINESS_REQUEST_SUBTASK_TYPES } from '../shared/parent-rules';
import type { CatalystViewBaseProps } from '../shared/types';
import { useBusinessRequestHealth } from '@/hooks/useBusinessRequestHealth';
import { useTrackRecentItem } from '@/hooks/useRecentProjectItems';
import { useClearableOnOpen } from '@/hooks/useClearableOnOpen';

export default function CatalystViewBusinessRequestV3({
  isOpen, onClose, itemId,
  projectKey,
  panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
  hideSidebar,
}: CatalystViewBaseProps) {
  const { request, resolvedId, isLoading, updateField, deleteRequest } =
    useProductHubBusinessRequest({ requestKey: itemId });

  const { health } = useBusinessRequestHealth(itemId);

  const isNewlyCreated = !!(
    request &&
    request.status === 'New' &&
    !request.description
  );
  const isClosed = ['done', 'canceled'].includes(
    (request?.process_step ?? '').toLowerCase(),
  );
  const duplicateMutation = useDuplicateBusinessRequest();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showCloneDialog, setShowCloneDialog] = React.useState(false);
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);
  const openDetail = useGlobalSearchStore((s) => s.openDetail);

  /* Dropdown open state tracking — Type, Category, Theme.
     X (clear) button only shows when dropdown is expanded. */
  const type = useClearableOnOpen();
  const category = useClearableOnOpen();
  const theme = useClearableOnOpen();

  /* Recents tracking — Business Request type. Mirrors Story view
     (CatalystViewStory). Guards on first mount per request id so re-opening
     the same BR doesn't spam writes. */
  const trackRecent = useTrackRecentItem();
  const recordedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !resolvedId || !request?.title) return;
    if (recordedRef.current === resolvedId) return;
    recordedRef.current = resolvedId;
    trackRecent.mutate({
      entityType: 'business_request',
      entityId: resolvedId,
      entityKey: request.request_key ?? undefined,
      displaySummary: request.title,
      projectId: undefined,
      projectName: 'Product Hub',
      navPath: `/product-hub/requests/${request.request_key ?? resolvedId}`,
    });
  }, [isOpen, resolvedId, request?.title, request?.request_key, trackRecent]);

  /* ── Description adapter — canonical Tiptap Description, fed by
     business_requests.description (string column). The column may hold
     either a stringified ADF JSON document (preferred) or plain text
     (legacy rows). loadAdf parses or wraps into an ADF doc. */
  const descriptionAdf = useMemo<AdfDoc | null>(() => {
    const desc = request?.description ?? '';
    if (!desc.trim()) return null;
    try {
      const parsed = JSON.parse(desc);
      if (parsed && typeof parsed === 'object' && (parsed as { type?: string }).type === 'doc') {
        return parsed as AdfDoc;
      }
    } catch {
      /* not JSON — wrap as paragraph below */
    }
    return {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: desc }] },
      ],
    } as AdfDoc;
  }, [request?.description]);

  const handleDescriptionSave = useCallback(
    async (adf: AdfDoc) => {
      await updateField('description', JSON.stringify(adf));
    },
    [updateField],
  );

  /* ── Key details extraRows — BR-specific fields rendered through the
     canonical CatalystKeyDetails section + KeyDetailsFieldRow atom for
     typography/spacing parity. Replaces BrCenterDetails fork. */
  const TYPE_SELECT_OPTIONS = useMemo(
    () => REQUEST_TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label })),
    [],
  );
  const CATEGORY_OPTIONS = useMemo(
    () => [
      { value: 'Industrial', label: 'Industrial' },
      { value: 'Ministry Website', label: 'Ministry Website' },
      { value: 'Internal Services', label: 'Internal Services' },
      { value: 'Innovation Platform', label: 'Innovation Platform' },
    ],
    [],
  );
  const THEME_SELECT_OPTIONS = useMemo(
    () => THEME_OPTIONS.map((t) => ({ value: t.value, label: t.labelEn ?? t.label })),
    [],
  );
  const STAKEHOLDER_SELECT_OPTIONS = useMemo(
    () => STAKEHOLDER_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
    [],
  );

  const brKeyDetailsRows = useMemo(() => {
    if (!request) return null;
    const requestTypeRaw = (request as unknown as { request_type?: string | null }).request_type ?? null;
    const categoryRaw = (request as unknown as { category?: string | null }).category ?? null;
    return (
      <>
        <KeyDetailsFieldRow label="Type">
          <Select
            inputId="br-key--type"
            appearance="subtle"
            options={TYPE_SELECT_OPTIONS}
            value={TYPE_SELECT_OPTIONS.find((o) => o.value === requestTypeRaw) ?? null}
            onChange={(opt) => void updateField('request_type', (opt as { value: string } | null)?.value ?? null)}
            isClearable={type.isClearable}
            isSearchable={false}
            placeholder="Select type"
            onMenuOpen={type.onMenuOpen}
            onMenuClose={type.onMenuClose}
          />
        </KeyDetailsFieldRow>
        <KeyDetailsFieldRow label="Category">
          <Select
            inputId="br-key--category"
            appearance="subtle"
            options={CATEGORY_OPTIONS}
            value={CATEGORY_OPTIONS.find((o) => o.value === categoryRaw) ?? null}
            onChange={(opt) => void updateField('category', (opt as { value: string } | null)?.value ?? null)}
            isClearable={category.isClearable}
            isSearchable={false}
            placeholder="Select category"
            onMenuOpen={category.onMenuOpen}
            onMenuClose={category.onMenuClose}
          />
        </KeyDetailsFieldRow>
        <KeyDetailsFieldRow label="Theme">
          <Select
            inputId="br-key--theme"
            appearance="subtle"
            options={THEME_SELECT_OPTIONS}
            value={THEME_SELECT_OPTIONS.find((o) => o.value === request.theme) ?? null}
            onChange={(opt) => void updateField('theme', (opt as { value: string } | null)?.value ?? null)}
            isClearable={theme.isClearable}
            isSearchable
            placeholder="Select theme"
            onMenuOpen={theme.onMenuOpen}
            onMenuClose={theme.onMenuClose}
          />
        </KeyDetailsFieldRow>
        <KeyDetailsFieldRow label="Stakeholders" alignBlock="start">
          <CreatableSelect
            inputId="br-key--stakeholders"
            appearance="subtle"
            isMulti
            isClearable={false}
            options={STAKEHOLDER_SELECT_OPTIONS}
            value={[
              ...STAKEHOLDER_SELECT_OPTIONS.filter((o) => (request.stakeholders ?? []).includes(o.value)),
              ...(request.stakeholders ?? [])
                .filter((v) => !STAKEHOLDER_SELECT_OPTIONS.find((o) => o.value === v))
                .map((v) => ({ value: v, label: v })),
            ]}
            onChange={(vals) =>
              void updateField(
                'stakeholders',
                (Array.from(vals ?? []) as { value: string }[]).map((v) => v.value),
              )
            }
            placeholder="+ Add stakeholder"
            formatCreateLabel={(input: string) => `Add "${input}"`}
          />
        </KeyDetailsFieldRow>
        <KeyDetailsFieldRow label="Release">
          <ProductReleasePicker
            inputId="br-key--release"
            productId={request?.product_id ?? null}
            value={(request as any).release_id ?? null}
            onChange={(releaseId) => void updateField('release_id', releaseId)}
          />
        </KeyDetailsFieldRow>
        <KeyDetailsFieldRow label="Targeted">
          <Checkbox
            isChecked={!!request.targeted_feature}
            onChange={(e) =>
              void updateField('targeted_feature', (e.target as HTMLInputElement).checked)
            }
            label="Targeted feature"
            name="br-key--targeted-feature"
          />
        </KeyDetailsFieldRow>
        {health && (
          <KeyDetailsFieldRow label="Health" alignBlock="center">
            <HealthStatusBadge health={health} />
          </KeyDetailsFieldRow>
        )}
      </>
    );
  }, [
    request,
    updateField,
    TYPE_SELECT_OPTIONS,
    CATEGORY_OPTIONS,
    THEME_SELECT_OPTIONS,
    STAKEHOLDER_SELECT_OPTIONS,
    health,
    type.isClearable,
    category.isClearable,
    theme.isClearable,
  ]);

  const brAsIssueLike = useMemo(
    () =>
      request
        ? {
            id: resolvedId ?? undefined,
            issue_key: request.request_key,
            issue_type: 'Business Request',
            summary: request.title,
            description_text:
              typeof request.description === 'string' ? request.description : null,
            acceptance_criteria: null,
            project_key: 'MIM',
            source: 'catalyst' as const,
          }
        : null,
    [request, resolvedId],
  );

  const handleApplyDescription = useCallback(
    async (newDesc: string) => {
      await updateField('description', newDesc);
    },
    [updateField],
  );

  const handleCloneConfirm = useCallback(async () => {
    if (!resolvedId) return;
    try {
      const newReq = await duplicateMutation.mutateAsync(resolvedId);
      catalystToast.success(`Duplicated as ${newReq?.request_key ?? 'BR'}`);
      setShowCloneDialog(false);
    } catch {
      /* hook surfaces its own error toast */
    }
  }, [resolvedId, duplicateMutation]);

  const handleDeleteConfirm = useCallback(async () => {
    try {
      await deleteRequest();
      catalystToast.success('Business Request deleted');
      setShowDeleteDialog(false);
      onClose();
    } catch {
      catalystToast.error('Delete failed');
    }
  }, [deleteRequest, onClose]);

  // ── Left rail (mirrors Story's leftContent slot) ──────────────────────────
  const leftContent = useMemo(
    () => (
      <>
        {/* Canonical Story title editor (CatalystTitleEditor) mounted via
            mapBrToIssueLike adapter. Replaces former BrTitleSection fork. */}
        <CatalystTitleEditor
          issue={mapBrToIssueLike(request)}
          onTitleChange={(t) => { void updateField('title', t); }}
        />
        <CatalystQuickActions />
        {/* Canonical Key details — Parent hidden (BR has no parent concept),
            Priority on (mapBrToIssueLike.priority = urgency), urgency write
            via dataSource.onPriorityChange. BR-specific fields (Type,
            Category, Theme, Stakeholders, Release, Targeted) injected via
            extraRows using KeyDetailsFieldRow for typography parity. */}
        {request && resolvedId && (
          <CatalystKeyDetails
            issue={mapBrToIssueLike(request)}
            itemId={resolvedId}
            itemType="business_request"
            showParent={false}
            showPriority
            dataSource={{
              onPriorityChange: async (p) => { await updateField('urgency', p); },
            }}
            extraRows={brKeyDetailsRows}
            afterBody={
              <Description
                issue={mapBrToIssueLike(request)}
                loadAdf={descriptionAdf}
                saveOverride={handleDescriptionSave}
              />
            }
          />
        )}
        {!isNewlyCreated && <BrAttachmentsSection request={request} />}
        {/* Order matches Story: Subtasks → Linked → Activity. */}
        {!isNewlyCreated && request?.request_key && resolvedId && (
          <SubtasksPanel
            storyKey={request.request_key}
            storyId={resolvedId}
            /* Subtask keys follow the BR's own prefix (MDT-### shared
               sequence, Q3) — derive from request_key, not a hardcoded
               fallback. */
            projectKey={request.request_key?.split('-')[0] || 'MDT'}
            onSubtaskClick={(key) => openDetail({ id: key })}
            parentIssueType="Business Request"
            parentSummary={request.title ?? ''}
            /* Catalyst-native: BR subtasks persist to catalyst_issues, never
               ph_issues — they are not Jira-synced (2026-06-15). */
            parentSource="catalyst"
            /* Picker scoped to the 5 BR subtask categories only (Q1). */
            childTypeOverride={[...BUSINESS_REQUEST_SUBTASK_TYPES]}
          />
        )}
        {!isNewlyCreated && resolvedId && request?.request_key && (
          <LinkedWorkItemsSection
            issueId={resolvedId}
            issueKey={request.request_key}
            projectKey={request.request_key.split('-')[0] || 'MDT'}
          />
        )}
        <BrActivitySection requestId={resolvedId ?? ''} isOpen={isOpen} />
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [request, updateField, resolvedId, isOpen, openDetail, isNewlyCreated, brKeyDetailsRows, descriptionAdf, handleDescriptionSave],
  );

  // ── Right rail — status pill in header, matching Story's pattern ──────────
  const rightContent = useMemo(
    () => (
      <CatalystSidebarDetails
        issue={mapBrToIssueLike(request) as any}
        itemId={request?.request_key ?? ''}
        onStatusChange={(s) => updateField('status', s)}
        onClose={onClose}
        onDelete={() => {}}
        statusPill={
          <CatalystStatusPill
            status={request?.process_step ?? null}
            onStatusChange={(st) => updateField('process_step', st)}
            issueType="Business Request"
          />
        }
        watchersChip={<WatchersChip issueKey={request?.request_key ?? null} />}
        improveDropdown={
          isClosed ? undefined : (
            <>
              <ImproveIssueDropdown
                issue={brAsIssueLike}
                onApplyDescription={handleApplyDescription}
              />
            </>
          )
        }
        hideDiscuss={isClosed}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [request, updateField, brAsIssueLike, handleApplyDescription, health, isClosed],
  );

  return (
    <>
      <CatalystViewBase
        isOpen={isOpen}
        onClose={onClose}
        panelMode={panelMode}
        hideSidebar={hideSidebar}
        fullPageMode={fullPageMode}
        itemType="Business Request"
        itemKey={request?.request_key ?? null}
        projectKey={projectKey || request?.project_key || 'MIM'}
        projectName="Product Hub"
        moreMenuItems={useMemo(
          () => [
            { label: 'Print', onClick: () => window.print() },
            { label: 'Clone', onClick: () => setShowCloneDialog(true) },
            { label: 'Move to product…', onClick: () => setShowMoveDialog(true) },
            { label: 'Delete request', onClick: () => setShowDeleteDialog(true), danger: true },
          ],
          // eslint-disable-next-line react-hooks/exhaustive-deps
          [],
        )}
        onTogglePanelMode={onTogglePanelMode}
        navigationItems={navigationItems}
        /* MUST match navigationItems[i].id — which is `request_key` (e.g. "MDT-740"),
           NOT `resolvedId` (the business_requests UUID). Mirror project Story:
           `currentItemId={itemId}`. Previously this passed resolvedId, so
           findIndex returned -1 and the prev/next chevrons were disabled. */
        currentItemId={itemId}
        onNavigate={onNavigate}
        leftContent={leftContent}
        rightContent={rightContent}
        isLoading={isLoading}
      />
      <ConfirmCloneDialog
        isOpen={showCloneDialog}
        onClose={() => setShowCloneDialog(false)}
        issueKey={request?.request_key}
        issueSummary={request?.title}
        onConfirm={handleCloneConfirm}
      />
      <ConfirmDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        issueKey={request?.request_key}
        issueSummary={request?.title}
        typeLabel="request"
        onConfirm={handleDeleteConfirm}
      />
      {showMoveDialog && (
        <BrMoveProductDialog
          isOpen={showMoveDialog}
          onClose={() => setShowMoveDialog(false)}
          requestKey={request?.request_key}
          requestTitle={request?.title}
          currentProductId={request?.product_id ?? null}
          onUpdate={updateField}
          onMoved={onClose}
        />
      )}
    </>
  );
}
