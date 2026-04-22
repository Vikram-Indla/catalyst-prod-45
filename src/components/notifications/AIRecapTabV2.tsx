// ─────────────────────────────────────────────────────────────────────────────
// AI Recap Tab V2 — Catalyst-owned AI digest surface
// Design: Atlaskit-first · AI Purple (#7C3AED) brand · Owned Catalyst feature
// Data:   Supabase ai-digest Edge Function → ai_digest_cache fallback
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { ChevronRight, Check, Sparkles, RefreshCw } from 'lucide-react';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import EmptyState from '@atlaskit/empty-state';
import { token } from '@atlaskit/tokens';

// ── Types (unchanged from V1) ─────────────────────────────────────────────────

interface RecapItem {
  id: string;
  category: 'recap' | 'suggestion' | 'done';
  jira_key: string;
  jira_url: string;
  summary: string;
  ai_body_text: string;
  ai_action_text: string;
  timestamp: string;
  done_text?: string;
  actors: string[];
  project_name?: string;
}

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

type LoadState = 'loading' | 'generating' | 'ready' | 'empty' | 'error';

// ── Token shorthands ──────────────────────────────────────────────────────────

const AI_PURPLE = '#7C3AED';          // CLAUDE.md §8 — AI elements only
const AI_PURPLE_LIGHT = '#F5F3FF';    // purple-50 equivalent
const AI_PURPLE_BORDER = '#DDD6FE';   // purple-200 equivalent

// ── Entity key chip ───────────────────────────────────────────────────────────

function EntityKeyChip({ jiraKey, jiraUrl }: { jiraKey: string; jiraUrl: string }) {
  return (
    <a
      href={jiraUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 700,
        color: token('color.link', '#0C66E4'),
        background: token('color.background.information', '#E9F2FF'),
        padding: '2px 7px',
        borderRadius: 3,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {jiraKey}
    </a>
  );
}

function ProjectChip({ name }: { name: string }) {
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      color: token('color.text.subtlest', '#626F86'),
      background: token('color.background.neutral', '#F1F2F4'),
      padding: '2px 7px',
      borderRadius: 3,
      whiteSpace: 'nowrap',
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      flexShrink: 0,
    }}>
      {name}
    </span>
  );
}

// ── Recap card — clean Atlaskit token-backed design ───────────────────────────

function RecapCard({ item, accentColor }: { item: RecapItem; accentColor: string }) {
  const [hovered, setHovered] = useState(false);
  const hasKey = item.jira_key && item.jira_key.length > 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1px solid ${token('color.border', '#091E4224')}`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 6,
        padding: '12px 14px',
        background: hovered
          ? token('color.background.neutral.subtle.hovered', '#F7F8F9')
          : token('color.background.input', '#FFFFFF'),
        transition: 'background 120ms ease',
      }}
    >
      {/* Top row: key / project chip + summary */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        {hasKey ? (
          <EntityKeyChip jiraKey={item.jira_key} jiraUrl={item.jira_url} />
        ) : item.project_name ? (
          <ProjectChip name={item.project_name} />
        ) : null}
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: token('color.text', '#172B4D'),
          lineHeight: '20px',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          fontFamily: 'Inter, sans-serif',
        }}>
          {item.summary}
        </span>
      </div>

      {/* Body text */}
      {item.ai_body_text && (
        <p
          style={{
            fontSize: 14,
            color: token('color.text.subtle', '#44546F'),
            lineHeight: '20px',
            margin: '0 0 10px',
            fontFamily: 'Inter, sans-serif',
          }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.ai_body_text) }}
        />
      )}

      {/* AI action callout */}
      {item.ai_action_text && (
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '8px 12px',
          background: AI_PURPLE_LIGHT,
          borderRadius: 4,
          border: `1px solid ${AI_PURPLE_BORDER}`,
          alignItems: 'flex-start',
        }}>
          <Sparkles
            size={13}
            style={{ color: AI_PURPLE, flexShrink: 0, marginTop: 2 }}
            strokeWidth={1.5}
          />
          <span style={{
            fontSize: 13,
            fontWeight: 500,
            color: AI_PURPLE,
            lineHeight: '18px',
            fontFamily: 'Inter, sans-serif',
          }}>
            {item.ai_action_text}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Section block — Atlaskit lozenge for category label ───────────────────────

type LozengeAppearance = 'default' | 'inprogress' | 'moved' | 'new' | 'removed' | 'success';

function SectionBlock({
  label,
  lozengeAppearance,
  count,
  items,
  accentColor,
}: {
  label: string;
  lozengeAppearance: LozengeAppearance;
  count: number;
  items: RecapItem[];
  accentColor: string;
}) {
  if (items.length === 0) return null;

  return (
    <div style={{ paddingBottom: 12 }}>
      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px 8px',
      }}>
        <Lozenge appearance={lozengeAppearance} isBold>
          {label}
        </Lozenge>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: token('color.text.subtlest', '#626F86'),
          fontFamily: 'Inter, sans-serif',
        }}>
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Cards */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => (
          <RecapCard key={item.id} item={item} accentColor={accentColor} />
        ))}
      </div>
    </div>
  );
}

// ── Done items — collapsible completed section ────────────────────────────────

function DoneSection({ items }: { items: RecapItem[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <div style={{ borderTop: `1px solid ${token('color.border', '#091E4224')}`, marginTop: 4 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '10px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          gap: 8,
        }}
      >
        <Check
          size={14}
          style={{ color: token('color.icon.success', '#216E4E'), flexShrink: 0 }}
          strokeWidth={2.5}
        />
        <Lozenge appearance="success" isBold>COMPLETED TODAY</Lozenge>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: token('color.text.subtlest', '#626F86'),
          fontFamily: 'Inter, sans-serif',
        }}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
        <ChevronRight
          size={14}
          style={{
            marginLeft: 'auto',
            color: token('color.icon.subtle', '#626F86'),
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        />
      </button>

      {open && (
        <div style={{ padding: '4px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <div
              key={item.id}
              style={{
                padding: '10px 12px',
                background: token('color.background.success', '#DFFCF0'),
                borderRadius: 6,
                border: `1px solid ${token('color.border.success', '#BAF3DB')}`,
                borderLeft: `3px solid ${token('color.border.success', '#BAF3DB')}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Check
                  size={13}
                  style={{ color: token('color.icon.success', '#216E4E'), flexShrink: 0 }}
                  strokeWidth={2.5}
                />
                {item.jira_key ? (
                  <EntityKeyChip jiraKey={item.jira_key} jiraUrl={item.jira_url} />
                ) : item.project_name ? (
                  <ProjectChip name={item.project_name} />
                ) : null}
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: token('color.text.success', '#216E4E'),
                  lineHeight: '20px',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  {item.summary}
                </span>
              </div>
              {item.ai_body_text && (
                <p style={{
                  fontSize: 13,
                  color: token('color.text.subtle', '#44546F'),
                  lineHeight: '18px',
                  margin: '0 0 0 21px',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  {item.ai_body_text}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Parser (unchanged) ────────────────────────────────────────────────────────

function parseDigestItems(digest: DigestPayload): RecapItem[] {
  const rawItems = Array.isArray(digest.items) ? digest.items : [];

  return rawItems.map((item, idx) => {
    const resolvedKey = item.entity_key || '';

    let category: 'recap' | 'suggestion' | 'done' = 'recap';
    if (item.category) {
      category = item.category;
    } else if (item.risk_horizon === 'good_news') {
      category = 'done';
    } else if (item.risk_horizon === 'this_week') {
      category = 'suggestion';
    }

    return {
      id: `ai-${idx}`,
      category,
      jira_key: resolvedKey,
      jira_url: item.cta_path || '#',
      summary: item.title || item.summary || '',
      ai_body_text: item.detail || item.body || item.ai_body_text || '',
      ai_action_text: item.action || item.ai_action_text || '',
      timestamp: item.timestamp || '',
      done_text: item.detail || item.trigger || '',
      actors: item.actors || [],
      project_name: item.project_name || '',
    };
  });
}

// ── AI Recap header ───────────────────────────────────────────────────────────

function RecapHeader({ dateStr, loadState }: { dateStr: string; loadState: LoadState }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      borderBottom: `1px solid ${token('color.border', '#091E4224')}`,
      background: AI_PURPLE_LIGHT,
    }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        background: AI_PURPLE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Sparkles size={15} color="#fff" strokeWidth={1.5} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Sora, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          color: AI_PURPLE,
          lineHeight: '18px',
        }}>
          AI Digest
        </div>
        <div style={{
          fontSize: 11,
          color: token('color.text.subtlest', '#626F86'),
          fontFamily: 'Inter, sans-serif',
          lineHeight: '16px',
        }}>
          {dateStr}
        </div>
      </div>
      {loadState === 'generating' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Spinner size="small" />
          <span style={{ fontSize: 11, color: AI_PURPLE, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
            Generating…
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AIRecapTabV2() {
  const [items, setItems] = useState<RecapItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [statusMessage, setStatusMessage] = useState("Loading today's AI recap…");
  const [reloadToken, setReloadToken] = useState(0);

  // ── Data fetching (unchanged logic) ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadDigest = async () => {
      setLoadState('loading');
      setStatusMessage("Loading today's AI recap…");
      setItems([]);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) {
          setLoadState('empty');
          setStatusMessage('Sign in to load your AI recap.');
        }
        return;
      }

      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      let digest: DigestPayload | null = null;
      let backendReturnedEmpty = false;
      let lastError = '';

      for (let attempt = 0; attempt < 3 && !digest && !cancelled; attempt++) {
        if (attempt > 0) {
          setLoadState('generating');
          setStatusMessage("Generating today's AI recap…");
          await sleep(1200);
          if (cancelled) return;
        }

        const { data: fnData, error: fnError } = await supabase.functions.invoke<DigestResponse>('ai-digest', {
          method: 'POST',
          body: {},
        });

        if (fnData?.digest) {
          digest = fnData.digest;
          backendReturnedEmpty = !!fnData.empty;
          break;
        }

        backendReturnedEmpty = backendReturnedEmpty || !!fnData?.empty;
        lastError = fnError?.message || fnData?.error || lastError;

        const { data: cacheData } = await supabase
          .from('ai_digest_cache')
          .select('digest_json')
          .eq('user_id', user.id)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cacheData?.digest_json) {
          digest = cacheData.digest_json as unknown as DigestPayload;
          break;
        }
      }

      if (cancelled) return;

      if (!digest) {
        setLoadState(backendReturnedEmpty ? 'empty' : 'error');
        setStatusMessage(
          backendReturnedEmpty
            ? 'No recap was generated because there were no portfolio signals to summarize yet.'
            : lastError === 'rate_limited'
              ? 'AI recap is being rate-limited right now. Please retry in a moment.'
              : lastError === 'credits_exhausted'
                ? 'AI recap is temporarily unavailable because AI credits are exhausted.'
                : 'We could not generate the AI recap right now. Please retry.'
        );
        return;
      }

      try {
        const parsedItems = parseDigestItems(digest);
        setItems(parsedItems);

        if (parsedItems.length > 0) {
          setLoadState('ready');
          setStatusMessage('');
          return;
        }

        setLoadState(backendReturnedEmpty ? 'empty' : 'error');
        setStatusMessage(
          backendReturnedEmpty
            ? 'No recap was generated because there were no portfolio signals to summarize yet.'
            : 'The recap response came back empty.'
        );
      } catch (error) {
        console.error('[AIRecapTabV2] Failed to parse digest:', error);
        setItems([]);
        setLoadState('error');
        setStatusMessage('We could not finish generating the AI recap. Please retry.');
      }
    };

    void loadDigest();
    return () => { cancelled = true; };
  }, [reloadToken]);

  const handleRetry = () => setReloadToken(value => value + 1);

  const recapItems = items.filter(i => i.category === 'recap');
  const suggestionItems = items.filter(i => i.category === 'suggestion');
  const doneItems = items.filter(i => i.category === 'done');

  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]}`;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* AI Digest header */}
      <RecapHeader dateStr={dateStr} loadState={loadState} />

      {/* Loading state */}
      {(loadState === 'loading' || loadState === 'generating') && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '56px 24px',
          gap: 16,
        }}>
          <Spinner size="large" />
          <span style={{
            fontSize: 13,
            fontWeight: 500,
            color: token('color.text.subtle', '#44546F'),
            fontFamily: 'Inter, sans-serif',
          }}>
            {statusMessage}
          </span>
        </div>
      )}

      {/* Empty state */}
      {loadState === 'empty' && (
        <div style={{ padding: '16px 0' }}>
          <EmptyState
            header="No digest yet"
            description={statusMessage}
          />
        </div>
      )}

      {/* Error state */}
      {loadState === 'error' && (
        <div style={{ padding: '16px 0' }}>
          <EmptyState
            header="Digest unavailable"
            description={statusMessage}
            primaryAction={
              <Button
                appearance="primary"
                onClick={handleRetry}
                iconBefore={() => <RefreshCw size={14} strokeWidth={2} />}
              >
                Retry recap
              </Button>
            }
          />
        </div>
      )}

      {/* Ready state — digest content */}
      {loadState === 'ready' && (
        <>
          <SectionBlock
            label="RECAP"
            lozengeAppearance="inprogress"
            count={recapItems.length}
            items={recapItems}
            accentColor={token('color.border.information', '#0C66E4')}
          />

          {suggestionItems.length > 0 && (
            <div style={{ borderTop: `1px solid ${token('color.border', '#091E4224')}` }}>
              <SectionBlock
                label="SUGGESTED"
                lozengeAppearance="moved"
                count={suggestionItems.length}
                items={suggestionItems}
                accentColor={token('color.border.warning', '#D97706')}
              />
            </div>
          )}

          <DoneSection items={doneItems} />
        </>
      )}
    </div>
  );
}
