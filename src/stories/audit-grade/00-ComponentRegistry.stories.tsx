/**
 * Component Registry — master audit view for Catalyst Storybook.
 *
 * Shows every duplicate group with canonical → duplicates → sweep plan → restore.
 * Non-technical reviewers: read the risk badges and consumer counts.
 * Technical reviewers: follow the sweep plan and use restore commits if needed.
 */
import type { StoryObj } from '@storybook/react';
import React from 'react';
import { DuplicateCard } from '../fixtures/DuplicateCard';
import { ConsumerCard } from '../fixtures/ConsumerCard';

export default { title: 'Audit Grade/00 — Component Registry' };

export const StatusComponents: StoryObj = {
  name: '1. Status Display (16 duplicates)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Show issue status as a colored pill/lozenge"
        canonical={{
          name: 'CatalystStatusPill',
          source: 'src/components/catalyst-detail-views/shared/sections/CatalystStatusPill.tsx',
          consumers: 16,
          ads: '@atlaskit/lozenge',
          adsCloseness: 'close',
        }}
        duplicates={[
          { name: 'StatusLozenge', source: 'src/components/ui/StatusLozenge.tsx', consumers: 8, status: 'wrapper', adsCloseness: 'close', breakageRisk: 'Thin wrapper around @atlaskit/lozenge — safe, different API surface' },
          { name: 'JiraStatusLozenge', source: 'src/components/workflow/JiraStatusLozenge.tsx', consumers: 5, status: 'wrapper', adsCloseness: 'close', breakageRisk: 'Adds Jira workflow color mapping — wrapper is valid' },
          { name: 'WorkItemStatusLozenge', source: 'src/components/workflow/WorkItemStatusLozenge.tsx', consumers: 3, status: 'deprecated', adsCloseness: 'partial', breakageRisk: 'Legacy wrapper — consumers should migrate to CatalystStatusPill' },
          { name: 'StatusPill (shared)', source: 'src/components/shared/StatusPill.tsx', consumers: 4, status: 'replace', adsCloseness: 'partial', breakageRisk: 'Older implementation — props differ, migration needs field mapping' },
          { name: 'StatusPill (in-jira)', source: 'src/modules/in-jira/components/StatusPill.tsx', consumers: 2, status: 'replace', adsCloseness: 'divergent', breakageRisk: 'Module-specific clone — replace with canonical' },
          { name: 'StatusBadge (hierarchy)', source: 'src/components/hierarchy/StatusBadge.tsx', consumers: 2, status: 'replace', adsCloseness: 'none', breakageRisk: 'Hand-rolled div with inline styles — zero ADS usage' },
          { name: 'StatusBadge (defects)', source: 'src/components/defects/g25/StatusBadge.tsx', consumers: 1, status: 'replace', adsCloseness: 'none', breakageRisk: 'Isolated to defects module — hand-rolled' },
          { name: 'T10StatusBadge', source: 'src/modules/task10/components/landing/T10StatusBadge.tsx', consumers: 2, status: 'replace', adsCloseness: 'divergent', breakageRisk: 'Task10 module — different status set' },
          { name: 'OkrStatusPill', source: 'src/modules/okr-v2/components/shared/OkrStatusPill.tsx', consumers: 3, status: 'keep', adsCloseness: 'partial', breakageRisk: 'OKR-specific statuses (on-track/at-risk/off-track) — different domain' },
          { name: 'ConnectionStatusBadge', source: 'src/modules/workhub/admin/components/ConnectionStatusBadge.tsx', consumers: 1, status: 'keep', adsCloseness: 'partial', breakageRisk: 'Admin connection status — different domain' },
          { name: 'ThemeStatusBadge', source: 'src/components/workhub/shared/ThemeStatusBadge.tsx', consumers: 1, status: 'keep', adsCloseness: 'partial', breakageRisk: 'Theme-specific — different domain' },
          { name: 'TablePill', source: 'src/components/incidents/TablePill.tsx', consumers: 1, status: 'replace', adsCloseness: 'none', breakageRisk: 'Incident table — simple replacement' },
          { name: 'SourceBadge', source: 'src/components/producthub/shared/SourceBadge.tsx', consumers: 1, status: 'keep', adsCloseness: 'close', breakageRisk: 'Source type badge — different purpose' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/lozenge',
          docsUrl: 'https://atlassian.design/components/lozenge',
          guidance: 'Use Lozenge for status indicators. appearance prop maps to status categories: "success" for Done, "inprogress" for In Progress, "moved" for On Hold, "removed" for Blocked, "new" for New, "default" for To Do. Never use Badge for status — Badge is for numeric counts only. Never use isBold — Jira uses the non-bold variant. Text should be sentence case, not uppercase (ADS enforces via the component, but custom implementations often add text-transform: uppercase which is wrong).',
          tokens: [
            'color.background.success (Done)',
            'color.background.information (In Progress)',
            'color.background.warning (On Hold)',
            'color.background.danger (Blocked)',
            'color.background.neutral (To Do)',
          ],
          requiredProps: [
            'appearance — maps to status category',
            'children — status text in sentence case',
          ],
          antiPatterns: [
            'isBold={true} — Jira never uses bold lozenges for status',
            'text-transform: uppercase — ADS Lozenge renders uppercase internally, custom ones should NOT add it',
            'Raw hex background colors instead of appearance prop',
            'Using Badge component for status (Badge = numeric count, Lozenge = status category)',
            'Hand-rolled <span> with inline background color instead of Lozenge',
          ],
        }}
        sweepStatus="in-progress"
        restoreCommit="f63f2dd7b"
      />
    </div>
  ),
};

export const AvatarComponents: StoryObj = {
  name: '2. Avatar (12 duplicates)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Show user avatar with initials fallback"
        canonical={{
          name: 'CatalystAvatar',
          source: 'src/components/shared/CatalystAvatar.tsx',
          consumers: 22,
          ads: '@atlaskit/avatar',
          adsCloseness: 'close',
        }}
        duplicates={[
          { name: 'UserAvatar', source: 'src/components/shared/UserAvatar.tsx', consumers: 8, status: 'wrapper', adsCloseness: 'close', breakageRisk: 'Wraps CatalystAvatar — adds online indicator. Keep.' },
          { name: 'Avatar (ads)', source: 'src/components/ads/Avatar.tsx', consumers: 3, status: 'wrapper', adsCloseness: 'exact', breakageRisk: 'ADS wrapper — re-exports @atlaskit/avatar. Keep.' },
          { name: 'KanbanAvatar', source: 'src/components/kanban/KanbanAvatar.tsx', consumers: 4, status: 'replaced', adsCloseness: 'close', breakageRisk: 'Already delegates to CatalystAvatar (fixed this session)' },
          { name: 'CatalystAvatar (ui)', source: 'src/components/ui/catalyst/CatalystAvatar.tsx', consumers: 2, status: 'replace', adsCloseness: 'partial', breakageRisk: 'Shadcn-era duplicate — consumers should import from shared/' },
          { name: 'CatalystOwnerAvatar', source: 'src/components/ui/catalyst/CatalystOwnerAvatar.tsx', consumers: 1, status: 'replace', adsCloseness: 'divergent', breakageRisk: 'Adds "owner" badge — fold into CatalystAvatar as a prop' },
          { name: 'CapacityAvatar', source: 'src/components/capacity/CapacityAvatar.tsx', consumers: 2, status: 'replace', adsCloseness: 'divergent', breakageRisk: 'Capacity module — add capacity ring as CatalystAvatar variant' },
          { name: 'CatyAIAvatar', source: 'src/components/caty-ai-chat/CatyAIAvatar.tsx', consumers: 1, status: 'keep', adsCloseness: 'none', breakageRisk: 'AI persona avatar — SVG bot icon, not @atlaskit/avatar' },
          { name: 'ProjectAvatar', source: 'src/components/icons/ProjectAvatar.tsx', consumers: 3, status: 'keep', adsCloseness: 'partial', breakageRisk: 'Project icon, not user avatar — different domain' },
          { name: 'CurrentUserAvatar', source: 'src/components/project-hub/shell/CurrentUserAvatar.tsx', consumers: 1, status: 'replace', adsCloseness: 'divergent', breakageRisk: 'Shell header — should use CatalystAvatar + useAuth' },
          { name: 'AvatarChip', source: 'src/components/workhub/shared/AvatarChip.tsx', consumers: 2, status: 'deprecated', adsCloseness: 'none', breakageRisk: 'Hand-rolled div + img — zero ADS' },
          { name: 'Avatar (planner)', source: 'src/components/planner/task-modal/atoms/Avatar.tsx', consumers: 1, status: 'replace', adsCloseness: 'none', breakageRisk: 'Planner module duplicate — hand-rolled' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/avatar',
          docsUrl: 'https://atlassian.design/components/avatar',
          guidance: 'Use Avatar for user representation. Supports size (xsmall/small/medium/large/xlarge), src for image URL, name for tooltip + initials fallback, appearance (circle/square — circle for users, square for projects/spaces). Use AvatarGroup for stacked avatar lists (assignees, watchers). Never use raw <img> tags for user photos — Avatar handles loading states, error fallback to initials, and consistent sizing. CLAUDE.md bans external image URLs (Gravatar, Atlassian CDN) — use resolveAvatarUrl() which maps names to bundled local paths.',
          tokens: [
            'color.background.neutral (initials fallback bg)',
            'color.text.inverse (initials text)',
          ],
          requiredProps: [
            'name — always set for tooltip + initials fallback',
            'size — use consistent sizes per context (xsmall in tables, small in rails, medium in headers)',
          ],
          antiPatterns: [
            '<img src={profile.avatar_url}> — banned by CLAUDE.md, external URLs rejected',
            'Hand-rolled div with border-radius: 50% and background-color initials — use Avatar',
            'Different avatar sizes for the same context (e.g. 24px and 32px in the same table)',
            'Missing name prop — breaks tooltip and initials fallback',
          ],
        }}
        sweepStatus="in-progress"
        restoreCommit="f63f2dd7b"
      />
    </div>
  ),
};

export const DescriptionEditors: StoryObj = {
  name: '3. Description Editor (21 duplicates)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Edit rich text description for work items"
        canonical={{
          name: 'Description',
          source: 'src/components/catalyst-detail-views/shared/sections/Description/Description.tsx',
          consumers: 12,
          ads: '@atlaskit/editor-core + @atlaskit/renderer',
          adsCloseness: 'close',
        }}
        duplicates={[
          { name: 'CatalystDescriptionSection', source: 'src/components/catalyst-detail-views/shared/sections/CatalystDescriptionSection.tsx', consumers: 5, status: 'deprecated', adsCloseness: 'partial', breakageRisk: 'Legacy version — Description.tsx is the canonical replacement' },
          { name: 'CanonicalDescriptionField', source: 'src/components/shared/CanonicalDescriptionField/CanonicalDescriptionField.tsx', consumers: 3, status: 'deprecated', adsCloseness: 'partial', breakageRisk: 'Pre-Description.tsx attempt — different API' },
          { name: 'CatalystRichTextEditor', source: 'src/components/shared/rich-text/CatalystRichTextEditor.tsx', consumers: 2, status: 'wrapper', adsCloseness: 'close', breakageRisk: 'Generic rich text — not issue-specific. Keep for non-issue surfaces.' },
          { name: 'StoryRichTextEditor', source: 'src/components/shared/rich-text/StoryRichTextEditor.tsx', consumers: 1, status: 'replace', adsCloseness: 'partial' },
          { name: 'JiraDescriptionEditor', source: 'src/components/shared/jira-description-editor/JiraDescriptionEditor.tsx', consumers: 1, status: 'replace', adsCloseness: 'divergent' },
          { name: 'EpicDescriptionEditor', source: 'src/components/shared/rich-text/atlaskit/EpicDescriptionEditor.tsx', consumers: 1, status: 'replace', adsCloseness: 'close' },
          { name: 'DescriptionEditor (IssueDetailPane)', source: 'src/components/IssueDetailPane/DescriptionEditor.tsx', consumers: 1, status: 'replace', adsCloseness: 'divergent' },
          { name: 'DescriptionEditor (backlog)', source: 'src/components/backlog/DetailPanel/DescriptionEditor.tsx', consumers: 1, status: 'replace', adsCloseness: 'divergent' },
          { name: 'RichTextEditor (BR)', source: 'src/components/business-requests/RichTextEditor.tsx', consumers: 2, status: 'keep', adsCloseness: 'none', breakageRisk: 'BR create form — plain textarea, not ADF' },
          { name: 'RichTextEditor (industry)', source: 'src/components/industry/RichTextEditor.tsx', consumers: 1, status: 'replace', adsCloseness: 'none' },
          { name: 'IncidentDescription', source: 'src/components/incidents/IncidentDescription.tsx', consumers: 1, status: 'replace', adsCloseness: 'divergent' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/editor-core + @atlaskit/renderer',
          docsUrl: 'https://atlassian.design/components/editor',
          guidance: 'Use @atlaskit/editor-core for WRITE mode (editing descriptions) and @atlaskit/renderer for READ mode (displaying saved descriptions). Content format is ADF (Atlassian Document Format) — a JSON tree, not HTML. Never store description as raw HTML. The editor supports mentions, tables, code blocks, images, and slash commands natively. Use @atlaskit/adf-utils for ADF manipulation (converting, validating, traversing). For read-only display of plain text descriptions, a simple paragraph renderer is acceptable — the full @atlaskit/renderer is only needed for ADF content with formatting.',
          tokens: [
            'color.text (body text)',
            'color.text.subtle (placeholder)',
            'color.border (editor border)',
            'elevation.surface (editor background)',
          ],
          requiredProps: [
            'defaultValue — ADF JSON for initial content',
            'onChange — receives ADF JSON on edit',
            'appearance="full-page" for detail views, "comment" for inline',
          ],
          antiPatterns: [
            'Storing description as HTML string — use ADF JSON',
            'Building a custom toolbar when @atlaskit/editor-core provides one',
            'Using contentEditable div instead of the editor component',
            'Type-specific editors (EpicDescriptionEditor, StoryRichTextEditor) — one editor serves all types',
            'Missing @atlaskit/renderer for read mode — renders raw ADF as text',
          ],
        }}
        sweepStatus="not-started"
      />
    </div>
  ),
};

export const ConfirmDialogs: StoryObj = {
  name: '4. Confirm Dialogs (14 duplicates)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Confirmation dialog for destructive actions (delete, archive, clear)"
        canonical={{
          name: 'DangerConfirmModal',
          source: 'src/components/shared/DangerConfirmModal.tsx',
          consumers: 6,
          ads: '@atlaskit/modal-dialog',
          adsCloseness: 'close',
        }}
        duplicates={[
          { name: 'ConfirmDeleteDialog', source: 'src/components/catalyst-detail-views/shared/ConfirmDeleteDialog.tsx', consumers: 8, status: 'wrapper', adsCloseness: 'close', breakageRisk: 'Issue-specific delete — wraps DangerConfirmModal with issue context' },
          { name: 'ConfirmArchiveDialog', source: 'src/components/catalyst-detail-views/shared/ConfirmArchiveDialog.tsx', consumers: 4, status: 'wrapper', adsCloseness: 'close', breakageRisk: 'Archive variant — wraps DangerConfirmModal' },
          { name: 'ConfirmCloneDialog', source: 'src/components/catalyst-detail-views/shared/ConfirmCloneDialog.tsx', consumers: 4, status: 'wrapper', adsCloseness: 'close', breakageRisk: 'Clone variant — wraps DangerConfirmModal' },
          { name: 'DeleteConfirmDialog (budget)', source: 'src/components/budget/shared/DeleteConfirmDialog.tsx', consumers: 1, status: 'replace', adsCloseness: 'divergent' },
          { name: 'DeleteConfirmDialog (evidence)', source: 'src/components/evidence/gallery/DeleteConfirmDialog.tsx', consumers: 1, status: 'replace', adsCloseness: 'divergent' },
          { name: 'DeleteConfirmDialog (kanban)', source: 'src/components/kanban/overflow-menu/DeleteConfirmDialog.tsx', consumers: 1, status: 'replace', adsCloseness: 'divergent' },
          { name: 'ArchiveConfirmDialog (kanban)', source: 'src/components/kanban/overflow-menu/ArchiveConfirmDialog.tsx', consumers: 1, status: 'replace', adsCloseness: 'divergent' },
          { name: 'BulkDeleteDialog', source: 'src/components/bulk-operations/dialogs/BulkDeleteDialog.tsx', consumers: 2, status: 'keep', adsCloseness: 'partial', breakageRisk: 'Bulk operation — different UX (shows item count, progress)' },
          { name: 'ConfirmDialog (workhub)', source: 'src/components/workhub/shared/ConfirmDialog.tsx', consumers: 2, status: 'replace', adsCloseness: 'none' },
          { name: 'ClearConfirmDialog', source: 'src/components/evidence/annotation/ClearConfirmDialog.tsx', consumers: 1, status: 'replace', adsCloseness: 'none' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/modal-dialog',
          docsUrl: 'https://atlassian.design/components/modal-dialog',
          guidance: 'Use ModalDialog for all confirmation dialogs. Structure: ModalHeader (with ModalTitle) → ModalBody (description text) → ModalFooter (cancel + confirm buttons). For destructive actions, the confirm button uses appearance="danger". ADS provides ModalTransition for enter/exit animation. Never build a custom overlay + centered div — ModalDialog handles z-index, scroll lock, focus trap, and Escape to close. The "danger" pattern is: red confirm button + descriptive body explaining what will be deleted + the item name in bold.',
          tokens: [
            'elevation.surface.overlay (modal background)',
            'color.blanket (backdrop overlay)',
            'color.text.danger (danger button text)',
            'color.background.danger.bold (danger button bg)',
          ],
          requiredProps: [
            'onClose — always provide, never trap the user',
            'width="medium" for confirm dialogs (small for simple, large for forms)',
          ],
          antiPatterns: [
            'Custom overlay div with position:fixed + background:rgba — use ModalDialog',
            'Missing onClose / no Escape handler — WCAG violation',
            'Confirm button without appearance="danger" for destructive actions',
            'Per-module DeleteConfirmDialog clones instead of importing DangerConfirmModal',
            'Missing focus trap — user can Tab to elements behind the modal',
          ],
        }}
        sweepStatus="not-started"
      />
    </div>
  ),
};

export const EmptyStates: StoryObj = {
  name: '5. Empty States (9 duplicates)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Zero-data screen with illustration + message + CTA"
        canonical={{
          name: 'EmptyState (ads)',
          source: 'src/components/ads/EmptyState.tsx',
          consumers: 5,
          ads: '@atlaskit/empty-state',
          adsCloseness: 'exact',
        }}
        duplicates={[
          { name: 'EmptyState (ui)', source: 'src/components/ui/EmptyState.tsx', consumers: 8, status: 'deprecated', adsCloseness: 'none', breakageRisk: 'Shadcn-era — props differ from @atlaskit/empty-state' },
          { name: 'EmptyBoardState', source: 'src/components/empty-states/EmptyBoardState.tsx', consumers: 2, status: 'replace', adsCloseness: 'divergent' },
          { name: 'EmptyTimelineState', source: 'src/components/empty-states/EmptyTimelineState.tsx', consumers: 1, status: 'replace', adsCloseness: 'divergent' },
          { name: 'EmptyState (notifications)', source: 'src/components/notifications/EmptyState.tsx', consumers: 1, status: 'replace', adsCloseness: 'none' },
          { name: 'EmptyState (releasehub)', source: 'src/components/releasehub/EmptyState.tsx', consumers: 1, status: 'replace', adsCloseness: 'none' },
          { name: 'TestCaseEmptyState', source: 'src/components/releases/test-cases/TestCaseEmptyState.tsx', consumers: 1, status: 'replace', adsCloseness: 'none' },
          { name: 'AllWorkEmptyState', source: 'src/components/workhub/allwork/AllWorkEmptyState.tsx', consumers: 1, status: 'replace', adsCloseness: 'none' },
          { name: 'EmptyStates (ja)', source: 'src/components/ja/home/EmptyStates.tsx', consumers: 1, status: 'replace', adsCloseness: 'none' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/empty-state',
          docsUrl: 'https://atlassian.design/components/empty-state',
          guidance: 'Use EmptyState for all zero-data screens. Props: header (title text), description (body), primaryAction (button — the CTA), secondaryAction (link), imageUrl or renderImage (illustration). Every empty state MUST have a primaryAction CTA — "Create your first item" / "Import from Jira" / etc. A dead-end empty state with no action is a Cooper goal-directed P0 (CLAUDE.md). The ADS component handles responsive layout, consistent spacing, and accessible heading hierarchy.',
          tokens: [
            'color.text (header)',
            'color.text.subtle (description)',
            'elevation.surface (background)',
          ],
          requiredProps: [
            'header — always provide a title',
            'primaryAction — MUST have a CTA button (no dead ends)',
            'description — explain what the user should do',
          ],
          antiPatterns: [
            'Empty state with no CTA button — Cooper P0, dead end',
            'Hand-rolled centered div with "No data" text — use EmptyState',
            'Per-module empty state components (EmptyBoardState, AllWorkEmptyState) — one component, parameterised',
            'Missing illustration — ADS provides imageUrl slot for visual context',
          ],
        }}
        sweepStatus="not-started"
      />
    </div>
  ),
};

export const InlineEditComponents: StoryObj = {
  name: '6. Inline Edit (11 duplicates)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Click-to-edit field pattern (text → input → save)"
        canonical={{
          name: 'CatalystInlineEdit',
          source: 'src/components/ads/CatalystInlineEdit.tsx',
          consumers: 3,
          ads: '@atlaskit/inline-edit',
          adsCloseness: 'exact',
        }}
        duplicates={[
          { name: 'EditableAssignee', source: 'src/components/EditableAssignee/EditableAssignee.tsx', consumers: 8, status: 'keep', adsCloseness: 'partial', breakageRisk: 'Assignee-specific with avatar + search + team picker — different enough to keep' },
          { name: 'EditableFields', source: 'src/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields.tsx', consumers: 6, status: 'keep', adsCloseness: 'close', breakageRisk: 'Priority + Reporter + Assignee + Status — uses @atlaskit/select' },
          { name: 'InlineEdit (ads)', source: 'src/components/ads/InlineEdit.tsx', consumers: 2, status: 'wrapper', adsCloseness: 'exact' },
          { name: 'InlineEditable (tasks)', source: 'src/modules/tasks/components/TaskDetailDrawer/InlineEditable.tsx', consumers: 1, status: 'replace', adsCloseness: 'none' },
          { name: 'InlineEditTitle', source: 'src/components/hierarchy/InlineEditTitle.tsx', consumers: 1, status: 'replace', adsCloseness: 'divergent' },
          { name: 'InlineEditCell (incidents)', source: 'src/components/incidents/InlineEditCell.tsx', consumers: 1, status: 'replace', adsCloseness: 'divergent' },
          { name: 'InlineEditCell (users)', source: 'src/components/users/InlineEditCell.tsx', consumers: 1, status: 'replace', adsCloseness: 'divergent' },
          { name: 'InlineEdit (in-jira)', source: 'src/modules/in-jira/components/drawer/InlineEdit.tsx', consumers: 1, status: 'replace', adsCloseness: 'none' },
          { name: 'InlineEditors (project-hub)', source: 'src/components/project-hub/work-items/inline/InlineEditors.tsx', consumers: 1, status: 'replace', adsCloseness: 'divergent' },
          { name: 'T10EditableTitle', source: 'src/modules/task10/components/week/T10EditableTitle.tsx', consumers: 1, status: 'replace', adsCloseness: 'none' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/inline-edit',
          docsUrl: 'https://atlassian.design/components/inline-edit',
          guidance: 'Use InlineEdit for click-to-edit fields. The component manages the read → edit → confirm/cancel lifecycle with keyboard support (Enter to confirm, Escape to cancel). Props: defaultValue, readView (what to show in read mode), editView (the input), onConfirm. For field-specific editors (assignee picker, priority picker), compose InlineEdit with @atlaskit/select or @atlaskit/textfield as the editView — do NOT build a custom useState(isEditing) toggle. Jira uses InlineEdit for every right-rail field: assignee, reporter, priority, labels, fix versions.',
          tokens: [
            'color.border.focused (edit mode border)',
            'color.background.input (edit mode bg)',
            'space.100 (padding inside edit view)',
          ],
          requiredProps: [
            'defaultValue — initial value',
            'readView — what shows in read mode (clickable text)',
            'editView — the input/select that appears on click',
            'onConfirm — called with new value on Enter/check click',
          ],
          antiPatterns: [
            'useState(isEditing) + onClick toggle — use InlineEdit instead',
            'No cancel/Escape handling — InlineEdit handles it',
            'Per-module InlineEditCell clones instead of composing InlineEdit + fieldInput',
            'editView always visible (always-open select) — ADS pattern shows plain text in read mode',
            'Missing readView — InlineEdit without a read view renders nothing until clicked',
          ],
        }}
        sweepStatus="not-started"
      />
    </div>
  ),
};
