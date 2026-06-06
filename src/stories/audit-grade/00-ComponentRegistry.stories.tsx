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
        }}
        duplicates={[
          { name: 'CatalystDescriptionSection', source: 'src/components/catalyst-detail-views/shared/sections/CatalystDescriptionSection.tsx', consumers: 5, status: 'deprecated', breakageRisk: 'Legacy version — Description.tsx is the canonical replacement' },
          { name: 'CanonicalDescriptionField', source: 'src/components/shared/CanonicalDescriptionField/CanonicalDescriptionField.tsx', consumers: 3, status: 'deprecated', breakageRisk: 'Pre-Description.tsx attempt — different API' },
          { name: 'CatalystRichTextEditor', source: 'src/components/shared/rich-text/CatalystRichTextEditor.tsx', consumers: 2, status: 'wrapper', breakageRisk: 'Generic rich text — not issue-specific. Keep for non-issue surfaces.' },
          { name: 'StoryRichTextEditor', source: 'src/components/shared/rich-text/StoryRichTextEditor.tsx', consumers: 1, status: 'replace', breakageRisk: 'Story-specific — merge into Description.tsx' },
          { name: 'JiraDescriptionEditor', source: 'src/components/shared/jira-description-editor/JiraDescriptionEditor.tsx', consumers: 1, status: 'replace', breakageRisk: 'Jira-specific — merge into Description.tsx' },
          { name: 'EpicDescriptionEditor', source: 'src/components/shared/rich-text/atlaskit/EpicDescriptionEditor.tsx', consumers: 1, status: 'replace', breakageRisk: 'Epic-specific — merge into Description.tsx' },
          { name: 'DescriptionEditor (IssueDetailPane)', source: 'src/components/IssueDetailPane/DescriptionEditor.tsx', consumers: 1, status: 'replace', breakageRisk: 'Legacy pane — replace with Description.tsx' },
          { name: 'DescriptionEditor (backlog)', source: 'src/components/backlog/DetailPanel/DescriptionEditor.tsx', consumers: 1, status: 'replace', breakageRisk: 'Backlog drawer — replace with Description.tsx' },
          { name: 'RichTextEditor (BR)', source: 'src/components/business-requests/RichTextEditor.tsx', consumers: 2, status: 'keep', breakageRisk: 'BR create form — different UX (no ADF, simpler editor)' },
          { name: 'RichTextEditor (industry)', source: 'src/components/industry/RichTextEditor.tsx', consumers: 1, status: 'replace', breakageRisk: 'Industry module duplicate' },
          { name: 'IncidentDescription', source: 'src/components/incidents/IncidentDescription.tsx', consumers: 1, status: 'replace', breakageRisk: 'Incident module — replace with Description.tsx' },
        ]}
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
        }}
        duplicates={[
          { name: 'ConfirmDeleteDialog', source: 'src/components/catalyst-detail-views/shared/ConfirmDeleteDialog.tsx', consumers: 8, status: 'wrapper', breakageRisk: 'Issue-specific delete — wraps DangerConfirmModal with issue context' },
          { name: 'ConfirmArchiveDialog', source: 'src/components/catalyst-detail-views/shared/ConfirmArchiveDialog.tsx', consumers: 4, status: 'wrapper', breakageRisk: 'Archive variant — wraps DangerConfirmModal' },
          { name: 'ConfirmCloneDialog', source: 'src/components/catalyst-detail-views/shared/ConfirmCloneDialog.tsx', consumers: 4, status: 'wrapper', breakageRisk: 'Clone variant — wraps DangerConfirmModal' },
          { name: 'DeleteConfirmDialog (budget)', source: 'src/components/budget/shared/DeleteConfirmDialog.tsx', consumers: 1, status: 'replace', breakageRisk: 'Budget module — replace with DangerConfirmModal' },
          { name: 'DeleteConfirmDialog (evidence)', source: 'src/components/evidence/gallery/DeleteConfirmDialog.tsx', consumers: 1, status: 'replace', breakageRisk: 'Evidence module — replace with DangerConfirmModal' },
          { name: 'DeleteConfirmDialog (kanban)', source: 'src/components/kanban/overflow-menu/DeleteConfirmDialog.tsx', consumers: 1, status: 'replace', breakageRisk: 'Kanban module — replace with DangerConfirmModal' },
          { name: 'ArchiveConfirmDialog (kanban)', source: 'src/components/kanban/overflow-menu/ArchiveConfirmDialog.tsx', consumers: 1, status: 'replace', breakageRisk: 'Kanban module — replace with DangerConfirmModal + archive variant' },
          { name: 'BulkDeleteDialog', source: 'src/components/bulk-operations/dialogs/BulkDeleteDialog.tsx', consumers: 2, status: 'keep', breakageRisk: 'Bulk operation — different UX (shows item count, progress)' },
          { name: 'ConfirmDialog (workhub)', source: 'src/components/workhub/shared/ConfirmDialog.tsx', consumers: 2, status: 'replace', breakageRisk: 'WorkHub generic — replace with DangerConfirmModal' },
          { name: 'ClearConfirmDialog', source: 'src/components/evidence/annotation/ClearConfirmDialog.tsx', consumers: 1, status: 'replace', breakageRisk: 'Annotation clear — replace with DangerConfirmModal' },
        ]}
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
        }}
        duplicates={[
          { name: 'EmptyState (ui)', source: 'src/components/ui/EmptyState.tsx', consumers: 8, status: 'deprecated', breakageRisk: 'Shadcn-era — props differ from @atlaskit/empty-state. Migration needs prop mapping.' },
          { name: 'EmptyBoardState', source: 'src/components/empty-states/EmptyBoardState.tsx', consumers: 2, status: 'replace', breakageRisk: 'Board-specific illustration — fold into EmptyState as a variant' },
          { name: 'EmptyTimelineState', source: 'src/components/empty-states/EmptyTimelineState.tsx', consumers: 1, status: 'replace', breakageRisk: 'Timeline-specific — fold into EmptyState variant' },
          { name: 'EmptyState (notifications)', source: 'src/components/notifications/EmptyState.tsx', consumers: 1, status: 'replace' },
          { name: 'EmptyState (releasehub)', source: 'src/components/releasehub/EmptyState.tsx', consumers: 1, status: 'replace' },
          { name: 'TestCaseEmptyState', source: 'src/components/releases/test-cases/TestCaseEmptyState.tsx', consumers: 1, status: 'replace' },
          { name: 'AllWorkEmptyState', source: 'src/components/workhub/allwork/AllWorkEmptyState.tsx', consumers: 1, status: 'replace' },
          { name: 'EmptyStates (ja)', source: 'src/components/ja/home/EmptyStates.tsx', consumers: 1, status: 'replace' },
        ]}
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
        }}
        duplicates={[
          { name: 'EditableAssignee', source: 'src/components/EditableAssignee/EditableAssignee.tsx', consumers: 8, status: 'keep', breakageRisk: 'Assignee-specific with avatar + search + team picker — different enough to keep' },
          { name: 'EditableFields', source: 'src/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields.tsx', consumers: 6, status: 'keep', breakageRisk: 'Priority + Reporter + Assignee + Status — field-specific wrappers around @atlaskit/select' },
          { name: 'InlineEdit (ads)', source: 'src/components/ads/InlineEdit.tsx', consumers: 2, status: 'wrapper', breakageRisk: 'Re-export of @atlaskit/inline-edit' },
          { name: 'InlineEditable (tasks)', source: 'src/modules/tasks/components/TaskDetailDrawer/InlineEditable.tsx', consumers: 1, status: 'replace', breakageRisk: 'Tasks module — replace with CatalystInlineEdit' },
          { name: 'InlineEditTitle', source: 'src/components/hierarchy/InlineEditTitle.tsx', consumers: 1, status: 'replace' },
          { name: 'InlineEditCell (incidents)', source: 'src/components/incidents/InlineEditCell.tsx', consumers: 1, status: 'replace' },
          { name: 'InlineEditCell (users)', source: 'src/components/users/InlineEditCell.tsx', consumers: 1, status: 'replace' },
          { name: 'InlineEdit (in-jira)', source: 'src/modules/in-jira/components/drawer/InlineEdit.tsx', consumers: 1, status: 'replace' },
          { name: 'InlineEditors (project-hub)', source: 'src/components/project-hub/work-items/inline/InlineEditors.tsx', consumers: 1, status: 'replace' },
          { name: 'T10EditableTitle', source: 'src/modules/task10/components/week/T10EditableTitle.tsx', consumers: 1, status: 'replace' },
        ]}
        sweepStatus="not-started"
      />
    </div>
  ),
};
