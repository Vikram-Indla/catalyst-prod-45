import React, { useCallback, useEffect, useState } from 'react';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { CatyInsightCard } from './CatyInsightCard';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { JiraForYouLozenge } from './ForYouRow';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { resolveAvatarUrl } from '@/lib/avatars';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

// A single status/assignee transition on a starred work item, sourced from
// ph_activity_log (field_name + old_value → new_value). Work items only —
// StarredPanel passes only work-item keys.
interface ChangeRow {
  activityId: string;
  issueKey: string;
  summary: string;
  issueType: string | null;
  project: string | null;
  field: 'status' | 'assignee';
  oldValue: string | null;
  newValue: string | null;
}

interface CatyStarredDigestProps {
  starredKeys: string[];
  lastVisit?: string;
}

const CACHE_KEY = 'caty.starred-digest.lastVisit';

const BODY = 'var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif';
const TEXT = token('color.text', 'var(--ds-text)');
const SUBTLE = token('color.text.subtle', 'var(--ds-icon)');
const SUBTLEST = token('color.text.subtlest', 'var(--ds-icon-subtle)');
const LINK = token('color.link', 'var(--ds-link)');
const BORDER = token('color.border', 'var(--ds-border)');
const TILE_BG = token('color.background.neutral', 'rgba(5,21,36,0.06)');
const PILL_BG = token('color.background.neutral', 'var(--ds-background-neutral)');

function getLastVisit(): string {
  const stored = localStorage.getItem(CACHE_KEY);
  if (stored) return stored;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString();
}

function setLastVisit() {
  localStorage.setItem(CACHE_KEY, new Date().toISOString());
}

export function CatyStarredDigest({ starredKeys, lastVisit }: CatyStarredDigestProps) {
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Stable signature of the key set. `starredKeys` is a fresh array on every
  // parent render (StarredPanel maps rows inline), so depending on the array
  // identity re-fired the effect on every re-render and re-flashed the card.
  // Keying off the joined string fires the effect only when the keys change.
  const keysKey = starredKeys.join(',');

  const fetchChanges = useCallback(async () => {
    if (starredKeys.length === 0) return;
    setIsLoading(true);
    try {
      const since = lastVisit ?? getLastVisit();

      // 1. Resolve work-item meta + the uuid PK that ph_activity_log keys on.
      const { data: issues } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, issue_type, project_name')
        .in('issue_key', starredKeys);

      const metaById = new Map<string, { key: string; summary: string; type: string | null; project: string | null }>();
      const ids: string[] = [];
      (issues || []).forEach((i: { id: string; issue_key: string; summary: string | null; issue_type: string | null; project_name: string | null }) => {
        metaById.set(i.id, { key: i.issue_key, summary: i.summary ?? i.issue_key, type: i.issue_type ?? null, project: i.project_name ?? null });
        ids.push(i.id);
      });
      if (ids.length === 0) { setChanges([]); return; }

      // 2. Status + assignment transitions on those items since last visit.
      const { data: acts, error } = await supabase
        .from('ph_activity_log')
        .select('id, work_item_id, field_name, old_value, new_value, created_at')
        .in('work_item_id', ids)
        .in('field_name', ['status', 'assignee'])
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      if (!error && acts) {
        const rows: ChangeRow[] = [];
        for (const a of acts as { id: string; work_item_id: string; field_name: string; old_value: string | null; new_value: string | null }[]) {
          const m = metaById.get(a.work_item_id);
          if (!m) continue; // zero-assumption: skip if the item didn't resolve
          rows.push({
            activityId: a.id,
            issueKey: m.key,
            summary: m.summary,
            issueType: m.type,
            project: m.project,
            field: a.field_name === 'assignee' ? 'assignee' : 'status',
            oldValue: a.old_value,
            newValue: a.new_value,
          });
        }
        setChanges(rows);
      }
    } finally {
      setIsLoading(false);
      setLastVisit();
    }
    // keysKey is the stable proxy for starredKeys; lastVisit is read directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysKey, lastVisit]);

  useEffect(() => { fetchChanges(); }, [fetchChanges]);

  if (starredKeys.length === 0) {
    return (
      <div style={{
        padding: '8px 0',
        font: `400 13px/18px ${BODY}`,
        color: SUBTLEST,
      }}>
        Star some items to see what changed since your last visit.
      </div>
    );
  }

  // Only ever mount the card once there is real content. Previously the card
  // mounted in its loading shell the instant the fetch started, then unmounted
  // when the fetch came back empty — an appear→vanish flash on every visit.
  if (changes.length === 0) return null;

  const openDetail = (issueKey: string) => useGlobalSearchStore.getState().openDetail({ id: issueKey });

  return (
    <CatyInsightCard
      title="What's changed"
      isLoading={isLoading}
      onRefresh={fetchChanges}
      onDismiss={() => { setChanges([]); }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ font: `400 13px/18px ${BODY}`, color: SUBTLE, marginBlockEnd: 4 }}>
          {changes.length} recent {changes.length === 1 ? 'change' : 'changes'} on your starred items
        </span>
        {changes.map((row) => (
          <div
            key={row.activityId}
            role="button"
            tabIndex={0}
            onClick={() => openDetail(row.issueKey)}
            onKeyDown={(e) => { if (e.key === 'Enter') openDetail(row.issueKey); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '12px 4px',
              borderTop: `0.5px solid ${BORDER}`,
              cursor: 'pointer',
            }}
          >
            {/* Type tile — mirrors ForYouRow jira-assigned (32px rounded tile). */}
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: TILE_BG,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {row.issueType ? <JiraIssueTypeIcon type={row.issueType} size={20} /> : null}
            </div>

            {/* Body — title on line 1; type · key · project on line 2. */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                font: `500 14px/20px ${BODY}`, color: TEXT,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {row.summary}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {row.issueType && (
                  <span style={{ font: `400 12px/16px ${BODY}`, color: SUBTLEST }}>{row.issueType}</span>
                )}
                {row.issueType && <span aria-hidden="true" style={{ color: SUBTLEST }}>·</span>}
                <span style={{ font: `400 12px/16px ${BODY}`, color: SUBTLE }}>{row.issueKey}</span>
                {row.project && (
                  <>
                    <span aria-hidden="true" style={{ color: SUBTLEST }}>·</span>
                    <span style={{ font: `500 12px/16px ${BODY}`, color: LINK, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.project}</span>
                  </>
                )}
              </div>
            </div>

            <ChangeChip row={row} />
          </div>
        ))}
      </div>
    </CatyInsightCard>
  );
}

function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke={SUBTLEST} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NeutralPill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      flexShrink: 0,
      font: `653 11px/16px ${BODY}`,
      textTransform: 'uppercase',
      letterSpacing: '0.165px',
      color: SUBTLE,
      background: PILL_BG,
      padding: '2px 6px',
      borderRadius: 3,
    }}>
      {children}
    </span>
  );
}

// Trailing transition indicator: status renders old → new pills; assignee
// renders "Assigned → {avatar + name}" (or → Unassigned).
function ChangeChip({ row }: { row: ChangeRow }) {
  if (row.field === 'assignee') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ font: `400 12px/16px ${BODY}`, color: SUBTLEST }}>Assigned</span>
        <ArrowRight />
        {row.newValue ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <CatalystAvatar size="small" src={resolveAvatarUrl(row.newValue) || undefined} name={row.newValue} />
            <span style={{ font: `500 12px/16px ${BODY}`, color: TEXT }}>{row.newValue}</span>
          </span>
        ) : (
          <NeutralPill>Unassigned</NeutralPill>
        )}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      {row.oldValue && <NeutralPill>{row.oldValue}</NeutralPill>}
      {row.oldValue && row.newValue && <ArrowRight />}
      {row.newValue && <JiraForYouLozenge status={row.newValue} />}
    </div>
  );
}
