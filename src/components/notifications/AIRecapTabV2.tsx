import { useState, useEffect } from 'react';
import { ChevronRight, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
}

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
  return (
    <div
      style={{
        border: `0.75px solid ${T.border}`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 6,
        padding: '12px 14px',
        background: T.card,
        transition: 'background 120ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <a
          href={item.jira_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, fontWeight: 700, color: T.primary,
            background: T.primaryLight, padding: '2px 6px',
            borderRadius: 3, textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          {item.jira_key}
        </a>
        <span style={{
          fontSize: 12.5, fontWeight: 650, color: T.ink1,
          flex: 1, lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {item.summary}
        </span>
        <span style={{ fontSize: 10, color: T.ink4, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {item.timestamp}
        </span>
      </div>

      {/* Body */}
      <p
        style={{
          fontSize: 12.5, color: T.ink2, lineHeight: 1.55,
          margin: '0 0 7px', fontFamily: 'Inter, sans-serif',
        }}
        dangerouslySetInnerHTML={{ __html: item.ai_body_text }}
      />

      {/* Action row */}
      <div style={{
        display: 'flex', gap: 6, padding: '7px 10px',
        background: T.surface, borderRadius: 4,
        border: `0.75px solid ${T.borderLt}`,
        alignItems: 'flex-start',
      }}>
        <span style={{ color: T.warning, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>→</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.ink1, lineHeight: 1.4 }}>
          {item.ai_action_text}
        </span>
      </div>
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
        padding: '12px 18px 8px',
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
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => (
          <RecapCard key={item.id} item={item} borderColor={borderColor} />
        ))}
      </div>
    </div>
  );
}

export default function AIRecapTabV2() {
  const [doneOpen, setDoneOpen] = useState(false);
  const [items, setItems] = useState<RecapItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Try to load from ai_digest_cache
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }

      const { data } = await supabase
        .from('ai_digest_cache')
        .select('digest_json')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (data && data.length > 0 && data[0].digest_json) {
        try {
          const digest = data[0].digest_json as any;
          const rawItems: any[] = Array.isArray(digest.items) ? digest.items : [];

          // Collect entity_ids that need issue_key resolution
          const entityIds = rawItems
            .map((item: any) => item.entity_id)
            .filter((id: any) => id && typeof id === 'string' && id.length > 8);

          // Resolve UUIDs → Jira keys from ph_issues
          let keyMap: Record<string, string> = {};
          if (entityIds.length > 0) {
            const { data: issueRows } = await supabase
              .from('ph_issues')
              .select('id, issue_key')
              .in('id', entityIds);
            if (issueRows) {
              for (const row of issueRows) {
                keyMap[row.id] = row.issue_key;
              }
            }
          }

          const parsedItems: RecapItem[] = rawItems.map((item: any, idx: number) => {
            // Resolve jira_key: prefer explicit key, then resolve from entity_id
            const resolvedKey = item.jira_key || item.key || (item.entity_id ? keyMap[item.entity_id] : '') || '';
            const ctaPath = item.cta_path || '';

            // Map risk_horizon to category
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
              jira_url: ctaPath || '#',
              summary: item.summary || item.title || '',
              ai_body_text: item.detail || item.body || item.ai_body_text || '',
              ai_action_text: item.action || item.ai_action_text || '',
              timestamp: item.timestamp || '',
              done_text: item.done_text || '',
              actors: item.actors || [],
            };
          });

          setItems(parsedItems);
        } catch {
          setItems([]);
        }
      } else {
        setItems([]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const recapItems = items.filter(i => i.category === 'recap');
  const suggestionItems = items.filter(i => i.category === 'suggestion');
  const doneItems = items.filter(i => i.category === 'done');

  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} · digital-transformation`;

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

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          <Loader2 size={20} style={{ color: T.ink4, animation: 'spin 1s linear infinite' }} />
        </div>
      ) : items.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '48px 24px', gap: 8,
        }}>
          <span style={{ fontSize: 13, color: T.ink3, fontFamily: 'Inter, sans-serif' }}>
            No AI recap available yet
          </span>
          <span style={{ fontSize: 11, color: T.ink4, fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
            The AI recap will generate automatically based on your portfolio activity
          </span>
        </div>
      ) : (
        <>
          {/* Recap section */}
          <SectionBlock
            label="RECAP"
            dotColor="#3B82F6"
            countBg="#DEEBFF"
            countText="#0747A6"
            items={recapItems}
            borderColor="#3B82F6"
          />

          {/* Suggestions section */}
          {suggestionItems.length > 0 && (
            <div style={{ marginTop: 8 }}>
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

          {/* Completed Today — collapsible */}
          {doneItems.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <button
                onClick={() => setDoneOpen(!doneOpen)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  padding: '10px 18px', background: 'none', border: 'none',
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
                <div style={{ padding: '4px 18px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {doneItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        padding: '8px 12px', background: '#F0FDF4',
                        borderRadius: 5, border: '0.75px solid #D1FAE5',
                      }}
                    >
                      <Check size={14} style={{ color: T.success, flexShrink: 0, marginTop: 1 }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10.5, fontWeight: 700,
                          background: '#E2E8F0', color: T.ink3,
                          padding: '2px 6px', borderRadius: 3,
                        }}>
                          {item.jira_key}
                        </span>
                        <span
                          style={{ fontSize: 12, color: T.ink2, lineHeight: 1.4 }}
                          dangerouslySetInnerHTML={{ __html: item.done_text || '' }}
                        />
                      </div>
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
