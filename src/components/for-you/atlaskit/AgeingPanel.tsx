/**
 * AgeingPanel — For You / Ageing tab.
 *
 * Archiving system (2026-06-03):
 *   - 90+ days & 60–90 days: auto-archived, collapsed by default, click shows inline "archived" message
 *   - 30–60 days: active with countdown timer (days/hours until auto-archive at 60d)
 *   - "Auto-archiving soon" section: items within 7 days of 60-day threshold
 *   - Search bar to filter items on this page
 *   - Avatars show REPORTER (not assignee) per Vikram directive
 *   - No emoji lock icons — uses ADS tokens only
 */
import React, { useMemo, useState, useCallback } from 'react';
import { token } from '@atlaskit/tokens';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/new';
import { useAgeingItems, type AgeingItem } from '@/hooks/useAgeingItems';
import ForYouRow from './ForYouRow';
import { ForYouEmptyState } from './helpers';
import { text } from '@/lib/typography';
import { resolveAvatarUrl } from '@/lib/avatars';
import { useJiraBaseUrl } from '@/hooks/useJiraBaseUrl';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { archiveIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { WorkItem, HubType, WorkMode, WorkGroup } from '@/hooks/useForYouData';
import { CatyAgeingTriage } from './CatyAgeingTriage';

type AgeBracket = 'needsAttention' | 'coolingDown' | 'archivingSoon' | 'ninetyPlus' | 'sixtyNinety' | 'thirtySixty';
const BRACKET_ORDER: AgeBracket[] = ['needsAttention', 'coolingDown', 'archivingSoon', 'thirtySixty', 'sixtyNinety', 'ninetyPlus'];
const STALE_DAYS = 21;
const ARCHIVE_THRESHOLD_DAYS = 60;

function daysSinceUpdate(updatedAt: string | null): number {
  if (!updatedAt) return 999;
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
}

function bracketFor(daysOpen: number, isArchived: boolean, jiraUpdatedAt?: string | null): AgeBracket | null {
  if (isArchived && daysOpen >= 90) return 'ninetyPlus';
  if (isArchived && daysOpen >= 60) return 'sixtyNinety';
  if (!isArchived && daysOpen >= 53 && daysOpen < 60) return 'archivingSoon';
  if (!isArchived && daysOpen >= 30 && daysOpen < 60) return 'thirtySixty';
  if (!isArchived && daysOpen >= 60) return 'ninetyPlus';
  const updateAge = daysSinceUpdate(jiraUpdatedAt ?? null);
  if (!isArchived && daysOpen < 30 && updateAge <= 7) return 'needsAttention';
  if (!isArchived && daysOpen < 30 && updateAge <= 14) return 'coolingDown';
  return null;
}

function isStale(a: AgeingItem): boolean {
  if (!a.jira_updated_at) return true;
  return (Date.now() - new Date(a.jira_updated_at).getTime()) / 86_400_000 >= STALE_DAYS;
}

function formatRelative(dateStr: string): string {
  if (!dateStr) return '—';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function initials(name: string): string {
  return (name || '').split(/\s+/).map(p => p[0]).filter(Boolean).join('').toUpperCase().slice(0, 2);
}

function countdownText(daysOpen: number, createdAt?: string): string {
  if (!createdAt) {
    const daysLeft = ARCHIVE_THRESHOLD_DAYS - daysOpen;
    if (daysLeft <= 0) return 'Archiving today';
    return `Auto-archives in ${Math.floor(daysLeft)}d`;
  }
  const archiveMs = new Date(createdAt).getTime() + ARCHIVE_THRESHOLD_DAYS * 86_400_000;
  const remainMs = archiveMs - Date.now();
  if (remainMs <= 0) return 'Archiving today';
  const totalHours = Math.floor(remainMs / 3_600_000);
  const d = Math.floor(totalHours / 24);
  const h = totalHours % 24;
  if (d === 0) return `Auto-archives in ${h}h`;
  return `Auto-archives in ${d}d ${h}h`;
}

function formatDate(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ageingToWorkItem(a: AgeingItem, jiraBaseUrl: string | null): WorkItem {
  const reporterName = a.reporter_display_name || 'Unknown';
  return {
    id: a.issue_key,
    key: a.issue_key,
    summary: a.summary,
    phIssueId: a.id,
    mode: 'DEL' as WorkMode,
    level: a.issue_type,
    project: a.project_name || a.project_key || '',
    projectKey: a.project_key || '',
    hub: 'ProjectHub' as HubType,
    hubLabel: 'Project',
    issueType: a.issue_type,
    status: a.status || 'To Do',
    priority: a.priority || 'Medium',
    priorityLevel: 2,
    parentKey: a.parent_key || undefined,
    parentSummary: a.parent_summary || undefined,
    updatedAt: a.jira_updated_at ? formatRelative(a.jira_updated_at) : '—',
    createdAt: a.jira_created_at || '—',
    jiraUrl: a.issue_key && jiraBaseUrl ? `${jiraBaseUrl}/browse/${a.issue_key}` : undefined,
    assignee: {
      id: a.reporter_account_id || 'none',
      name: reporterName,
      initials: initials(reporterName),
      avatarColor: '#6B7280',
      avatarUrl: resolveAvatarUrl(reporterName) || undefined,
    },
    reporter: a.reporter_display_name || undefined,
    group: 'EARLIER' as WorkGroup,
    starred: false,
  };
}

// ─── Section heading — ADS accent bar per severity tier ──────────────────────
// Left border color uses ADS border-intent tokens to visually separate tiers.
// fontWeight 653 matches Jira section headers (CLAUDE.md 2026-05-12 re-probe).
const BRACKET_ACCENT: Record<AgeBracket, string> = {
  needsAttention: token('color.border.success', '#22A06B'),
  coolingDown:    token('color.border.warning', '#CF9F02'),
  archivingSoon:  token('color.border.warning', '#FF991F'),
  thirtySixty:    token('color.border.information', '#1D7AFC'),
  sixtyNinety:    token('color.border.bold', '#758195'),
  ninetyPlus:     token('color.border.danger', '#E5493A'),
};

function SectionHeading({ label, count, collapsed, onToggle, isArchived, bracket }: {
  label: string; count: number; collapsed: boolean; onToggle: () => void;
  isArchived?: boolean; bracket: AgeBracket;
}) {
  const accent = BRACKET_ACCENT[bracket];
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: token('space.100', '8px'),
        padding: `${token('space.100', '8px')} ${token('space.200', '16px')}`,
        background: token('color.background.neutral', '#F1F2F4'),
        border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
        borderRadius: 0,
        borderLeft: `3px solid ${accent}`,
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}
    >
      <span style={{
        transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
        transition: 'transform 150ms', display: 'inline-flex', fontSize: 12,
        color: token('color.icon.subtle', '#6B778C'),
      }}>
        ▾
      </span>
      <span style={{
        fontSize: 14, fontWeight: 653, lineHeight: '20px',
        color: token('color.text', '#292A2E'),
      }}>
        {label}
      </span>
      {isArchived && (
        <Lozenge appearance="default">archived</Lozenge>
      )}
      <span style={{
        fontSize: 12, fontWeight: 400, lineHeight: '16px',
        color: token('color.text.subtlest', '#6B778C'),
        background: token('color.background.neutral', '#F1F2F4'),
        padding: `0 ${token('space.100', '8px')}`, borderRadius: 999,
      }}>
        {count}
      </span>
    </button>
  );
}

// ─── Archived row (compact, read-only — NO emoji lock icons) ─────────────────
function ArchivedRow({ item }: {
  item: AgeingItem;
}) {
  const [showMessage, setShowMessage] = useState(false);

  return (
    <>
      <div
        onClick={() => setShowMessage(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: token('space.100', '8px'),
          padding: `${token('space.100', '8px')} ${token('space.200', '16px')}`,
          cursor: 'pointer', width: '100%',
          /* opacity removed — use color tokens for dimming, not blanket opacity (ADS) */
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        }}
      >
        <JiraIssueTypeIcon type={item.issue_type} size={16} />
        <span style={{
          fontFamily: 'var(--ds-font-family-monospace, "Charlie Code", ui-monospace, monospace)', fontSize: 12, fontWeight: 500,
          color: token('color.text.subtle', '#505258'),
          flexShrink: 0, minWidth: 72,
        }}>
          {item.issue_key}
        </span>
        <span style={{
          fontSize: 14, color: token('color.text', '#292A2E'),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, minWidth: 0,
        }}>
          {item.summary}
        </span>
        <Lozenge appearance="default">{item.status}</Lozenge>
        <span style={{
          fontSize: 11, color: token('color.text.subtlest', '#6B778C'),
          flexShrink: 0, minWidth: 40, textAlign: 'right',
        }}>
          {item.days_open}d
        </span>
        {item.archived_at && (
          <span style={{
            fontSize: 11, color: token('color.text.subtlest', '#6B778C'),
            flexShrink: 0,
          }}>
            {formatDate(item.archived_at)}
          </span>
        )}
      </div>

      {/* Archived item inline message — NOT a detail modal */}
      {showMessage && (
        <div
          onClick={() => setShowMessage(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(9,30,66,0.54)', zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: token('elevation.surface.overlay', '#FFFFFF'),
              borderRadius: 8, padding: token('space.300', '24px'),
              maxWidth: 480, width: '90%',
              boxShadow: token('elevation.shadow.overlay', '0 8px 16px rgba(9,30,66,0.25)'),
            }}
          >
            <h2 style={{
              margin: 0, fontSize: 16, fontWeight: 653,
              color: token('color.text', '#292A2E'),
              marginBottom: token('space.200', '16px'),
            }}>
              This item is archived
            </h2>
            <p style={{
              margin: 0, fontSize: 14, fontWeight: 500,
              color: token('color.text', '#292A2E'),
              marginBottom: token('space.050', '4px'),
            }}>
              {item.issue_key} — {item.summary}
            </p>
            <p style={{
              margin: 0, fontSize: 13,
              color: token('color.text.subtle', '#505258'),
              marginBottom: token('space.200', '16px'),
            }}>
              This item is archived and read-only. To unarchive, go to the Archive manager.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: token('space.100', '8px') }}>
              <Button appearance="primary" onClick={() => { setShowMessage(false); navigate('/for-you/archives'); }}>
                Go to Archive manager
              </Button>
              <Button appearance="subtle" onClick={() => setShowMessage(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Active row with countdown timer ────────────────────────────────────────
function ActiveAgeingRow({ item, onSelect, isArchivingSoon }: {
  item: WorkItem & { daysOpen: number; jiraCreatedAt?: string };
  onSelect: (item: WorkItem) => void;
  isArchivingSoon?: boolean;
}) {
  return (
    <div style={{
      borderLeft: isArchivingSoon
        ? `3px solid ${token('color.border.warning', '#FF991F')}`
        : undefined,
    }}>
      <ForYouRow item={item} onSelect={onSelect} />
      <div style={{
        paddingLeft: token('space.600', '48px'),
        paddingBottom: token('space.100', '8px'),
        display: 'flex', alignItems: 'center', gap: token('space.100', '8px'),
      }}>
        <span style={{
          fontSize: 11, fontWeight: 500,
          color: item.daysOpen >= 53
            ? token('color.text.warning', '#FF991F')
            : token('color.text.subtlest', '#6B778C'),
        }}>
          {countdownText(item.daysOpen, item.jiraCreatedAt)}
        </span>
        <span style={{ fontSize: 11, color: token('color.text.subtlest', '#6B778C') }}>
          · Open {item.daysOpen}d
        </span>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export interface AgeingPanelViewProps {
  ageingItems: AgeingItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  jiraBaseUrl: string | null;
  isAdmin: boolean;
  onUnarchive: (issueKey: string) => void;
  onNavigateArchives: () => void;
  onOpenDetail: (item: WorkItem) => void;
  onOpenDetailByKey?: (issueKey: string) => void;
}

export function AgeingPanelView({
  ageingItems, isLoading, isError, jiraBaseUrl, isAdmin,
  onUnarchive, onNavigateArchives, onOpenDetail, onOpenDetailByKey,
}: AgeingPanelViewProps) {
  const [search, setSearch] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<AgeBracket>>(
    new Set(['ninetyPlus', 'sixtyNinety'])
  );

  const toggleSection = useCallback((bracket: AgeBracket) => {
    setCollapsedSections(prev => {
      const n = new Set(prev);
      if (n.has(bracket)) n.delete(bracket); else n.add(bracket);
      return n;
    });
  }, []);

  const grouped = useMemo(() => {
    if (!ageingItems) return [];
    const staleItems = ageingItems.filter(isStale);
    const filtered = search
      ? staleItems.filter(a =>
          a.issue_key.toLowerCase().includes(search.toLowerCase()) ||
          a.summary.toLowerCase().includes(search.toLowerCase())
        )
      : staleItems;

    const buckets = new Map<AgeBracket, AgeingItem[]>();
    for (const a of filtered) {
      const isArchived = !!a.archived_at;
      const b = bracketFor(a.days_open, isArchived, a.jira_updated_at);
      if (!b) continue;
      if (!buckets.has(b)) buckets.set(b, []);
      buckets.get(b)!.push(a);
    }
    for (const list of buckets.values()) {
      list.sort((x, y) => y.days_open - x.days_open);
    }

    const labels: Record<AgeBracket, string> = {
      needsAttention: 'Needs attention — updated in last 7 days',
      coolingDown: 'Cooling down — 7–14 days since last update',
      archivingSoon: 'Auto-archiving soon — in < 7 days',
      ninetyPlus: '90+ days — critical',
      sixtyNinety: '60–90 days',
      thirtySixty: '30–60 days',
    };

    return BRACKET_ORDER
      .map(b => ({
        bracket: b,
        label: labels[b],
        items: buckets.get(b) ?? [],
        isArchived: b === 'ninetyPlus' || b === 'sixtyNinety',
      }))
      .filter(g => g.items.length > 0);
  }, [ageingItems, search]);

  const handleSelect = onOpenDetail;

  if (isLoading) {
    return (
      <div style={{ padding: token('space.400', '32px'), display: 'flex', alignItems: 'center', gap: token('space.150', '12px') }}>
        <Spinner size="small" />
        <span style={{ color: token('color.text.subtle', '#626F86'), fontSize: 14 }}>
          Loading ageing items…
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <ForYouEmptyState
        title="Couldn't load ageing items"
        description="There was a problem reading your assigned work. Try reloading the page."
      />
    );
  }

  if (!grouped.length && !search) {
    return (
      <ForYouEmptyState
        title="No stalled work — you're on top of things"
        description="Items updated in the last 21 days or open fewer than 30 days are filtered out."
      />
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: token('space.200', '16px'),
        padding: `${token('space.150', '12px')} 0`,
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        marginBottom: token('space.100', '8px'),
      }}>
        <div style={{ flex: 1, maxWidth: 360 }}>
          <Textfield
            placeholder="Search ageing items..."
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
          />
        </div>
        <Button appearance="default" onClick={onNavigateArchives}>
          Archive manager
        </Button>
      </div>

      {/* Sections */}
      <CatyAgeingTriage items={ageingItems ?? []} onOpenDetail={onOpenDetailByKey} />
      {grouped.map(({ bracket, label, items, isArchived }) => {
        const collapsed = collapsedSections.has(bracket);
        return (
          <div key={bracket} style={{ marginBottom: token('space.050', '4px') }}>
            <SectionHeading
              label={label}
              count={items.length}
              collapsed={collapsed}
              onToggle={() => toggleSection(bracket)}
              isArchived={isArchived}
              bracket={bracket}
            />
            {!collapsed && (
              <div style={{
                background: isArchived
                  ? token('color.background.neutral.subtle', '#F7F8F9')
                  : undefined,
              }}>
                {isArchived
                  ? items.map(a => (
                      <ArchivedRow
                        key={a.id}
                        item={a}
                      />
                    ))
                  : items.map(a => (
                      <ActiveAgeingRow
                        key={a.id}
                        item={Object.assign(ageingToWorkItem(a, jiraBaseUrl), { daysOpen: a.days_open, jiraCreatedAt: a.jira_created_at })}
                        onSelect={handleSelect}
                        isArchivingSoon={bracket === 'archivingSoon'}
                      />
                    ))
                }
              </div>
            )}
          </div>
        );
      })}

      {grouped.length === 0 && search && (
        <div style={{
          padding: token('space.400', '32px'), textAlign: 'center',
          color: token('color.text.subtle', '#505258'), fontSize: 14,
        }}>
          No items match "{search}".
        </div>
      )}
    </div>
  );
}

export default function AgeingPanel() {
  const { data: ageingItems, isLoading, isError, refetch } = useAgeingItems();
  const jiraBaseUrl = useJiraBaseUrl();
  const { role } = useUserRole();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === 'admin';

  const handleUnarchive = useCallback(async (issueKey: string) => {
    if (!user?.id || !isAdmin) {
      alert('Only admins can unarchive items. Contact your administrator.');
      return;
    }
    try {
      const { error } = await supabase.rpc('unarchive_issue', {
        p_issue_key: issueKey,
        p_user_id: user.id,
      });
      if (error) throw error;
      refetch();
    } catch (e: any) {
      alert(e.message || 'Failed to unarchive.');
    }
  }, [user?.id, isAdmin, refetch]);

  const handleOpenDetail = useCallback((item: WorkItem) => {
    useGlobalSearchStore.getState().openDetail({
      id: item.id,
      itemType: item.issueType,
      projectKey: item.projectKey,
    });
  }, []);

  return (
    <AgeingPanelView
      ageingItems={ageingItems}
      isLoading={isLoading}
      isError={isError}
      jiraBaseUrl={jiraBaseUrl}
      isAdmin={isAdmin}
      onUnarchive={handleUnarchive}
      onNavigateArchives={() => navigate('/for-you/archives')}
      onOpenDetail={handleOpenDetail}
      onOpenDetailByKey={(key) => useGlobalSearchStore.getState().openDetail({ id: key })}
    />
  );
}
