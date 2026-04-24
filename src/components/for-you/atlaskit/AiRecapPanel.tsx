/**
 * AiRecapPanel — For You / AI Recap tab.
 *
 * Styling contract (April 2026 /design-critique pass):
 * ───────────────────────────────────────────────────
 *   Every surface inside the For You page MUST render as a grouped ForYouRow
 *   list using @atlaskit tokens — no bespoke cards, no orange-left-border
 *   chrome, no status-coloured backgrounds. This panel hydrates the AI
 *   digest into WorkItems and hands them to ForYouRow so the visual
 *   language is identical to AssignedPanel · StarredPanel · AgeingPanel.
 *
 * Data flow
 * ─────────
 *   1. Resolve myJiraId from `profiles.jira_account_id` (needed for the
 *      "Assigned to me" filter toggle — we compare item.assignee.id against
 *      the Jira account id, not the Supabase user id).
 *   2. Invoke the existing `ai-digest` Edge Function (unchanged — "touch
 *      chrome, not functionality"). Fall back to the `ai_digest_cache`
 *      table when the function returns without a payload.
 *   3. Extract every DigestItem.entity_key (shape: "BAU-5389"), query
 *      ph_issues in one .in() call, map each matching row to WorkItem
 *      using the same field mapping useForYouData produces so the rows
 *      render with real type icons, project badges, assignee avatars,
 *      and status lozenges.
 *   4. Stash the digest's action copy (ai_action_text / action) as a
 *      suggestion string against the issue_key, and the category
 *      (recap / suggestion / done) likewise. Renders back on the row as
 *      the optional ForYouRow `suggestion` meta fragment.
 *
 * Assigned-only toggle
 * ────────────────────
 *   The `ai-digest` function returns items for every role the user plays —
 *   e.g. "BAU-5112 is waiting on you for review" — not just items with
 *   `assignee_account_id = me`. Hard-filtering to assignee would silently
 *   drop that signal. Instead we expose an explicit @atlaskit/button/new
 *   toggle at the panel header. Off = full digest (default). On =
 *   post-filter to items whose assignee is the current user.
 *
 * Ageing cohort is handled in AgeingPanel.tsx with a hard filter (no
 * toggle) since SLA breach only matters on items you own — see that file
 * for the rationale.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ForYouRow from './ForYouRow';
import { ForYouEmptyState } from './helpers';
import { text } from '@/lib/typography';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { WorkItem, HubType, WorkMode, WorkGroup } from '@/hooks/useForYouData';

// ─── Digest types (structurally identical to AIRecapTabV2.tsx) ──────────────
// We redeclare rather than import from the legacy component to keep the
// new panel self-contained — the legacy file will be retired when the
// notifications drawer migrates off it too.
interface DigestItem {
  category?: 'recap' | 'suggestion' | 'done';
  risk_horizon?: 'critical_now' | 'today' | 'this_week' | 'good_news';
  entity_key?: string | null;
  cta_path?: string | null;
  title?: string | null;
  summary?: string | null;
  detail?: string | null;
  body?: string | null;
  ai_body_text?: string | null;
  action?: string | null;
  ai_action_text?: string | null;
  timestamp?: string | null;
  trigger?: string | null;
  actors?: string[] | null;
  project_name?: string | null;
}

interface DigestPayload {
  summary?: string;
  role_persona?: string;
  has_critical?: boolean;
  generated_at?: string;
  items?: DigestItem[];
}

interface DigestResponse {
  digest: DigestPayload | null;
  cached?: boolean;
  empty?: boolean;
  error?: string;
}

type RecapCategory = 'recap' | 'suggestion' | 'done';

// ─── ph_issues row → WorkItem mapping ───────────────────────────────────────
// Mirrors the projection used in useForYouData.ts so visual parity with
// AssignedPanel / StarredPanel / RecommendedPanel is pixel-exact. Hub +
// WorkMode + WorkGroup defaults are stub values — ForYouRow never reads
// them, but the WorkItem type contract requires them.
const PH_ISSUES_SELECT = 'id, issue_key, project_key, project_name, issue_type, summary, status, status_category, assignee_account_id, assignee_display_name, reporter_display_name, priority, jira_updated_at, jira_created_at, parent_key, parent_summary, sprint_name, story_points, labels, fix_versions, components, description_text, last_synced_at';

function formatRelative(dateStr: string): string {
  if (!dateStr) return '—';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 minute ago';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
}

function initials(name: string): string {
  return (name || '')
    .split(/\s+/)
    .map(p => p[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function phRowToWorkItem(row: any): WorkItem {
  const issueType = String(row.issue_type || 'Task');
  const assigneeName = row.assignee_display_name || 'Unassigned';
  return {
    id: row.issue_key,
    key: row.issue_key,
    summary: row.summary || '',
    phIssueId: row.id || undefined,
    projectId: undefined,
    mode: 'DEL' as WorkMode,
    level: issueType,
    project: row.project_name || row.project_key || '',
    projectKey: row.project_key || '',
    hub: 'ProjectHub' as HubType,
    hubLabel: 'Project',
    issueType,
    status: row.status || 'To Do',
    priority: row.priority || 'Medium',
    priorityLevel: 2,
    sprint: row.sprint_name || undefined,
    storyPoints: row.story_points ? Number(row.story_points) : undefined,
    parentKey: row.parent_key || undefined,
    parentSummary: row.parent_summary || undefined,
    updatedAt: row.jira_updated_at ? formatRelative(row.jira_updated_at) : '—',
    createdAt: row.jira_created_at || '—',
    jiraUrl: row.issue_key ? `https://jira.example.com/browse/${row.issue_key}` : undefined,
    lastSyncedAt: row.last_synced_at || undefined,
    description: row.description_text || undefined,
    assignee: {
      id: row.assignee_account_id || 'none',
      name: assigneeName,
      initials: initials(assigneeName),
      avatarColor: '#6B7280',
      avatarUrl: resolveAvatarUrl(assigneeName) || undefined,
    },
    reporter: row.reporter_display_name || undefined,
    group: 'EARLIER' as WorkGroup,
    starred: false,
  };
}

// When the digest references an entity_key that isn't in ph_issues (rare —
// can happen if the Edge Function references a Catalyst-native task or a
// freshly created issue that hasn't synced yet), synthesise a minimal
// WorkItem so the row still renders in the list instead of silently
// dropping. Project/assignee fall back to digest-supplied strings.
function stubWorkItem(item: DigestItem): WorkItem | null {
  const key = item.entity_key || '';
  if (!key && !item.title) return null;
  const actorName = item.actors?.[0] || 'Unassigned';
  return {
    id: key || `stub-${item.title?.slice(0, 24) || 'item'}`,
    key: key || '—',
    summary: item.title || item.summary || '',
    mode: 'DEL' as WorkMode,
    level: 'Task',
    project: item.project_name || '—',
    projectKey: '',
    hub: 'ProjectHub' as HubType,
    hubLabel: 'Project',
    issueType: 'Task',
    status: 'To Do',
    priority: 'Medium',
    priorityLevel: 2,
    updatedAt: item.timestamp ? formatRelative(item.timestamp) : 'recently',
    createdAt: '—',
    assignee: {
      id: 'none',
      name: actorName,
      initials: initials(actorName),
      avatarColor: '#6B7280',
      avatarUrl: resolveAvatarUrl(actorName) || undefined,
    },
    group: 'EARLIER' as WorkGroup,
    starred: false,
  };
}

// ─── Section heading — identical to AssignedPanel.SectionHeading ────────────
// Kept inline rather than extracted because AssignedPanel has its own copy
// and we want zero visual drift if one is touched without the other. If the
// primitive is ever promoted to `helpers.tsx`, both sites update in lockstep.
function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingInline: 12,
        paddingBlockStart: 16,
        paddingBlockEnd: 8,
      }}
    >
      <span
        style={{
          font: `500 14px/20px "Inter", system-ui, sans-serif`,
          letterSpacing: 'normal',
          color: text.subtlest,
          textTransform: 'none',
        }}
      >
        {label}
      </span>
      <span
        style={{
          font: `400 12px/16px "Inter", system-ui, sans-serif`,
          color: text.subtle,
          backgroundColor: token('elevation.surface.sunken', '#F7F8F9'),
          paddingInline: 6,
          borderRadius: 999,
        }}
      >
        {count}
      </span>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

interface HydratedRow {
  item: WorkItem;
  category: RecapCategory;
  suggestion?: string;
}

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

const CATEGORY_ORDER: Array<{ key: RecapCategory; label: string }> = [
  { key: 'recap',      label: "Today's highlights" },
  { key: 'suggestion', label: 'Suggestions for today' },
  { key: 'done',       label: 'Completed today' },
];

export default function AiRecapPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [rows, setRows] = useState<HydratedRow[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [statusMessage, setStatusMessage] = useState("Loading today's AI recap…");
  const [myJiraId, setMyJiraId] = useState<string | null>(null);

  // Resolve myJiraId once so the assigned-only toggle can filter locally.
  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('jira_account_id')
        .eq('id', user.id)
        .single();
      if (!cancelled) setMyJiraId(profile?.jira_account_id ?? null);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Load + hydrate the digest.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadState('loading');
      setStatusMessage("Loading today's AI recap…");
      setRows([]);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        if (!cancelled) {
          setLoadState('empty');
          setStatusMessage('Sign in to load your AI recap.');
        }
        return;
      }

      // Call ai-digest with a single attempt + cache fallback. Retry logic
      // from the legacy component is intentionally simplified — the digest
      // Edge Function is already retry-tolerant inside itself.
      let digest: DigestPayload | null = null;
      let backendEmpty = false;
      const { data: fnData, error: fnError } = await supabase.functions.invoke<DigestResponse>(
        'ai-digest',
        { method: 'POST', body: {} }
      );
      if (fnData?.digest) {
        digest = fnData.digest;
        backendEmpty = !!fnData.empty;
      } else {
        const { data: cacheData } = await supabase
          .from('ai_digest_cache')
          .select('digest_json')
          .eq('user_id', authUser.id)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cacheData?.digest_json) {
          digest = cacheData.digest_json as unknown as DigestPayload;
        } else if (fnError) {
          if (!cancelled) {
            setLoadState('error');
            setStatusMessage('We could not generate the AI recap right now. Please retry.');
          }
          return;
        }
      }

      if (cancelled) return;

      const digestItems = Array.isArray(digest?.items) ? digest!.items! : [];
      if (digestItems.length === 0) {
        setLoadState('empty');
        setStatusMessage(
          backendEmpty
            ? 'No recap was generated because there were no portfolio signals to summarize yet.'
            : 'Nothing to recap today.'
        );
        return;
      }

      // Hydrate: one bulk ph_issues fetch for every entity_key in the digest.
      const entityKeys = digestItems
        .map(i => i.entity_key)
        .filter((k): k is string => typeof k === 'string' && k.length > 0);

      const issueMap = new Map<string, any>();
      if (entityKeys.length > 0) {
        const { data: issueRows } = await supabase
          .from('ph_issues')
          .select(PH_ISSUES_SELECT)
          .in('issue_key', entityKeys);
        for (const r of issueRows ?? []) issueMap.set(r.issue_key, r);
      }

      if (cancelled) return;

      // Compose HydratedRows in the digest's original order (the Edge
      // Function already ranks items by salience — preserve that).
      const hydrated: HydratedRow[] = [];
      for (let idx = 0; idx < digestItems.length; idx++) {
        const d = digestItems[idx];
        const key = d.entity_key || '';
        const row = key ? issueMap.get(key) : undefined;
        const workItem = row ? phRowToWorkItem(row) : stubWorkItem(d);
        if (!workItem) continue;

        // Title parity: digest often carries a more informative title than
        // the raw ph_issues.summary. Use the digest title if present.
        if (d.title || d.summary) {
          workItem.summary = d.title || d.summary || workItem.summary;
        }

        // Decide category: prefer explicit `category`, then derive from
        // risk_horizon (good_news → done, this_week → suggestion, else recap).
        let category: RecapCategory = 'recap';
        if (d.category) category = d.category;
        else if (d.risk_horizon === 'good_news') category = 'done';
        else if (d.risk_horizon === 'this_week') category = 'suggestion';

        const suggestion = (d.ai_action_text || d.action || '').trim() || undefined;

        hydrated.push({ item: workItem, category, suggestion });
      }

      if (cancelled) return;

      if (hydrated.length === 0) {
        setLoadState('empty');
        setStatusMessage('Nothing to recap today.');
        return;
      }

      setRows(hydrated);
      setLoadState('ready');
      setStatusMessage('');
    };

    void load();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Assigned-only filter (post-hydration, local). See header comment for rationale.
  const visible = useMemo(() => {
    if (!assignedOnly || !myJiraId) return rows;
    return rows.filter(r => r.item.assignee.id === myJiraId);
  }, [rows, assignedOnly, myJiraId]);

  const handleSelect = (workItem: WorkItem) => {
    if (!workItem.key || workItem.key === '—') return;
    navigate(`/issues/${workItem.key}`);
  };

  // Star toggle is a no-op in Recap (digest rows aren't persistable as
  // starred against an ai_digest_item id). The star still shows on hover
  // for visual consistency, but clicking it does nothing destructive.
  const handleToggleStar = () => {};

  // ─── Render states ────────────────────────────────────────────────────────
  if (loadState === 'loading') {
    return (
      <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Spinner size="small" />
        <span style={{ color: token('color.text.subtle', '#626F86'), font: `400 14px/20px "Inter", system-ui, sans-serif` }}>
          {statusMessage}
        </span>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <ForYouEmptyState
        title="AI recap is taking longer than expected"
        description={statusMessage}
      />
    );
  }

  if (loadState === 'empty' || visible.length === 0) {
    return (
      <ForYouEmptyState
        title={visible.length === 0 && rows.length > 0 ? 'No recap items assigned to you' : 'No AI recap yet'}
        description={
          visible.length === 0 && rows.length > 0
            ? 'Switch off "Assigned to me" to see every item in your digest.'
            : statusMessage
        }
      />
    );
  }

  const grouped = CATEGORY_ORDER
    .map(({ key, label }) => ({
      key,
      label,
      rows: visible.filter(r => r.category === key),
    }))
    .filter(g => g.rows.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Filter toolbar — Atlaskit button, no bespoke chrome. Sits above
          the first group heading so it reads as a list-level control, not
          a card header. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingInline: 12,
          paddingBlockStart: 8,
          paddingBlockEnd: 4,
        }}
      >
        <Button
          appearance={assignedOnly ? 'primary' : 'subtle'}
          spacing="compact"
          onClick={() => setAssignedOnly(v => !v)}
        >
          {assignedOnly ? 'Showing: Assigned to me' : 'All relevant'}
        </Button>
      </div>

      {grouped.map(({ key, label, rows: groupRows }) => (
        <div key={key}>
          <SectionHeading label={label} count={groupRows.length} />
          {groupRows.map(({ item, suggestion }) => (
            <ForYouRow
              key={item.id}
              item={item}
              onSelect={handleSelect}
              onToggleStar={handleToggleStar}
              suggestion={suggestion}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
