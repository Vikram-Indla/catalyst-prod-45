/**
 * componentPreviewFixtures.tsx — Preview renderers for /admin/components.
 *
 * Authored: 2026-05-17 (preflight Step 8).
 *
 * Each entry maps a registry id to a self-contained render function. The
 * render function returns a ReactNode that can mount without app-level
 * providers (no QueryClientProvider, no AuthProvider, no Router).
 *
 * v1 scope:
 *   - Atoms with isolated props (CatalystStatusPill, JiraIssueTypeIcon).
 *   - Lozenge variants (showcase appearance set).
 *   - Simple molecules that don't fetch (CategoryBadge-style primitives).
 *
 * v2 candidates (NOT in v1):
 *   - JiraTable (needs rows + QueryClient + DnD context).
 *   - CatalystSidebarDetails / CatalystKeyDetails (need detail-view contexts).
 *   - WatchersChip (needs supabase mock).
 *   - rich-text editor (heavy bundle, deferred to Storybook embed in v2).
 *
 * When a registry id has no fixture, ComponentLivePreview shows a
 * "Preview deferred to v2" placeholder with the reason taken from
 * DEFERRED_REASONS below.
 */
import type { ReactNode } from 'react';
import Lozenge from '@atlaskit/lozenge';

import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { CatalystStatusPill } from '@/components/catalyst-detail-views/shared/sections/CatalystStatusPill';

export type PreviewFixture = () => ReactNode;

export const previewFixtures: Record<string, PreviewFixture> = {
  'catalyst-status-pill': () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <CatalystStatusPill status="To Do" statusCategory="new" />
      <CatalystStatusPill status="In Progress" statusCategory="indeterminate" />
      <CatalystStatusPill status="Done" statusCategory="done" />
    </div>
  ),

  'jira-issue-type-icon': () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      {['Story', 'Task', 'Bug', 'Epic', 'Feature', 'Production Incident', 'Change Request'].map(
        type => (
          <div
            key={type}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
          >
            <JiraIssueTypeIcon type={type} size={16} />
            <span style={{ fontSize: 11 }}>{type}</span>
          </div>
        ),
      )}
    </div>
  ),
};

/**
 * Per-id explanation for why no fixture ships in v1. Surfaced in the
 * "Preview deferred to v2" placeholder.
 */
export const DEFERRED_REASONS: Record<string, string> = {
  'jira-table': 'JiraTable needs rows, columns, QueryClient, and DnD context. v2 will wrap with a sandbox provider.',
  'canonical-description-field': 'Needs CanonicalEditor context + supabase mock. v2 candidate.',
  'rich-text-editor': 'Heavy Atlaskit Editor bundle. v2 will embed via Storybook iframe.',
  'dynamic-table': 'Deprecated — migrate to JiraTable; no preview planned.',
  'catalyst-view-base': 'Detail view shell — needs CatalystDetailRouter context. v2.',
  'catalyst-key-details': 'Needs an issue object + permission gates. v2.',
  'catalyst-sidebar-details': 'Right rail — needs full issue + screen scheme. v2.',
  'watchers-chip': 'Needs supabase watchers query + auth context. v2.',
};

export function hasFixture(id: string): boolean {
  return id in previewFixtures;
}

export function getDeferredReason(id: string): string | undefined {
  return DEFERRED_REASONS[id];
}
