/**
 * CatalystFeaturesBoard — Kanban board tracking Claude AI session work items.
 *
 * Supabase table: catalyst_feature_cards
 * Swimlanes: feature_group (Detail Views, Backlog, Admin, Navigation, Profile…)
 * Columns: todo | in_progress | done | on_hold
 *
 * Window bridge exposed for Chrome MCP skill writes:
 *   window.__catalystBoard.write(card)           — upsert a card
 *   window.__catalystBoard.addSkill(skill, key)  — append skill to skill_source[]
 *   window.__catalystBoard.updateStatus(key, st) — change status
 *   window.__catalystBoard.updatePR(key, url, branch, pr?) — mark done + link PR
 *
 * ADS-compliant: all colors via var(--ds-*) tokens. No Tailwind, no raw hex.
 */
import { useState, useEffect, useCallback } from 'react';
import { typedQuery, supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import Spinner from '@atlaskit/spinner';
import BoardIcon from '@atlaskit/icon/glyph/board';
import BranchIcon from '@atlaskit/icon/glyph/bitbucket/branches';
import LinkExternalIcon from '@atlaskit/icon/glyph/link';
import RefreshIcon from '@atlaskit/icon/glyph/refresh';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';

// ── Types ───────────────────────────────────────────────────────────────────

interface FeatureCard {
  id: string;
  card_key: string;
  sequence_number: number;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'on_hold';
  feature_group: string;
  skill_source: string[];
  surface: string | null;
  session_id: string | null;
  branch_name: string | null;
  pr_number: number | null;
  pr_url: string | null;
  jira_issue_keys: string[];
  council_verdict: string | null;
  implementation_plan: string | null;
  handover_path: string | null;
  parent_card_key: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: { id: FeatureCard['status']; label: string; bg: string }[] = [
  { id: 'todo',        label: 'To Do',       bg: 'var(--ds-background-neutral,rgba(9,30,66,.06))' },
  { id: 'in_progress', label: 'In Progress',  bg: 'var(--ds-background-information-subtle,#E9F2FF)' },
  { id: 'done',        label: 'Done',         bg: 'var(--ds-background-success-subtle,#DCFFF1)' },
  { id: 'on_hold',     label: 'On Hold',      bg: 'var(--ds-background-warning-subtle,#FFF7D6)' },
];

const SKILL_BG: Record<string, string> = {
  'preflight':           'var(--ds-background-brand-bold,#0C66E4)',
  'design-intelligence': 'var(--ds-background-information-bold,#0055CC)',
  'design-critique':     '#974F0C',
  'jira-compare':        'var(--ds-background-success-bold,#216E4E)',
};

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

// ADS tokens as CSS vars (fallback hex for non-ADS environments)
const T = {
  surface:       'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
  text:          'var(--ds-text,#292A2E)',
  textSubtle:    'var(--ds-text-subtle,var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))',
  textSubtlest:  'var(--ds-text-subtlest,#626F86)',
  textBrand:     'var(--ds-text-brand,var(--cp-primary-60, #0052CC))',
  border:        'var(--ds-border,rgba(11,18,14,.14))',
  borderLayout:  'var(--ds-border-layout,#EBECF0)',
  borderBrand:   'var(--ds-border-brand,#0C66E4)',
  borderSelected:'var(--ds-border-selected,#0C66E4)',
  bgNeutral:     'var(--ds-background-neutral,#F7F8F9)',
  bgNeutralHov:  'var(--ds-background-neutral-hovered,#F1F2F4)',
  bgSelected:    'var(--ds-background-selected,#E9F2FF)',
  bgWarning:     'var(--ds-background-warning-subtle,#FFF7D6)',
  shadowRaised:  'var(--ds-shadow-raised, 0 1px 3px rgba(9,30,66,.13))',
} as const;

// ── Window bridge helpers ────────────────────────────────────────────────────

function installBridge(onRefresh: () => void) {
  (window as Record<string, unknown>)['__catalystBoard'] = {
    write: async (card: Partial<FeatureCard> & { card_key: string }) => {
      const { data, error } = await typedQuery('catalyst_feature_cards')
        .upsert(
          { ...card, updated_at: new Date().toISOString() },
          { onConflict: 'card_key' }
        )
        .select();
      if (!error) onRefresh();
      return { data, error };
    },
    addSkill: async (skill: string, card_key: string) => {
      const { data: row } = await typedQuery('catalyst_feature_cards')
        .select('skill_source')
        .eq('card_key', card_key)
        .single();
      if (!row) return { error: 'card not found' };
      const merged = Array.from(new Set([...(row.skill_source ?? []), skill]));
      const result = await typedQuery('catalyst_feature_cards')
        .update({ skill_source: merged, updated_at: new Date().toISOString() })
        .eq('card_key', card_key);
      if (!result.error) onRefresh();
      return result;
    },
    updateStatus: async (card_key: string, status: FeatureCard['status']) => {
      const result = await typedQuery('catalyst_feature_cards')
        .update({
          status,
          updated_at: new Date().toISOString(),
          completed_at: status === 'done' ? new Date().toISOString() : null,
        })
        .eq('card_key', card_key);
      if (!result.error) onRefresh();
      return result;
    },
    updatePR: async (
      card_key: string,
      pr_url: string,
      branch_name: string,
      pr_number?: number
    ) => {
      const result = await typedQuery('catalyst_feature_cards')
        .update({
          pr_url,
          branch_name,
          pr_number: pr_number ?? null,
          status: 'done',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('card_key', card_key);
      if (!result.error) onRefresh();
      return result;
    },
    updatePlan: async (card_key: string, implementation_plan: string, council_verdict?: string) => {
      const update: Record<string, unknown> = {
        implementation_plan,
        updated_at: new Date().toISOString(),
      };
      if (council_verdict) update.council_verdict = council_verdict;
      const result = await typedQuery('catalyst_feature_cards').update(update).eq('card_key', card_key);
      if (!result.error) onRefresh();
      return result;
    },
  };
}

// ── Main board component ─────────────────────────────────────────────────────

export default function CatalystFeaturesBoard() {
  const [cards, setCards] = useState<FeatureCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string>('all');

  const fetchCards = useCallback(async () => {
    const { data, error } = await typedQuery('catalyst_feature_cards')
      .select('*')
      .order('sequence_number', { ascending: true });
    if (!error && data) setCards(data as FeatureCard[]);
    setLoading(false);
  }, []);

  // Realtime subscription + window bridge
  useEffect(() => {
    fetchCards();

    const channel = supabase
      .channel('cfcards_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catalyst_feature_cards' }, fetchCards)
      .subscribe();

    installBridge(fetchCards);

    return () => {
      supabase.removeChannel(channel);
      delete (window as Record<string, unknown>)['__catalystBoard'];
    };
  }, [fetchCards]);

  const groups = ['all', ...Array.from(new Set(cards.map(c => c.feature_group))).sort()];
  const visible = activeGroup === 'all' ? cards : cards.filter(c => c.feature_group === activeGroup);
  const swimlanes = activeGroup === 'all'
    ? Array.from(new Set(visible.map(c => c.feature_group))).sort()
    : [activeGroup];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <AdminGuard>
    <div style={{ padding: '24px', background: T.surface, minHeight: '100vh' }}>
      {/* ── Page header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 24, paddingBottom: 16,
        borderBottom: `2px solid ${T.borderBrand}`,
      }}>
        <BoardIcon label="" />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, lineHeight: '24px', color: T.text }}>
          Catalyst Features
        </h1>
        <span style={{ fontSize: 12, color: T.textSubtlest }}>
          AI session work tracker
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--ds-text-information,#0055CC)',
            background: 'var(--ds-background-information-subtle,#E9F2FF)',
            borderRadius: 8, padding: '4px 8px',
          }}>
            {cards.length} cards · {cards.filter(c => c.status === 'in_progress').length} active
          </span>
          <button
            onClick={fetchCards}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: T.textSubtle, display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 4, fontSize: 12,
            }}
            aria-label="Refresh board"
          >
            <RefreshIcon label="" size="small" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Group filter tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
        {groups.map(g => {
          const count = g === 'all' ? cards.length : cards.filter(c => c.feature_group === g).length;
          const active = activeGroup === g;
          return (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              style={{
                padding: '4px 12px', borderRadius: 20, border: '1px solid',
                borderColor: active ? T.borderSelected : T.border,
                background: active ? T.bgSelected : T.surface,
                color: active ? 'var(--ds-text-selected,#0C66E4)' : T.textSubtle,
                fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer',
              }}
            >
              {g === 'all' ? `All (${count})` : `${g} (${count})`}
            </button>
          );
        })}
      </div>

      {/* ── Kanban board ── */}
      {cards.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '148px repeat(4,minmax(260px,1fr))',
            gap: 8, marginBottom: 4, minWidth: 1096,
          }}>
            <div />
            {COLUMNS.map(col => {
              const count = visible.filter(c => c.status === col.id).length;
              return (
                <div key={col.id} style={{
                  background: col.bg, borderRadius: '6px 6px 0 0',
                  padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.textSubtle }}>{col.label}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: T.textSubtlest,
                    background: T.bgNeutral, borderRadius: 8, padding: '0 8px',
                  }}>{count}</span>
                </div>
              );
            })}
          </div>

          {/* Swimlane rows */}
          {swimlanes.map(group => (
            <SwimLaneRow
              key={group}
              group={group}
              cards={visible.filter(c => c.feature_group === group)}
            />
          ))}
        </div>
      )}
    </div>
    </AdminGuard>
  );
}

// ── SwimLaneRow ──────────────────────────────────────────────────────────────

function SwimLaneRow({ group, cards }: { group: string; cards: FeatureCard[] }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '148px repeat(4,minmax(260px,1fr))',
      gap: 8, marginBottom: 8, minWidth: 1096,
    }}>
      {/* Swimlane label */}
      <div style={{
        background: 'var(--ds-background-neutral,#F7F8F9)',
        borderRadius: 6, padding: '8px 12px',
        borderLeft: '3px solid var(--ds-border-brand,#0C66E4)',
        display: 'flex', alignItems: 'flex-start',
      }}>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: 'var(--ds-text-subtle,var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))',
          lineHeight: '16px', wordBreak: 'break-word',
        }}>
          {group}
        </span>
      </div>

      {/* One cell per column */}
      {COLUMNS.map(col => {
        const colCards = cards.filter(c => c.status === col.id);
        return (
          <div key={col.id} style={{
            background: col.bg, borderRadius: '0 0 6px 6px',
            padding: 8, minHeight: 72 /* not on grid but Jira-spec card height */,
            display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            {colCards.map(card => <FeatureCardView key={card.card_key} card={card} />)}
          </div>
        );
      })}
    </div>
  );
}

// ── FeatureCardView ──────────────────────────────────────────────────────────

function FeatureCardView({ card }: { card: FeatureCard }) {
  const [expanded, setExpanded] = useState(false);
  const isStale =
    card.status === 'in_progress' &&
    Date.now() - new Date(card.updated_at).getTime() > STALE_MS;

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}
      aria-expanded={expanded}
      style={{
        background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
        border: `1px solid ${isStale ? 'var(--ds-border-warning,#F5A623)' : 'var(--ds-border,rgba(11,18,14,.14))'}`,
        borderLeft: isStale ? '3px solid var(--ds-border-warning,#F5A623)' : undefined,
        borderRadius: 6, padding: '8px 12px', cursor: 'pointer',
        boxShadow: 'var(--ds-shadow-raised, 0 1px 3px rgba(9,30,66,.13))',
        transition: 'box-shadow 150ms cubic-bezier(.15,1,.3,1)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--ds-shadow-overlay, 0 2px 8px rgba(9,30,66,.2))')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--ds-shadow-raised, 0 1px 3px rgba(9,30,66,.13))')}
    >
      {/* Header: seq + chevron + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, color: 'var(--ds-text-subtlest,#626F86)',
          background: 'var(--ds-background-neutral,#F7F8F9)',
          borderRadius: 3, padding: '0 8px', fontFamily: 'var(--cp-font-mono)', flexShrink: 0,
        }}>
          #{String(card.sequence_number).padStart(3, '0')}
        </span>
        <span style={{ color: 'var(--ds-text-subtlest,#626F86)', flexShrink: 0, marginTop: 1 }}>
          {expanded
            ? <ChevronDownIcon label="" size="small" />
            : <ChevronRightIcon label="" size="small" />}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 500, color: 'var(--ds-text,#292A2E)',
          lineHeight: '16px', flex: 1,
        }}>
          {card.title}
        </span>
      </div>

      {/* Skill tags */}
      {card.skill_source.length > 0 && (
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 4 }}>
          {card.skill_source.map(skill => (
            <span key={skill} style={{
              fontSize: 9, fontWeight: 600, color: '#fff',
              background: SKILL_BG[skill] ?? 'var(--ds-background-neutral-bold,var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))',
              borderRadius: 3, padding: '0 8px',
            }}>
              {skill}
            </span>
          ))}
          {isStale && (
            <span style={{
              fontSize: 9, fontWeight: 600,
              color: 'var(--ds-text-warning,#974F0C)',
              background: 'var(--ds-background-warning-subtle,#FFF7D6)',
              borderRadius: 3, padding: '0 8px',
            }}>
              stale
            </span>
          )}
        </div>
      )}

      {/* Surface */}
      {card.surface && (
        <div style={{ fontSize: 10, color: 'var(--ds-text-subtlest,#626F86)', marginBottom: 3 }}>
          {card.surface}
        </div>
      )}

      {/* PR link */}
      {card.pr_url && (
        <a
          href={card.pr_url}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 10, color: 'var(--ds-text-brand,var(--cp-primary-60, #0052CC))', textDecoration: 'none',
            marginBottom: 3,
          }}
        >
          <LinkExternalIcon label="" size="small" />
          PR #{card.pr_number ?? '?'}
          {card.branch_name && (
            <span style={{ color: 'var(--ds-text-subtlest,#626F86)', fontFamily: 'var(--cp-font-mono)' }}>
              · {card.branch_name}
            </span>
          )}
        </a>
      )}

      {/* Branch only (no PR yet) */}
      {card.branch_name && !card.pr_url && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 10, color: 'var(--ds-text-subtlest,#626F86)',
        }}>
          <BranchIcon label="" size="small" />
          <span style={{ fontFamily: 'monospace' }}>{card.branch_name}</span>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          marginTop: 8, paddingTop: 8,
          borderTop: '1px solid var(--ds-border,rgba(11,18,14,.14))',
        }}>
          {card.council_verdict && (
            <ExpandSection label="Council verdict" text={card.council_verdict} lines={4} />
          )}
          {card.implementation_plan && (
            <ExpandSection label="Plan" text={card.implementation_plan} lines={5} />
          )}
          {card.description && (
            <ExpandSection label="Description" text={card.description} lines={3} />
          )}
          {card.jira_issue_keys?.length > 0 && (
            <div style={{ marginTop: 5, fontSize: 10, color: 'var(--ds-text-subtlest,#626F86)' }}>
              Jira: {card.jira_issue_keys.join(', ')}
            </div>
          )}
          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--ds-text-subtlest,#626F86)' }}>
            Started: {new Date(card.created_at).toLocaleDateString()}
            {card.completed_at && ` · Done: ${new Date(card.completed_at).toLocaleDateString()}`}
          </div>
        </div>
      )}
    </div>
  );
}

function ExpandSection({ label, text, lines }: { label: string; text: string; lines: number }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{
        fontSize: 10, fontWeight: 600,
        color: 'var(--ds-text-subtle,var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))', marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 11, color: 'var(--ds-text,#292A2E)', lineHeight: '16px',
        display: '-webkit-box', WebkitLineClamp: lines,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {text}
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      textAlign: 'center', padding: '64px 24px',
      color: 'var(--ds-text-subtlest,#626F86)',
    }}>
      <BoardIcon label="" />
      <div style={{ fontSize: 14, fontWeight: 500, marginTop: 12, marginBottom: 8, color: 'var(--ds-text-subtle,var(--cp-text-secondary, var(--cp-text-secondary, #44546F)))' }}>
        No feature cards yet
      </div>
      <div style={{ fontSize: 12, lineHeight: '18px' }}>
        Cards appear here automatically when{' '}
        <code style={{ fontSize: 11, background: 'var(--ds-background-neutral,#F7F8F9)', padding: '1px 4px', borderRadius: 3 }}>/preflight</code>
        ,{' '}
        <code style={{ fontSize: 11, background: 'var(--ds-background-neutral,#F7F8F9)', padding: '1px 4px', borderRadius: 3 }}>/design-intelligence</code>
        , or{' '}
        <code style={{ fontSize: 11, background: 'var(--ds-background-neutral,#F7F8F9)', padding: '1px 4px', borderRadius: 3 }}>/jira-compare</code>
        {' '}runs.
      </div>
    </div>
  );
}
