import { useState, useEffect } from 'react';
import { ChevronRight, Check, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import AIRecapSkeleton from './AIRecapSkeleton';

/* ═══════════════════════════════════════
   AI Recap Tab V2 — Live Data
   Design: V12 Hybrid Precision
   ═══════════════════════════════════════ */

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

const T = {
  primary: 'var(--cp-primary, #2563EB)',
  primaryLight: 'var(--cp-primary-light, #EFF6FF)',
  primaryBorder: 'var(--cp-primary-border, #BFDBFE)',
  ink1: 'var(--cp-ink-1, #0F172A)',
  ink2: 'var(--cp-ink-2, #334155)',
  ink3: 'var(--cp-ink-3, #64748B)',
  ink4: 'var(--cp-ink-4, #94A3B8)',
  surface: 'var(--cp-surface, #F8FAFC)',
  card: 'var(--cp-card, #FFFFFF)',
  border: 'var(--cp-border, #E2E8F0)',
  borderLt: 'var(--cp-border-lt, #F1F5F9)',
  successText: 'var(--cp-success-text, #006644)',
  successLight: 'var(--cp-success-light, #E3FCEF)',
  success: 'var(--cp-success, #16A34A)',
  warningText: 'var(--cp-warning-text, #92400E)',
  warningLight: 'var(--cp-warning-light, #FEF3C7)',
  warning: 'var(--cp-warning, #D97706)',
  dangerText: 'var(--cp-danger-text, #991B1B)',
  dangerLight: 'var(--cp-danger-light, #FEE2E2)',
};

function RecapCard({ item, borderColor }: { item: RecapItem; borderColor: string }) {
  const hasKey = item.jira_key && item.jira_key.length > 0;
  return (
    <div
      style={{
        border: `0.75px solid ${T.border}`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 6,
        padding: '14px 16px',
        background: T.card,
        transition: 'background 120ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {hasKey ? (
          <a
            href={item.jira_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, fontWeight: 700, color: T.primary,
              background: T.primaryLight, padding: '2px 7px',
              borderRadius: 3, textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            {item.jira_key}
          </a>
        ) : item.project_name ? (
          <span style={{
            fontSize: 10, fontWeight: 700, color: T.ink3,
            background: '#F1F5F9', padding: '2px 7px',
            borderRadius: 3, whiteSpace: 'nowrap',
            textTransform: 'uppercase', letterSpacing: '0.03em',
          }}>
            {item.project_name}
          </span>
        ) : null}
        <span style={{
          fontSize: 13, fontWeight: 650, color: T.ink1,
          flex: 1, lineHeight: 1.35,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {item.summary}
        </span>
      </div>

      {/* Body */}
      {item.ai_body_text && (
        <p
          style={{
            fontSize: 12.5, color: T.ink2, lineHeight: 1.6,
            margin: '0 0 10px', fontFamily: 'Inter, sans-serif',
          }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.ai_body_text) }}
        />
      )}

      {/* Action row */}
      {item.ai_action_text && (
        <div style={{
          display: 'flex', gap: 8, padding: '8px 12px',
          background: T.surface, borderRadius: 4,
          border: `0.75px solid ${T.borderLt}`,
          alignItems: 'flex-start',
        }}>
          <span style={{ color: T.warning, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>→</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.ink1, lineHeight: 1.45 }}>
            {item.ai_action_text}
          </span>
        </div>
      )}
    </div>
  );
}

function SectionBlock({
  label, dotColor, countBg, countText, items, borderColor,
}: {
  label: string; dotColor: string; countBg: string; countText: string;
  items: RecapItem[]; borderColor: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '14px 18px 10px',
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: dotColor, flexShrink: 0,
        }} />
        <span style={{
          fontSize: 11, fontWeight: 700, color: T.ink1,
          textTransform: 'uppercase', letterSpacing: '0.04em',
          fontFamily: 'Inter, sans-serif',
        }}>
          {label}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 10, fontWeight: 700,
          background: countBg, color: countText,
          borderRadius: 10, padding: '1px 6px',
        }}>
          {items.length}
        </span>
      </div>
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(item => (
          <RecapCard key={item.id} item={item} borderColor={borderColor} />
        ))}
      </div>
    </div>
  );
}

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

export default function AIRecapTabV2() {
  const [doneOpen, setDoneOpen] = useState(false);
  const [items, setItems] = useState<RecapItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [statusMessage, setStatusMessage] = useState("Loading today's AI recap…");
  const [reloadToken, setReloadToken] = useState(0);

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
            : 'The recap response came back empty, so we are treating it as unavailable instead of pretending there is nothing to show.'
        );
      } catch (error) {
        console.error('[AIRecapTabV2] Failed to parse digest:', error);
        setItems([]);
        setLoadState('error');
        setStatusMessage('We could not finish generating the AI recap yet. Please retry.');
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
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Overview bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 18px',
        borderBottom: `0.75px solid ${T.borderLt}`,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: T.ink1,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          Today's Overview
        </span>
        <span style={{ fontSize: 11, color: T.ink4 }}>{dateStr}</span>
      </div>

      {(loadState === 'loading' || loadState === 'generating') ? (
        <>
          <AIRecapSkeleton />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 18px 18px',
          }}>
            <Loader2 size={14} className="animate-spin" style={{ color: T.ink3, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: T.ink3 }}>
              {statusMessage}
            </span>
          </div>
        </>
      ) : loadState === 'empty' ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '48px 24px', gap: 8,
        }}>
          <span style={{ fontSize: 13, fontWeight: 650, color: T.ink2 }}>No AI recap generated yet</span>
          <span style={{
            fontSize: 12, color: T.ink3, textAlign: 'center',
            lineHeight: 1.55, maxWidth: 420,
          }}>
            {statusMessage}
          </span>
        </div>
      ) : loadState === 'error' ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '48px 24px', gap: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 650, color: T.ink2 }}>AI recap is taking longer than expected</span>
          <span style={{
            fontSize: 12, color: T.ink3, textAlign: 'center',
            lineHeight: 1.55, maxWidth: 420,
          }}>
            {statusMessage}
          </span>
          <button
            onClick={handleRetry}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '8px 12px', borderRadius: 6,
              border: `0.75px solid ${T.border}`,
              background: T.card, color: T.ink2,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              fontSize: 12, fontWeight: 600,
            }}
          >
            Retry recap
          </button>
        </div>
      ) : (
        <>
          <SectionBlock
            label="RECAP"
            dotColor="#3B82F6"
            countBg="#DEEBFF"
            countText="#0747A6"
            items={recapItems}
            borderColor="#3B82F6"
          />

          {suggestionItems.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <SectionBlock
                label="SUGGESTIONS FOR TODAY"
                dotColor="#D97706"
                countBg={T.warningLight}
                countText={T.warningText}
                items={suggestionItems}
                borderColor="#D97706"
              />
            </div>
          )}

          {/* Completed Today — collapsible with full detail */}
          {doneItems.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setDoneOpen(!doneOpen)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  padding: '12px 18px', background: 'none', border: 'none',
                  borderTop: `0.75px solid ${T.borderLt}`,
                  cursor: 'pointer', gap: 8,
                }}
              >
                <Check size={14} style={{ color: T.success, flexShrink: 0 }} />
                <span style={{
                  fontSize: 11, fontWeight: 700, color: T.ink3,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  Completed Today
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: T.successLight, color: T.successText,
                  borderRadius: 10, padding: '1px 6px',
                }}>
                  {doneItems.length}
                </span>
                <ChevronRight
                  size={14}
                  style={{
                    marginLeft: 'auto', color: T.ink3,
                    transform: doneOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 150ms ease',
                  }}
                />
              </button>

              {doneOpen && (
                <div style={{ padding: '4px 18px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {doneItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px 14px',
                        background: '#F0FDF4',
                        borderRadius: 6, border: '0.75px solid #D1FAE5',
                        borderLeft: '3px solid #16A34A',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Check size={14} style={{ color: T.success, flexShrink: 0 }} />
                        {item.jira_key ? (
                          <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10.5, fontWeight: 700,
                            background: '#E2E8F0', color: T.ink3,
                            padding: '2px 6px', borderRadius: 3,
                          }}>
                            {item.jira_key}
                          </span>
                        ) : item.project_name ? (
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: T.ink3,
                            background: '#E2E8F0', padding: '2px 6px',
                            borderRadius: 3, textTransform: 'uppercase',
                          }}>
                            {item.project_name}
                          </span>
                        ) : null}
                        <span style={{ fontSize: 13, fontWeight: 650, color: '#065F46', lineHeight: 1.35 }}>
                          {item.summary}
                        </span>
                      </div>
                      {item.ai_body_text && (
                        <p style={{
                          fontSize: 12, color: '#334155', lineHeight: 1.55,
                          margin: '0 0 0 22px',
                        }}>
                          {item.ai_body_text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
