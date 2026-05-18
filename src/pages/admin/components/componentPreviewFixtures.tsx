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
import { UserAvatar } from '@/components/shared/UserAvatar';

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

  'user-avatar': () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Size scale
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {(['xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge'] as const).map(size => (
            <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <UserAvatar name="Amadou Ndiaye" size={size} />
              <span style={{ fontSize: 11, color: 'var(--ds-text-subtle, #44546F)' }}>{size}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Fallback chain (name → deterministic colour + initials)
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {['Amadou Ndiaye', 'Vikram Indla', 'Sara Patel', 'Yazeed Daraz', 'Maria Rodriguez', 'Hiroshi Tanaka'].map(name => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <UserAvatar name={name} size="large" />
              <span style={{ fontSize: 11, color: 'var(--ds-text-subtle, #44546F)' }}>{name}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Country flag overlay
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { name: 'Amadou Ndiaye', country: 'Saudi Arabia' },
            { name: 'Vikram Indla', country: 'India' },
            { name: 'Sara Patel', country: 'UAE' },
            { name: 'Yazeed Daraz', country: 'Jordan' },
            { name: 'Maria Rodriguez', country: 'USA' },
          ].map(({ name, country }) => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <UserAvatar name={name} country={country} size="large" />
              <span style={{ fontSize: 11, color: 'var(--ds-text-subtle, #44546F)' }}>{country}</span>
            </div>
          ))}
        </div>
      </div>
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
