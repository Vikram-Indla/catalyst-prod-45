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

// ─── Top-50 expansion (added 2026-06-12, ranked by import count across src/) ──

export const ButtonsAndActions: StoryObj = {
  name: '7. Buttons & Actions (#1 — 635 imports)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Primary interactive control — click, submit, trigger action"
        canonical={{
          name: '@atlaskit/button',
          source: 'node_modules/@atlaskit/button',
          consumers: 635,
          ads: '@atlaskit/button',
          adsCloseness: 'exact',
        }}
        duplicates={[
          { name: 'ui/button (shadcn)', source: 'src/components/ui/button.tsx', consumers: 635, status: 'replace', adsCloseness: 'none', breakageRisk: 'P0 — shadcn Button. 635 consumers. Swap to @atlaskit/button. appearance="primary|default|subtle|danger|link|warning" maps to shadcn variant prop.' },
          { name: 'Button (ads)', source: 'src/components/ads/Button.tsx', consumers: 12, status: 'wrapper', adsCloseness: 'exact', breakageRisk: 'Thin re-export of @atlaskit/button — canonical wrapper for Catalyst. Prefer this.' },
          { name: 'IconButton (ads)', source: 'src/components/ads/IconButton.tsx', consumers: 8, status: 'wrapper', adsCloseness: 'exact', breakageRisk: 'Icon-only variant. Use for ⋯ menus, toolbar actions, close buttons.' },
          { name: 'LoadingButton', source: 'src/components/ads/LoadingButton.tsx', consumers: 5, status: 'wrapper', adsCloseness: 'close', breakageRisk: 'Wraps @atlaskit/button with isLoading prop. Keep for async CTAs.' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/button',
          docsUrl: 'https://atlassian.design/components/button',
          guidance: 'appearance prop: "primary" (blue fill, main CTA), "default" (grey fill, secondary), "subtle" (transparent, toolbar), "danger" (red, destructive), "link" (blue text, inline), "warning" (yellow, caution). Never use shadcn button in Catalyst — it bypasses ADS tokens and produces non-Jira visuals. For icon-only buttons use IconButton with label for a11y. Processing state: isLoading={true} + spinnerButtonLabel.',
          tokens: [
            'color.background.brand.bold (primary)',
            'color.background.neutral (default)',
            'color.background.danger.bold (danger)',
          ],
          requiredProps: ['children — always provide button label', 'onClick — or type="submit" inside a form'],
          antiPatterns: [
            'shadcn Button with variant="default|outline|ghost" — use @atlaskit/button with appearance',
            'Custom <button> with inline styles — no keyboard nav, no ADS tokens',
            'Rotating/spinning button wrapper (enterprise P0 — CLAUDE.md)',
            'Disabled buttons without aria-disabled and tooltip explanation',
          ],
        }}
        sweepStatus="not-started"
      />
    </div>
  ),
};

export const InputAndForm: StoryObj = {
  name: '8. Input & Form (#3/#10 — 295+106 imports)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Text input and multi-line text entry"
        canonical={{
          name: '@atlaskit/textfield + @atlaskit/textarea',
          source: 'node_modules/@atlaskit/textfield',
          consumers: 401,
          ads: '@atlaskit/textfield',
          adsCloseness: 'exact',
        }}
        duplicates={[
          { name: 'ui/input (shadcn)', source: 'src/components/ui/input.tsx', consumers: 295, status: 'replace', adsCloseness: 'none', breakageRisk: 'P0 — shadcn Input. 295 consumers. Swap to @atlaskit/textfield.' },
          { name: 'ui/textarea (shadcn)', source: 'src/components/ui/textarea.tsx', consumers: 106, status: 'replace', adsCloseness: 'none', breakageRisk: 'P0 — shadcn Textarea. 106 consumers. Swap to @atlaskit/textfield with isMultiline.' },
          { name: 'ui/label (shadcn)', source: 'src/components/ui/label.tsx', consumers: 187, status: 'replace', adsCloseness: 'none', breakageRisk: 'Label for form fields. Use FormLabel from @atlaskit/form or <label style={{}} for control.' },
          { name: 'Textfield (ads)', source: 'src/components/ads/Textfield.tsx', consumers: 18, status: 'wrapper', adsCloseness: 'exact', breakageRisk: 'ADS wrapper — canonical Catalyst text input. Use this.' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/textfield',
          docsUrl: 'https://atlassian.design/components/textfield',
          guidance: 'Use Textfield for single-line input, isMultiline for textarea. Wrap in @atlaskit/form Form + FormSection + FormFooter for full form pattern. Never use shadcn Input — it has no ADS focus ring, no validation state tokens. For search inputs use @atlaskit/textfield with elemBeforeInput={<SearchIcon />}.',
          tokens: [
            'color.background.input (idle)',
            'color.background.input.hovered (hover)',
            'color.background.input.pressed (focus)',
            'color.border.focused (focus ring)',
          ],
          requiredProps: ['placeholder — helps screen readers', 'label — via FormField for accessibility'],
          antiPatterns: [
            'shadcn Input — wrong tokens, wrong focus ring',
            '<input type="text"> without @atlaskit/textfield wrapper',
            'Missing form label — WCAG failure',
          ],
        }}
        sweepStatus="not-started"
      />
    </div>
  ),
};

export const SelectAndDropdown: StoryObj = {
  name: '9. Select & Dropdown (#4/#8 — 243+136 imports)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Option picker (single and multi) and contextual action menus"
        canonical={{
          name: '@atlaskit/select + @atlaskit/dropdown-menu',
          source: 'node_modules/@atlaskit/select',
          consumers: 379,
          ads: '@atlaskit/select',
          adsCloseness: 'exact',
        }}
        duplicates={[
          { name: 'ui/select (shadcn)', source: 'src/components/ui/select.tsx', consumers: 243, status: 'replace', adsCloseness: 'none', breakageRisk: 'P0 — shadcn Select. 243 consumers. Swap to @atlaskit/select.' },
          { name: 'ui/dropdown-menu (shadcn)', source: 'src/components/ui/dropdown-menu.tsx', consumers: 136, status: 'replace', adsCloseness: 'none', breakageRisk: 'P0 — shadcn DropdownMenu. 136 consumers. Swap to @atlaskit/dropdown-menu. WCAG violation if left as-is (no role=menu, no keyboard nav).' },
          { name: 'Select (ads)', source: 'src/components/ads/Select.tsx', consumers: 22, status: 'wrapper', adsCloseness: 'exact', breakageRisk: 'ADS wrapper — canonical. Use this.' },
          { name: 'FilterDropdown', source: 'src/components/shared/FilterDropdown/FilterDropdown.tsx', consumers: 11, status: 'keep', adsCloseness: 'close', breakageRisk: 'Filter bar dropdown — extends @atlaskit/dropdown-menu for multi-select filter UI. Domain-specific, keep.' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/select',
          docsUrl: 'https://atlassian.design/components/select',
          guidance: 'Use @atlaskit/select for option pickers (single/multi/async/creatable). Use @atlaskit/dropdown-menu for contextual action menus (DropdownMenu + DropdownItem + DropdownItemGroup). NEVER build hand-rolled menus — WCAG 2.1 AA keyboard failure (CLAUDE.md 2026-05-10). Dangerous items go in a separate DropdownItemGroup at the bottom with text-danger color wrapper.',
          tokens: [
            'color.background.input (control bg)',
            'color.border (control border)',
            'elevation.surface.overlay (menu bg)',
          ],
          requiredProps: ['options', 'onChange', 'placeholder'],
          antiPatterns: [
            'shadcn Select — no ADS tokens, no keyboard nav parity',
            'Hand-rolled div dropdown — WCAG P0 violation',
            'react-select direct import — use @atlaskit/select (wraps react-select with ADS tokens)',
          ],
        }}
        sweepStatus="not-started"
      />
    </div>
  ),
};

export const ModalAndOverlay: StoryObj = {
  name: '10. Modal & Overlay (#5/#12/#16/#21 — 221+93+54+33 imports)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Modal dialogs, popovers, alert dialogs, and drawers"
        canonical={{
          name: '@atlaskit/modal-dialog + @atlaskit/popup + @atlaskit/drawer',
          source: 'node_modules/@atlaskit/modal-dialog',
          consumers: 401,
          ads: '@atlaskit/modal-dialog',
          adsCloseness: 'exact',
        }}
        duplicates={[
          { name: 'ui/dialog (shadcn)', source: 'src/components/ui/dialog.tsx', consumers: 221, status: 'replace', adsCloseness: 'none', breakageRisk: 'P0 — shadcn Dialog. 221 consumers. Swap to @atlaskit/modal-dialog.' },
          { name: 'ui/popover (shadcn)', source: 'src/components/ui/popover.tsx', consumers: 93, status: 'replace', adsCloseness: 'none', breakageRisk: 'P0 — shadcn Popover. 93 consumers. Swap to @atlaskit/popup.' },
          { name: 'ui/alert-dialog (shadcn)', source: 'src/components/ui/alert-dialog.tsx', consumers: 54, status: 'replace', adsCloseness: 'none', breakageRisk: 'Destructive confirmation — use DangerConfirmModal (wraps @atlaskit/modal-dialog).' },
          { name: 'ui/sheet (shadcn)', source: 'src/components/ui/sheet.tsx', consumers: 33, status: 'replace', adsCloseness: 'none', breakageRisk: 'Side panel — use @atlaskit/drawer (side=right|left|bottom).' },
          { name: 'DangerConfirmModal', source: 'src/components/shared/DangerConfirmModal.tsx', consumers: 6, status: 'keep', adsCloseness: 'close', breakageRisk: 'Canonical destructive confirm — wraps @atlaskit/modal-dialog with danger appearance.' },
          { name: 'CatalystViewBase (modal mode)', source: 'src/components/catalyst-detail-views/CatalystViewBase.tsx', consumers: 9, status: 'keep', adsCloseness: 'close', breakageRisk: 'Work item detail sheet — fullPageMode and panelMode variants. Domain-specific, keep.' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/modal-dialog',
          docsUrl: 'https://atlassian.design/components/modal-dialog',
          guidance: 'Modal pattern: ModalTransition → ModalDialog → ModalHeader → ModalBody → ModalFooter. width="small|medium|large|x-large". Danger modals: confirm button appearance="danger". Never build custom overlay + centered div. Popover: @atlaskit/popup (content + trigger). Drawer: @atlaskit/drawer (side=right is Jira canonical). All overlays must handle Escape, focus trap, and scroll lock — ADS handles these.',
          tokens: [
            'elevation.surface.overlay (modal bg)',
            'color.blanket (scrim)',
          ],
          requiredProps: ['onClose — always provide'],
          antiPatterns: [
            'position:fixed + rgba background — use ModalDialog',
            'Missing Escape handler — WCAG violation',
            'shadcn Dialog/Sheet/Popover — wrong elevation tokens',
          ],
        }}
        sweepStatus="not-started"
      />
    </div>
  ),
};

export const CheckboxRadioToggle: StoryObj = {
  name: '11. Checkbox, Radio, Toggle (#9/#22 — 130+31 imports)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Binary selection controls — checkbox, radio group, toggle switch"
        canonical={{
          name: '@atlaskit/checkbox + @atlaskit/radio + @atlaskit/toggle',
          source: 'node_modules/@atlaskit/checkbox',
          consumers: 161,
          ads: '@atlaskit/checkbox',
          adsCloseness: 'exact',
        }}
        duplicates={[
          { name: 'ui/checkbox (shadcn)', source: 'src/components/ui/checkbox.tsx', consumers: 130, status: 'replace', adsCloseness: 'none', breakageRisk: 'P0 — shadcn Checkbox. Swap to @atlaskit/checkbox.' },
          { name: 'ui/radio-group (shadcn)', source: 'src/components/ui/radio-group.tsx', consumers: 17, status: 'replace', adsCloseness: 'none', breakageRisk: 'shadcn RadioGroup. Swap to @atlaskit/radio.' },
          { name: 'ui/switch (shadcn)', source: 'src/components/ui/switch.tsx', consumers: 31, status: 'replace', adsCloseness: 'none', breakageRisk: 'shadcn Switch. Swap to @atlaskit/toggle.' },
          { name: 'Checkbox (ads)', source: 'src/components/ads/Checkbox.tsx', consumers: 9, status: 'wrapper', adsCloseness: 'exact', breakageRisk: 'ADS wrapper — canonical.' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/checkbox',
          docsUrl: 'https://atlassian.design/components/checkbox',
          guidance: 'Use Checkbox for multi-select. Radio from @atlaskit/radio for single-select groups. Toggle from @atlaskit/toggle for on/off settings (not form data). All three handle keyboard, focus ring, and ARIA states via ADS tokens automatically.',
          tokens: ['color.background.selected.bold (checked state)', 'color.border (unchecked border)'],
          requiredProps: ['label — always for screen readers', 'isChecked + onChange for controlled use'],
          antiPatterns: [
            'shadcn Checkbox — wrong ADS tokens',
            'Custom <input type="checkbox"> — missing ADS focus ring',
            'Toggle for form data — use Radio or Checkbox instead',
          ],
        }}
        sweepStatus="not-started"
      />
    </div>
  ),
};

export const TabsAndNavigation: StoryObj = {
  name: '12. Tabs & Navigation (#16 — 52 imports)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Tab-based content switching and page navigation"
        canonical={{
          name: '@atlaskit/tabs',
          source: 'node_modules/@atlaskit/tabs',
          consumers: 52,
          ads: '@atlaskit/tabs',
          adsCloseness: 'exact',
        }}
        duplicates={[
          { name: 'ui/tabs (shadcn)', source: 'src/components/ui/tabs.tsx', consumers: 52, status: 'replace', adsCloseness: 'none', breakageRisk: 'P0 — shadcn Tabs. Swap to @atlaskit/tabs.' },
          { name: 'GlobalPageHeader', source: 'src/components/layout/GlobalPageHeader.tsx', consumers: 13, status: 'keep', adsCloseness: 'close', breakageRisk: 'Top nav with module tabs — canonical Catalyst app shell header.' },
          { name: 'CommandCenterHeader', source: 'src/components/shared/CommandCenterHeader.tsx', consumers: 10, status: 'keep', adsCloseness: 'close', breakageRisk: 'Inline search + breadcrumb header — canonical.' },
          { name: 'PageChrome', source: 'src/components/layout/PageChrome.tsx', consumers: 9, status: 'keep', adsCloseness: 'partial', breakageRisk: 'Catalyst page layout shell — nav rail + main content slot.' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/tabs',
          docsUrl: 'https://atlassian.design/components/tabs',
          guidance: 'Use Tabs for in-page content switching. Tabs wrap TabList (the header bar) + Tab items + TabPanel (content). controlled mode: selected={activeTab} onChange={setActiveTab}. Never build a custom tab bar with CSS active class — ADS Tabs handles keyboard arrow-key navigation, ARIA roles, and focus management.',
          tokens: ['color.border.selected (active tab indicator)', 'color.text.selected (active tab label)'],
          requiredProps: ['id per Tab (must be unique)', 'selected — controlled mode'],
          antiPatterns: [
            'shadcn Tabs — wrong tokens and wrong keyboard nav pattern',
            'Custom div + CSS active-class tab bar — no ARIA, no keyboard',
          ],
        }}
        sweepStatus="not-started"
      />
    </div>
  ),
};

export const FeedbackAndToast: StoryObj = {
  name: '13. Feedback & Toasts (#20/#28 — 38+23 imports)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="User feedback messages — success, error, warning, info notifications"
        canonical={{
          name: '@atlaskit/flag (via JiraTable/flags.tsx)',
          source: 'src/components/shared/JiraTable/flags.tsx',
          consumers: 11,
          ads: '@atlaskit/flag',
          adsCloseness: 'exact',
        }}
        duplicates={[
          { name: 'CatalystToast (ui)', source: 'src/components/ui/CatalystToast.tsx', consumers: 38, status: 'replace', adsCloseness: 'none', breakageRisk: 'P0 BANNED — uses sonner. Replace with showFlag() from JiraTable/flags.tsx or @atlaskit/flag directly.' },
          { name: 'ui/alert (shadcn)', source: 'src/components/ui/alert.tsx', consumers: 23, status: 'replace', adsCloseness: 'none', breakageRisk: 'shadcn Alert. Use @atlaskit/flag for transient notifications, @atlaskit/section-message for inline banners.' },
          { name: 'flags (JiraTable)', source: 'src/components/shared/JiraTable/flags.tsx', consumers: 11, status: 'keep', adsCloseness: 'exact', breakageRisk: 'Canonical Catalyst toast — wraps @atlaskit/flag + FlagsProvider. Use showFlag() helper.' },
          { name: 'sonner (toaster)', source: 'src/components/ui/sonner.tsx', consumers: 4, status: 'replace', adsCloseness: 'none', breakageRisk: 'P0 BANNED — non-ADS toast library. Remove all uses.' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/flag',
          docsUrl: 'https://atlassian.design/components/flag',
          guidance: 'Use @atlaskit/flag for transient user feedback (success, error, warning, info). Wrap app in FlagsProvider, then call showFlag({ title, description, appearance }). appearance: "success|error|warning|info|normal". For inline banners (persistent, in-page) use @atlaskit/section-message instead. Never use sonner or CatalystToast — CLAUDE.md bans both.',
          tokens: [
            'color.background.success.bold (success)',
            'color.background.danger.bold (error)',
            'color.background.warning.bold (warning)',
          ],
          requiredProps: ['title', 'appearance'],
          antiPatterns: [
            'sonner toast() — P0 BANNED',
            'CatalystToast — BANNED per CLAUDE.md',
            'Custom bottom-fixed div with setTimeout dismiss — use FlagsProvider',
          ],
        }}
        sweepStatus="not-started"
      />
    </div>
  ),
};

export const TableAndList: StoryObj = {
  name: '14. Table & List (#19 — 40 imports of shadcn table)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Tabular data display for work items, issues, requests"
        canonical={{
          name: 'JiraTable',
          source: 'src/components/shared/JiraTable/index.ts',
          consumers: 22,
          ads: '@atlaskit/dynamic-table (internal)',
          adsCloseness: 'close',
        }}
        duplicates={[
          { name: 'ui/table (shadcn)', source: 'src/components/ui/table.tsx', consumers: 40, status: 'replace', adsCloseness: 'none', breakageRisk: 'P0 BANNED for work items — use JiraTable. Admin config tables (no work items) may use ui/table as a LAST resort if JiraTable is overkill.' },
          { name: 'CatalystJiraListView (deleted)', source: 'DELETED', consumers: 0, status: 'deprecated', adsCloseness: 'divergent', breakageRisk: 'Was rebuilt from scratch in 2026-05-19 then deleted — JiraTable already had all 20+ columns. Never rebuild.' },
          { name: '@atlaskit/dynamic-table (direct)', source: 'node_modules/@atlaskit/dynamic-table', consumers: 3, status: 'replace', adsCloseness: 'close', breakageRisk: 'Direct use of dynamic-table for work item surfaces — BANNED. Use JiraTable which wraps it with Catalyst column schema, cell factories, inline editing, grouping, bulk select.' },
        ]}
        adsRecommendation={{
          package: 'JiraTable (src/components/shared/JiraTable/)',
          docsUrl: 'src/components/shared/JiraTable/types.ts',
          guidance: 'JiraTable is the ONLY canonical table for work items. Column schema uses cell factories (makeKeyCell, makeStatusEditCellAkPopup, makeAssigneeEditCell, makeParentCell, makeRowActionsCell). data prop (not rows). getRowId is required. Built-in: sorting, grouping, column picker, inline edit, bulk select, hierarchy indent, virtualization, drag handles. NEVER rebuild features JiraTable already has — CLAUDE.md 2026-05-19.',
          tokens: [
            'color.background.neutral.subtle.hovered (row hover)',
            'color.background.selected (selected row)',
            'color.text.subtle (header label)',
          ],
          requiredProps: ['data or groups', 'getRowId', 'columns with cell factory'],
          antiPatterns: [
            'shadcn Table for work items — P0 BANNED',
            'rows prop — wrong, use data',
            'columns with render instead of cell — wrong Column API',
            'Rebuilding JiraTable from scratch — session-wasting defect (CLAUDE.md 2026-05-19)',
          ],
        }}
        sweepStatus="not-started"
        restoreCommit="ccd8e2773"
      />
    </div>
  ),
};

export const PageHeaderAndLayout: StoryObj = {
  name: '15. Page Headers & Layout (#14/#41 — 69+13 imports)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Page-level chrome — header bar, breadcrumb, page title, layout shell"
        canonical={{
          name: 'CatalystPageHeader',
          source: 'src/components/shared/CatalystPageHeader.tsx',
          consumers: 69,
          ads: '@atlaskit/page-header',
          adsCloseness: 'close',
        }}
        duplicates={[
          { name: 'GlobalPageHeader', source: 'src/components/layout/GlobalPageHeader.tsx', consumers: 13, status: 'keep', adsCloseness: 'close', breakageRisk: 'Top-nav with logo + module tabs. Canonical app shell header — different domain from page content header.' },
          { name: 'PageChrome', source: 'src/components/layout/PageChrome.tsx', consumers: 9, status: 'keep', adsCloseness: 'close', breakageRisk: 'Layout shell: left nav rail + main content slot. Canonical page layout wrapper.' },
          { name: 'ProgramPageLayout', source: 'src/components/program/ProgramPageLayout.tsx', consumers: 9, status: 'keep', adsCloseness: 'partial', breakageRisk: 'Program hub layout wrapper — domain-specific.' },
          { name: 'CommandCenterHeader', source: 'src/components/shared/CommandCenterHeader.tsx', consumers: 10, status: 'keep', adsCloseness: 'close', breakageRisk: 'Work item page content header with breadcrumb + toolbar. Canonical, domain-specific.' },
          { name: 'ui/card (shadcn)', source: 'src/components/ui/card.tsx', consumers: 158, status: 'replace', adsCloseness: 'none', breakageRisk: 'P0 — shadcn Card used as layout container. Replace with ADS surface tokens + padding. No canonical Card component in ADS — use div with var(--ds-surface-overlay) + elevation.shadow.overlay.' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/page-header',
          docsUrl: 'https://atlassian.design/components/page-header',
          guidance: 'CatalystPageHeader wraps @atlaskit/page-header for Catalyst page titles. For layout shells use PageChrome (canonical app shell). Never use shadcn Card as a layout container — ADS provides surface tokens for elevation levels: var(--ds-surface) page, var(--ds-surface-overlay) modal/card, var(--ds-surface-sunken) recessed. Card containers should be plain divs with ADS elevation tokens + border-radius 3px (Jira standard).',
          tokens: ['elevation.surface.overlay (card bg)', 'elevation.shadow.overlay (card shadow)', 'space.300 (card padding = 24px)'],
          requiredProps: [],
          antiPatterns: [
            'shadcn Card — wrong tokens, adds rounded corners Jira does not use',
            'Custom page header div — missing @atlaskit/page-header a11y roles',
          ],
        }}
        sweepStatus="not-started"
      />
    </div>
  ),
};

export const WorkItemIcons: StoryObj = {
  name: '16. Work Item Type Icons (#34 — CANONICAL)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Work item type icon — Story, Epic, Feature, Task, Sub-task, QA Bug, Production Incident, Change Request, Business Request"
        canonical={{
          name: 'JiraIssueTypeIcon',
          source: 'src/lib/jira-issue-type-icons.tsx',
          consumers: 34,
          ads: 'Atlassian SVG icon registry (custom)',
          adsCloseness: 'partial',
        }}
        duplicates={[
          { name: 'WorkItemIcon (shim)', source: 'src/components/WorkItemIcon.tsx', consumers: 8, status: 'deprecated', adsCloseness: 'divergent', breakageRisk: 'Legacy shim — re-exports JiraIssueTypeIcon. Migrate all consumers to import directly from @/lib/jira-issue-type-icons.' },
          { name: 'Colored dot / issueTypeColor()', source: 'src/components/project-hub/shell/ProjectHubSidebar.tsx', consumers: 3, status: 'replace', adsCloseness: 'none', breakageRisk: 'P0 BANNED — coloured squares for type display. Non-discoverable color-recall. Replace with JiraIssueTypeIcon (CLAUDE.md 2026-05-09).' },
          { name: 'ITEM_TYPE_COLORS map', source: 'src/components/SidebarProjectNav.tsx', consumers: 2, status: 'replace', adsCloseness: 'none', breakageRisk: 'P0 BANNED — same dot pattern. Replaced 2026-05-09.' },
        ]}
        adsRecommendation={{
          package: 'JiraIssueTypeIcon (src/lib/jira-issue-type-icons.tsx)',
          docsUrl: '/admin/icons',
          guidance: 'ONLY allowed source for work item type icons. type prop must match EXACT registry string: "Story" | "Epic" | "Feature" | "Task" | "Sub-task" | "QA Bug" | "Production Incident" | "Change Request" | "Business Request". NEVER pass request_type subtype (feature/gap/integration) — those are field values, not work item types. Sizes: 14px compact rails, 16px table rows, 20px detail headers. NEVER use colored dots, squares, or color maps for type display.',
          tokens: [],
          requiredProps: ['type — exact registry string', 'size — px number'],
          antiPatterns: [
            'issueTypeColor() dot — P0 BANNED',
            'type={row.request_type} — maps wrong field to wrong icon',
            'Custom colored SVG for types not in registry — add to registry first',
          ],
        }}
        sweepStatus="completed"
      />
    </div>
  ),
};

export const PriorityAndSeverity: StoryObj = {
  name: '17. Priority & Severity (#23 — CANONICAL)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Work item priority indicator — Critical, High, Medium, Low"
        canonical={{
          name: 'PriorityIndicator',
          source: 'src/components/shared/PriorityIndicator.tsx',
          consumers: 31,
          ads: '@atlaskit/priority-level (internal pattern)',
          adsCloseness: 'close',
        }}
        duplicates={[
          { name: 'PriorityIcon', source: 'src/components/icons/PriorityIcon.tsx', consumers: 12, status: 'wrapper', adsCloseness: 'close', breakageRisk: 'Icon-only variant of PriorityIndicator. Keep for compact contexts (table cells).' },
          { name: 'EditablePriority', source: 'src/components/EditableFields/EditablePriority.tsx', consumers: 9, status: 'keep', adsCloseness: 'close', breakageRisk: 'Right-rail inline-edit version — canonical editable priority. Keep.' },
          { name: 'makePriorityEditCell', source: 'src/components/shared/JiraTable/editors.tsx', consumers: 6, status: 'keep', adsCloseness: 'close', breakageRisk: 'JiraTable cell factory for editable priority — canonical.' },
        ]}
        adsRecommendation={{
          package: 'PriorityIndicator (src/components/shared/PriorityIndicator.tsx)',
          docsUrl: '/project-hub/BAU/allwork',
          guidance: 'Use PriorityIndicator for read-only display. Use EditablePriority for click-to-edit in detail view right rail. Use makePriorityEditCell for JiraTable inline edit. When priority is null/unknown, render nothing — never fall back to "Medium" (zero-assumption code rule, CLAUDE.md).',
          tokens: ['color.icon.danger (Critical/High)', 'color.icon.warning (Medium)', 'color.icon.subtle (Low)'],
          requiredProps: ['priority — null-safe: undefined/null → no icon'],
          antiPatterns: [
            '|| "Medium" fallback — BANNED (zero-assumption code, CLAUDE.md)',
            'Custom colored bars/dots for priority — use PriorityIndicator',
          ],
        }}
        sweepStatus="completed"
      />
    </div>
  ),
};

export const DateAndTimePicker: StoryObj = {
  name: '18. Date & Time Pickers (#27/#39 — 24+13 imports)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Date selection — due dates, sprint dates, timeline ranges"
        canonical={{
          name: 'CatalystDueDateField',
          source: 'src/components/shared/CatalystDueDateField.tsx',
          consumers: 13,
          ads: '@atlaskit/datetime-picker',
          adsCloseness: 'close',
        }}
        duplicates={[
          { name: 'ui/calendar (shadcn)', source: 'src/components/ui/calendar.tsx', consumers: 24, status: 'replace', adsCloseness: 'none', breakageRisk: 'shadcn Calendar. Swap to @atlaskit/datetime-picker.' },
          { name: 'ui/catalyst-date-picker', source: 'src/components/ui/catalyst-date-picker.tsx', consumers: 13, status: 'replace', adsCloseness: 'partial', breakageRisk: 'Catalyst wrapper around shadcn Calendar. Migrate to CatalystDueDateField or @atlaskit/datetime-picker.' },
          { name: 'makeDateEditCell', source: 'src/components/shared/JiraTable/editors.tsx', consumers: 8, status: 'keep', adsCloseness: 'close', breakageRisk: 'JiraTable cell factory for inline date edit — canonical.' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/datetime-picker',
          docsUrl: 'https://atlassian.design/components/datetime-picker',
          guidance: 'Use @atlaskit/datetime-picker for date inputs. DatePicker for date-only, DateTimePicker for date+time. In right rail: CatalystDueDateField (click-to-edit, inline). In tables: makeDateEditCell. Never use <input type="date"> — no ADS tokens, no cross-browser consistency.',
          tokens: ['color.background.input', 'color.border.focused', 'color.text'],
          requiredProps: ['value', 'onChange'],
          antiPatterns: [
            '<input type="date"> — no ADS tokens',
            'shadcn Calendar — wrong tokens',
            'react-datepicker — non-ADS dependency',
          ],
        }}
        sweepStatus="not-started"
      />
    </div>
  ),
};

export const ScrollAndProgress: StoryObj = {
  name: '19. Scroll, Progress, Skeleton (#11/#17/#13 — 99+50+92 imports)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Loading indicators, skeleton screens, and scrollable containers"
        canonical={{
          name: '@atlaskit/spinner + custom skeleton patterns',
          source: 'node_modules/@atlaskit/spinner',
          consumers: 50,
          ads: '@atlaskit/spinner',
          adsCloseness: 'exact',
        }}
        duplicates={[
          { name: 'ui/scroll-area (shadcn)', source: 'src/components/ui/scroll-area.tsx', consumers: 99, status: 'replace', adsCloseness: 'none', breakageRisk: 'shadcn ScrollArea. Use native CSS overflow:auto with ADS scrollbar tokens, or JiraTable enableVirtualization for large lists.' },
          { name: 'ui/skeleton (shadcn)', source: 'src/components/ui/skeleton.tsx', consumers: 92, status: 'replace', adsCloseness: 'partial', breakageRisk: 'shadcn Skeleton. Replace with @atlaskit/skeleton or JiraTable isLoading (built-in shimmer rows).' },
          { name: 'ui/progress (shadcn)', source: 'src/components/ui/progress.tsx', consumers: 50, status: 'replace', adsCloseness: 'none', breakageRisk: 'shadcn Progress. Use @atlaskit/progress-bar for determinate progress, @atlaskit/spinner for indeterminate.' },
          { name: 'ui/slider (shadcn)', source: 'src/components/ui/slider.tsx', consumers: 10, status: 'replace', adsCloseness: 'none', breakageRisk: 'shadcn Slider. Use @atlaskit/range for range input.' },
        ]}
        adsRecommendation={{
          package: '@atlaskit/spinner',
          docsUrl: 'https://atlassian.design/components/spinner',
          guidance: 'For button loading: isLoading prop on @atlaskit/button (shows Spinner automatically). For page-level: Spinner size="large" centered. For list loading: JiraTable isLoading={true} (shimmer rows). For indeterminate inline: Spinner size="small" appearance="invert" inside buttons. NEVER use pulsing glow or custom SVG spinners — enterprise P0 (CLAUDE.md). Skeleton: @atlaskit/skeleton for known layout, JiraTable isLoading for table-specific.',
          tokens: ['color.background.neutral (skeleton bg)', 'color.background.neutral.subtle.hovered (shimmer)'],
          requiredProps: ['size for Spinner (xsmall/small/medium/large)'],
          antiPatterns: [
            'Custom CSS animation spinner — non-ADS',
            'Pulsing glow / neon effects — enterprise P0 ban',
            'shadcn Skeleton with wrong animation token',
          ],
        }}
        sweepStatus="not-started"
      />
    </div>
  ),
};

export const AdminSecurity: StoryObj = {
  name: '20. Admin Security Gate (#24 — CANONICAL)',
  render: () => (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <DuplicateCard
        purpose="Route-level guard — prevents non-admin users from accessing /admin/* pages"
        canonical={{
          name: 'AdminGuard',
          source: 'src/components/admin/AdminGuard.tsx',
          consumers: 28,
          ads: 'Custom (wraps useUserRole hook)',
          adsCloseness: 'partial',
        }}
        duplicates={[
          { name: 'AdminGuard (admin dir)', source: 'src/components/admin/AdminGuard.tsx', consumers: 28, status: 'keep', adsCloseness: 'partial', breakageRisk: 'Every /admin/* page root JSX MUST be wrapped in AdminGuard. Enforced by admin-guard-coverage.test.ts.' },
          { name: 'useUserRole', source: 'src/hooks/useUserRole.ts', consumers: 14, status: 'keep', adsCloseness: 'none', breakageRisk: 'Used INSIDE AdminGuard. Do not use directly in page components — use AdminGuard wrapper instead.' },
        ]}
        adsRecommendation={{
          package: 'AdminGuard (custom)',
          docsUrl: 'src/components/admin/AdminGuard.tsx',
          guidance: 'Every page under /admin/* MUST wrap its root JSX in <AdminGuard>. AdminGuard checks user_roles.role = "admin" from useUserRole. Never check roles inline in page components. NEVER gate by auth.jwt() ->> "role" — JWT has no role in Catalyst (RLS lesson 2026-05-19). Use EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = "admin"::app_role) in SQL.',
          tokens: [],
          requiredProps: ['children'],
          antiPatterns: [
            'Inline role check in page JSX instead of AdminGuard',
            'auth.jwt() ->> "role" in RLS — JWT has no role, always false',
            'Missing AdminGuard on new /admin/* page — CI test will catch',
          ],
        }}
        sweepStatus="completed"
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
