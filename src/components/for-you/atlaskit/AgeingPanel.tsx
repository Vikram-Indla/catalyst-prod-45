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
import { catalystToast } from '@/lib/catalystToast';
import { token } from '@atlaskit/tokens';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import Spinner from '@atlaskit/spinner';
import Lozenge from '@atlaskit/lozenge';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/new';
import { useAgeingItems, type AgeingItem } from '@/hooks/useAgeingItems';
import ForYouRow from './ForYouRow';
import { StatusLozenge } from '@/components/shared/StatusLozenge';
import { ForYouEmptyState } from './helpers';
import { text } from '@/lib/typography';
import { resolveAvatarUrl } from '@/lib/avatars';
import { useJiraBaseUrl } from '@/hooks/useJiraBaseUrl';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { archiveIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { Checkbox as AkCheckbox } from '@atlaskit/checkbox';
import AkArchiveBoxIcon from '@atlaskit/icon/core/archive-box';
import AkEditIcon from '@atlaskit/icon/core/edit';
import AkCloseIcon from '@atlaskit/icon/utility/cross';
import type { ForYouRowAction } from './ForYouRow';
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
    level: a.issue_type ?? '',
    project: a.project_name || a.project_key || '',
    projectKey: a.project_key || '',
    hub: 'ProjectHub' as HubType,
    hubLabel: 'Project',
    issueType: a.issue_type,
    status: a.status,
    statusCategory: a.status_category || undefined,
    priority: a.priority,
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
      avatarColor: 'var(--ds-text-subtlest)',
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
  needsAttention: token('color.border.success', 'var(--ds-background-success-bold)'),
  coolingDown:    token('color.border.warning', '#CF9F02'),
  archivingSoon:  token('color.border.warning', '#FF991F'),
  thirtySixty:    token('color.border.information', 'var(--ds-background-information-bold)'),
  sixtyNinety:    token('color.border.bold', 'var(--ds-text-subtle)'),
  ninetyPlus:     token('color.border.danger', 'var(--ds-background-danger-bold)'),
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
        background: token('color.background.neutral', 'var(--ds-background-neutral)'),
        border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
        borderRadius: 0,
        borderLeft: `3px solid ${accent}`,
        borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`,
      }}
    >
      <span style={{
        transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
        transition: 'transform 150ms', display: 'inline-flex', font: 'var(--ds-font-body-small)',
        color: token('color.icon.subtle', 'var(--ds-text-subtlest)'),
      }}>
        ▾
      </span>
      <span style={{
        font: 'var(--ds-font-body)', fontWeight: 653,
        color: token('color.text', 'var(--ds-text)'),
      }}>
        {label}
      </span>
      {isArchived && (
        <Lozenge appearance="default">archived</Lozenge>
      )}
      <span style={{
        font: 'var(--ds-font-body-small)', fontWeight: 400,
        color: token('color.text.subtlest', 'var(--ds-text-subtlest)'),
        background: token('color.background.neutral', 'var(--ds-background-neutral)'),
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
          borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        }}
      >
        {item.issue_type && <JiraIssueTypeIcon type={item.issue_type} size={16} />}
        <span style={{
          font: 'var(--ds-font-body-small)', fontWeight: 400,
          color: token('color.text.subtle', 'var(--ds-text-subtle)'),
          flexShrink: 0, minWidth: 72,
        }}>
          {item.issue_key}
        </span>
        <span dir="auto" style={{
          font: 'var(--ds-font-body)', fontWeight: 500, color: token('color.text', 'var(--ds-text)'),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, minWidth: 0,
        }}>
          {item.summary}
        </span>
        <StatusLozenge status={item.status} statusCategory={item.status_category} />
        <span style={{
          font: 'var(--ds-font-body-small)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)'),
          flexShrink: 0, minWidth: 40, textAlign: 'right',
        }}>
          {item.days_open}d
        </span>
        {item.archived_at && (
          <span style={{
            font: 'var(--ds-font-body-small)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)'),
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
            background: 'var(--ds-shadow-raised)', zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: token('elevation.surface.overlay', 'var(--ds-surface)'),
              borderRadius: 8, padding: token('space.300', '24px'),
              maxWidth: 480, width: '90%',
              boxShadow: token('elevation.shadow.overlay', '0 8px 16px var(--ds-shadow-raised)'),
            }}
          >
            <h2 style={{
              margin: 0, font: 'var(--ds-font-body-large)', fontWeight: 653,
              color: token('color.text', 'var(--ds-text)'),
              marginBottom: token('space.200', '16px'),
            }}>
              This item is archived
            </h2>
            <p style={{
              margin: 0, font: 'var(--ds-font-body)', fontWeight: 500,
              color: token('color.text', 'var(--ds-text)'),
              marginBottom: token('space.050', '4px'),
            }}>
              {item.issue_key} — {item.summary}
            </p>
            <p style={{
              margin: 0, font: 'var(--ds-font-body-small)',
              color: token('color.text.subtle', 'var(--ds-text-subtle)'),
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
function ActiveAgeingRow({ item, onSelect, isArchivingSoon, actions }: {
  item: WorkItem & { daysOpen: number; jiraCreatedAt?: string };
  onSelect: (item: WorkItem) => void;
  isArchivingSoon?: boolean;
  actions?: ForYouRowAction[];
}) {
  return (
    <div style={{
      borderLeft: isArchivingSoon
        ? `3px solid ${token('color.border.warning', '#FF991F')}`
        : undefined,
    }}>
      <ForYouRow item={item} onSelect={onSelect} actions={actions} />
      <div style={{
        paddingLeft: token('space.600', '48px'),
        paddingBottom: token('space.100', '8px'),
        display: 'flex', alignItems: 'center', gap: token('space.100', '8px'),
      }}>
        <span style={{
          font: 'var(--ds-font-body-small)', fontWeight: 500,
          color: item.daysOpen >= 53
            ? token('color.text.warning', '#FF991F')
            : token('color.text.subtlest', 'var(--ds-text-subtlest)'),
        }}>
          {countdownText(item.daysOpen, item.jiraCreatedAt)}
        </span>
        <span style={{ font: 'var(--ds-font-body-small)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>
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
  onArchive: (issueKey: string) => Promise<void>;
  onArchiveBatch: (issueKeys: string[]) => Promise<void>;
  onNavigateArchives: () => void;
  onOpenDetail: (item: WorkItem) => void;
  onOpenDetailByKey?: (issueKey: string) => void;
}

export function AgeingPanelView({
  ageingItems, isLoading, isError, jiraBaseUrl, isAdmin,
  onUnarchive, onArchive, onArchiveBatch, onNavigateArchives, onOpenDetail, onOpenDetailByKey,
}: AgeingPanelViewProps) {
  const [search, setSearch] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<AgeBracket>>(
    new Set(['ninetyPlus', 'sixtyNinety'])
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [archiving, setArchiving] = useState(false);

  const toggleSelect = useCallback((issueKey: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(issueKey)) next.delete(issueKey); else next.add(issueKey);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

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
        <span style={{ color: token('color.text.subtle', 'var(--ds-icon-subtle)'), font: 'var(--ds-font-body)' }}>
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
        borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`,
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
                  ? token('color.background.neutral.subtle', 'var(--ds-surface-sunken)')
                  : undefined,
              }}>
                {isArchived
                  ? items.map(a => (
                      <ArchivedRow
                        key={a.id}
                        item={a}
                      />
                    ))
                  : items.map(a => {
                      const workItem = Object.assign(ageingToWorkItem(a, jiraBaseUrl), { daysOpen: a.days_open, jiraCreatedAt: a.jira_created_at });
                      const rowActions: ForYouRowAction[] = [
                        {
                          id: 'archive',
                          label: 'Archive',
                          icon: <AkArchiveBoxIcon label="" size="small" />,
                          onClick: () => onArchive(a.issue_key),
                        },
                        {
                          id: 'view',
                          label: 'View details',
                          icon: <AkEditIcon label="" size="small" />,
                          onClick: () => handleSelect(workItem),
                        },
                      ];
                      return (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
                          <div
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 32, minHeight: 56, flexShrink: 0,
                              paddingLeft: token('space.100', '8px'),
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AkCheckbox
                              isChecked={selectedIds.has(a.issue_key)}
                              onChange={() => toggleSelect(a.issue_key)}
                              label=""
                              aria-label={`Select ${a.issue_key}`}
                              name={`select-${a.issue_key}`}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <ActiveAgeingRow
                              item={workItem}
                              onSelect={handleSelect}
                              isArchivingSoon={bracket === 'archivingSoon'}
                              actions={rowActions}
                            />
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            )}
          </div>
        );
      })}

      {grouped.length === 0 && search && (
        <div style={{
          padding: token('space.400', '32px'), textAlign: 'center',
          color: token('color.text.subtle', 'var(--ds-text-subtle)'), font: 'var(--ds-font-body)',
        }}>
          No items match "{search}".
        </div>
      )}

      {/* Bulk archive bar — appears when 1+ items selected */}
      {selectedIds.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            animation: 'bau-bulk-slide-up 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            role="toolbar"
            aria-label="Bulk archive actions"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              height: 44,
              background: token('color.background.neutral.bold', 'var(--ds-icon)'),
              color: token('color.text.inverse', 'var(--ds-text-inverse)'),
              borderRadius: 8,
              boxShadow: token('elevation.shadow.overlay', '0 8px 32px var(--ds-shadow-raised), 0 2px 8px var(--ds-shadow-raised)'),
              overflow: 'hidden',
              font: 'var(--ds-font-body)',
            }}
          >
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Clear selection"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 44, height: 44, background: 'transparent', border: 'none',
                color: token('color.text.inverse', 'var(--ds-text-inverse)'), cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <AkCloseIcon label="" size="small" />
            </button>
            <div style={{ width: 1, height: 20, background: 'var(--ds-surface)' }} />
            <span style={{ padding: '0 16px', font: 'var(--ds-font-body)', fontWeight: 500, whiteSpace: 'nowrap', userSelect: 'none' }}>
              {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
            </span>
            <div style={{ width: 1, height: 20, background: 'var(--ds-surface)' }} />
            <button
              type="button"
              disabled={archiving}
              onClick={async () => {
                setArchiving(true);
                try {
                  await onArchiveBatch(Array.from(selectedIds));
                  clearSelection();
                } finally {
                  setArchiving(false);
                }
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                height: 44, padding: '0 16px', background: 'transparent', border: 'none',
                color: token('color.text.inverse', 'var(--ds-text-inverse)'), cursor: archiving ? 'wait' : 'pointer',
                font: 'var(--ds-font-body)', fontWeight: 500, fontFamily: 'inherit',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <AkArchiveBoxIcon label="" size="small" />
              {archiving ? 'Archiving…' : 'Archive'}
            </button>
          </div>
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
      catalystToast.warning('Only admins can unarchive items. Contact your administrator.');
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
      catalystToast.error(e.message || 'Failed to unarchive.');
    }
  }, [user?.id, isAdmin, refetch]);

  const handleOpenDetail = useCallback((item: WorkItem) => {
    useGlobalSearchStore.getState().openDetail({
      id: item.id,
      itemType: item.issueType ?? undefined,
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
      onArchive={async (issueKey: string) => {
        try {
          await archiveIssue(issueKey, user?.id);
          refetch();
        } catch (e: any) {
          catalystToast.error(e.message || 'Failed to archive.');
        }
      }}
      onArchiveBatch={async (issueKeys: string[]) => {
        const errors: string[] = [];
        for (const key of issueKeys) {
          try {
            await archiveIssue(key, user?.id);
          } catch (e: any) {
            errors.push(key);
          }
        }
        refetch();
        if (errors.length > 0) {
          catalystToast.error(`Failed to archive: ${errors.join(', ')}`);
        }
      }}
      onNavigateArchives={() => navigate('/for-you/archives')}
      onOpenDetail={handleOpenDetail}
      onOpenDetailByKey={(key) => useGlobalSearchStore.getState().openDetail({ id: key })}
    />
  );
}
