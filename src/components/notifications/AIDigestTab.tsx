import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, RefreshCw, CheckCircle2, X, ChevronDown,
  ExternalLink, BrainCircuit, Clock, Bug, Rocket,
  FlaskConical, AlertTriangle, ListChecks, BarChart3, LayoutGrid, Briefcase,
} from 'lucide-react';
import { useAiDigest, useForceRefreshDigest } from '@/hooks/useAiDigest';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import type {
  DigestItemV2, RiskHorizon,
} from '@/types/aiDigestV2';
import { sanitiseCTAPath, clampConfidence, HUB_COLOURS } from '@/types/aiDigestV2';
import { formatDistanceToNow } from 'date-fns';

/* ── Token maps (light / dark) ── */
function useTokens() {
  const { isDark } = useTheme();
  return {
    ink1:      isDark ? '#EDEDED' : '#0F172A',
    ink2:      isDark ? '#A1A1A1' : '#334155',
    ink3:      isDark ? '#A1A1A1' : '#475569',
    ink4:      isDark ? '#878787' : '#64748B',
    ink5:      isDark ? '#7D7D7D' : '#94A3B8',
    surface:   isDark ? '#1A1A1A' : '#F8FAFC',
    border:    isDark ? '#2E2E2E' : '#E2E8F0',
    borderLt:  isDark ? '#292929' : '#F1F5F9',
    white:     isDark ? '#1A1A1A' : '#FFFFFF',
    cardBg:    isDark ? '#1A1A1A' : '#FFFFFF',
    cardBd:    isDark ? '#2E2E2E' : '#E2E8F0',
    primary:   '#2563EB',
    primaryLt: isDark ? 'rgba(37,99,235,.1)' : '#EFF6FF',
    primaryBd: isDark ? 'rgba(37,99,235,.25)' : '#BFDBFE',
    success:   '#16A34A',
    isDark,
  };
}

/* ── Hub icon map ── */
const HUB_ICON: Record<string, typeof Rocket> = {
  ReleaseHub: Rocket,
  IncidentHub: AlertTriangle,
  TestHub: FlaskConical,
  TaskHub: ListChecks,
  StrategyHub: BarChart3,
  ProductHub: LayoutGrid,
  PlanHub: LayoutGrid,
};

/* ── Section config ── */
const SECTIONS: { horizon: RiskHorizon; label: string; dot: string; countBg: string; countText: string }[] = [
  { horizon: 'critical_now', label: 'CRITICAL NOW',   dot: '#DC2626', countBg: '#FEE2E2', countText: '#B91C1C' },
  { horizon: 'today',        label: 'ACTION TODAY',   dot: '#DC2626', countBg: '#FEE2E2', countText: '#B91C1C' },
  { horizon: 'this_week',    label: 'WATCH THIS WEEK',dot: '#2563EB', countBg: '#EFF6FF', countText: '#1D4ED8' },
  { horizon: 'good_news',    label: 'GOOD NEWS',      dot: '#16A34A', countBg: '#D1FAE5', countText: '#065F46' },
];

const PRIORITY_STYLE: Record<string, { bg: string; text: string }> = {
  HIGH: { bg: '#FEE2E2', text: '#B91C1C' },
  MED:  { bg: '#DEEBFF', text: '#0747A6' },
  LOW:  { bg: '#F3F4F6', text: '#374151' },
};

/* ── Greeting helper ── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ── Dismiss animation wrapper ── */
function DismissableCard({
  children,
  onDismiss,
}: {
  children: (dismiss: () => void) => React.ReactNode;
  onDismiss: () => void;
}) {
  const [dismissing, setDismissing] = useState(false);

  const handleDismiss = useCallback(() => {
    setDismissing(true);
    setTimeout(onDismiss, 200);
  }, [onDismiss]);

  return (
    <div
      style={{
        overflow: 'hidden',
        transition: 'max-height 200ms ease, opacity 200ms ease',
        maxHeight: dismissing ? 0 : 600,
        opacity: dismissing ? 0 : 1,
      }}
    >
      {children(handleDismiss)}
    </div>
  );
}

/* ── "Why surfaced?" toggle ── */
function WhySurfaced({ trigger }: { trigger: string }) {
  const [open, setOpen] = useState(false);
  const T = useTokens();
  const id = useRef(`ws-${Math.random().toString(36).slice(2, 8)}`).current;

  return (
    <div style={{ marginBlockEnd: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={id}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, fontFamily: 'Inter, sans-serif',
          fontSize: 11, fontWeight: 600, color: T.primary,
        }}
        className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
      >
        <BrainCircuit size={10} />
        Why surfaced?
        <ChevronDown
          size={10}
          style={{
            transition: 'transform 200ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      <div
        id={id}
        role="region"
        style={{
          overflow: 'hidden',
          transition: 'max-height 200ms ease, opacity 200ms ease',
          maxHeight: open ? 200 : 0,
          opacity: open ? 1 : 0,
        }}
      >
        <div style={{
          marginBlockStart: 4,
          padding: '6px 8px',
          background: 'rgba(37,99,235,.04)',
          border: '0.75px solid rgba(37,99,235,.15)',
          borderRadius: 4,
          fontFamily: 'Inter, sans-serif',
          fontSize: 11, fontStyle: 'italic',
          color: 'rgba(37,99,235,.6)',
          lineHeight: 1.5,
        }}>
          {trigger}
        </div>
      </div>
    </div>
  );
}

/* ── Confidence bar ── */
function ConfidenceBar({ value }: { value: number }) {
  const T = useTokens();
  const clamped = clampConfidence(value);
  const fill = clamped >= 80 ? 'var(--cp-teal, #0D9488)'
    : clamped >= 60 ? 'var(--cp-warning, #D97706)'
    : T.ink5;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: T.ink5, whiteSpace: 'nowrap' }}>
        AI confidence
      </span>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="AI confidence"
        style={{
          width: 80, height: 4,
          background: T.borderLt,
          borderRadius: 2, overflow: 'hidden',
        }}
      >
        <div style={{
          width: `${clamped}%`, height: '100%',
          background: fill, borderRadius: 2,
          transition: 'width 300ms ease',
        }} />
      </div>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: T.ink4 }}>
        {clamped}%
      </span>
    </div>
  );
}

/* ── Digest Card ── */
function DigestCard({
  item,
  onDismiss,
  onNavigate,
}: {
  item: DigestItemV2;
  onDismiss: () => void;
  onNavigate?: () => void;
}) {
  const T = useTokens();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const ps = PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.LOW;
  const HubIcon = HUB_ICON[item.hub] || Briefcase;
  const accentColour = item.hub_colour || HUB_COLOURS[item.hub] || '#374151';

  const priorityLabel = item.priority === 'HIGH' ? 'High'
    : item.priority === 'MED' ? 'Med' : 'Low';

  return (
    <DismissableCard onDismiss={onDismiss}>
      {(dismiss: () => void) => (
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: 'flex',
            background: T.cardBg,
            border: `0.75px solid ${T.cardBd}`,
            borderRadius: 'var(--cp-radius-card, 6px)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Left accent bar */}
          <div style={{
            width: 3, flexShrink: 0,
            background: accentColour,
            borderRadius: 0,
          }} />

          {/* Card body */}
          <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
            {/* Row 1 — meta + title */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginBlockEnd: 4,
            }}>
              <HubIcon size={14} style={{ color: T.ink5, flexShrink: 0 }} aria-hidden="true" />

              {item.project_name && (
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500,
                  color: T.ink4, background: T.surface,
                  border: `0.75px solid ${T.border}`,
                  borderRadius: 'var(--cp-radius-badge, 3px)',
                  padding: '1px 6px', flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                  {item.project_name}
                </span>
              )}

              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                background: ps.bg, color: ps.text,
                padding: '2px 7px',
                borderRadius: 'var(--cp-radius-badge, 3px)',
                flexShrink: 0, whiteSpace: 'nowrap',
              }}>
                {priorityLabel}
              </span>

              <span
                title={item.title}
                style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 650,
                  color: T.ink1, flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {item.title}
              </span>

              <button
                onClick={(e) => { e.stopPropagation(); dismiss(); }}
                aria-label="Dismiss this digest item"
                className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 2, flexShrink: 0,
                  opacity: hovered ? 1 : 0,
                  transition: 'opacity 150ms ease',
                }}
              >
                <X size={12} style={{ color: T.ink5 }} />
              </button>
            </div>

            {/* Row 2 — detail */}
            <p style={{
              fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 400,
              color: T.ink2, lineHeight: 1.55,
              margin: '0 0 5px', wordBreak: 'break-word',
            }}>
              {item.detail}
            </p>

            {/* Row 3 — consequence */}
            {item.consequence && (
              <p style={{
                fontFamily: 'Inter, sans-serif', fontSize: 11, fontStyle: 'italic',
                color: T.ink4, lineHeight: 1.5,
                margin: '0 0 6px',
              }}>
                {item.consequence}
              </p>
            )}

            {/* Row 4 — action */}
            {item.action && (
              <p style={{
                fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 650,
                color: T.ink1, lineHeight: 1.5,
                margin: '0 0 8px',
              }}>
                <span style={{ color: T.primary }}>→ </span>
                {item.action}
              </p>
            )}

            {/* Row 5 — Why surfaced */}
            {item.trigger && <WhySurfaced trigger={item.trigger} />}

            {/* Row 6 — footer */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'flex-end', gap: 8,
            }}>
              <button
                onClick={() => { navigate(sanitiseCTAPath(item.cta_path)); onNavigate?.(); }}
                aria-label={item.cta_label}
                className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                  color: T.primary,
                  background: T.primaryLt,
                  border: `0.75px solid ${T.primaryBd}`,
                  borderRadius: 'var(--cp-radius-btn, 4px)',
                  padding: '3px 8px', cursor: 'pointer',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = T.primaryBd)}
                onMouseLeave={e => (e.currentTarget.style.background = T.primaryLt)}
              >
                <ExternalLink size={10} />
                {item.cta_label}
              </button>
            </div>
          </div>
        </div>
      )}
    </DismissableCard>
  );
}

/* ── Section Header ── */
function SectionHeader({
  label, dot, count, countBg, countText,
}: {
  label: string; dot: string; count: number;
  countBg: string; countText: string;
}) {
  const T = useTokens();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '12px 0 6px',
    }}>
      <span aria-hidden="true" style={{
        width: 8, height: 8, borderRadius: '50%',
        background: dot, flexShrink: 0,
      }} />
      <span style={{
        fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        color: T.ink2, flex: 1,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
        background: countBg, color: countText,
        padding: '1px 7px', borderRadius: 'var(--cp-radius-badge, 3px)',
      }}>
        {count} {count === 1 ? 'item' : 'items'}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function AIDigestTab({ onClose }: { onClose?: () => void } = {}) {
  const { digest, isEmpty, isLoading, isError, refetch } = useAiDigest();
  const { forceRefresh } = useForceRefreshDigest();
  const { user } = useAuth();
  const T = useTokens();
  const [refreshing, setRefreshing] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const digestRef = useRef(digest);

  // W-03: Reset dismissed set when digest data changes (new generation)
  if (digest !== digestRef.current) {
    digestRef.current = digest;
    if (dismissed.size > 0) setDismissed(new Set());
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setDismissed(new Set());
    try {
      await forceRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [forceRefresh]);

  const dismissItem = useCallback((idx: number) => {
    setDismissed(prev => new Set(prev).add(idx));
  }, []);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 20px', gap: 12,
      }}>
        <Loader2
          size={28}
          style={{
            color: T.primary,
            animation: 'digest-spin 1s linear infinite',
          }}
        />
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: 13, color: T.ink4,
        }}>
          Assembling your portfolio intelligence…
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 360 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse" style={{
              height: 56, borderRadius: 'var(--cp-radius-card, 6px)',
              background: T.surface,
            }} />
          ))}
        </div>
        <style>{`@keyframes digest-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  /* ── Error ── */
  if (isError || (!digest && !isEmpty)) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 20px', gap: 12,
      }}>
        <BrainCircuit size={32} style={{ color: T.ink5 }} />
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 650, color: T.ink1,
        }}>
          Digest unavailable
        </span>
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: 12, color: T.ink4, textAlign: 'center',
        }}>
          Unable to generate digest right now. Try again later.
        </span>
        <button
          onClick={() => refetch()}
          aria-label="Retry generating digest"
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          style={{
            marginBlockStart: 8, padding: '6px 16px',
            borderRadius: 'var(--cp-radius-btn, 4px)',
            border: `1px solid ${T.border}`,
            background: 'transparent',
            fontFamily: 'Inter, sans-serif', fontSize: 12, color: T.ink2,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  /* ── Empty ── */
  if (isEmpty || (digest && digest.items.length === 0)) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 20px', gap: 12,
      }}>
        <CheckCircle2 size={28} style={{ color: T.success }} />
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 650, color: T.ink1,
        }}>
          You're all caught up
        </span>
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: 12, color: T.ink4, textAlign: 'center',
        }}>
          No active signals in your portfolio.
        </span>
      </div>
    );
  }

  /* ── Loaded ── */
  const d = digest!;
  const allItems: (DigestItemV2 & { _idx: number })[] = d.items.map((it, i) => ({ ...it, _idx: i }));
  const visibleItems = allItems.filter(it => !dismissed.has(it._idx));

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there';

  const generatedAgo = d.generated_at
    ? formatDistanceToNow(new Date(d.generated_at), { addSuffix: true })
    : null;

  return (
    <div style={{ padding: '12px 20px', fontFamily: 'Inter, sans-serif' }}>
      {/* ── Digest header ── */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', marginBlockEnd: 10,
        background: T.primaryLt,
        border: `0.5px solid ${T.primaryBd}`,
        borderRadius: 'var(--cp-radius-card, 6px)',
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 1L8.5 5.5L13 7L8.5 8.5L7 13L5.5 8.5L1 7L5.5 5.5L7 1Z" fill="#2563EB" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.primary }}>
          AI Digest — Today
        </span>
      </div>

      <div style={{
        fontFamily: 'Sora, Inter, sans-serif', fontSize: 14, fontWeight: 650,
        color: T.ink1, marginBlockEnd: 4,
      }}>
        {getGreeting()}, {firstName}
      </div>

      {/* Meta chips */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBlockEnd: 10, flexWrap: 'wrap',
      }}>
        {generatedAgo && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 11, color: T.ink4,
          }}>
            <Clock size={10} style={{ color: T.ink5 }} />
            Generated {generatedAgo}
          </span>
        )}
        {d.role_persona && (
          <span style={{
            fontSize: 11, color: T.ink4,
            background: T.surface,
            border: `0.75px solid ${T.border}`,
            borderRadius: 'var(--cp-radius-badge, 3px)',
            padding: '1px 6px',
          }}>
            Role: {d.role_persona}
          </span>
        )}
      </div>

      {/* Summary */}
      {d.summary && (
        <div style={{
          borderInlineStart: `3px solid ${T.primary}`,
          paddingInlineStart: 10,
          marginBlockEnd: 16,
        }}>
          <p style={{
            fontSize: 13, fontStyle: 'italic', color: T.ink2,
            lineHeight: '20px', margin: 0,
          }}>
            {d.summary}
          </p>
        </div>
      )}

      {/* ── Sections ── */}
      {SECTIONS.map(sec => {
        const items = visibleItems.filter(it => it.risk_horizon === sec.horizon);
        if (items.length === 0) return null;
        return (
          <div key={sec.horizon}>
            <SectionHeader
              label={sec.label}
              dot={sec.dot}
              count={items.length}
              countBg={sec.countBg}
              countText={sec.countText}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(item => (
                <DigestCard
                  key={item._idx}
                  item={item}
                  onDismiss={() => dismissItem(item._idx)}
                  onNavigate={onClose}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* ── Footer ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBlockStart: 16, paddingBlockStart: 12,
        borderBlockStart: `0.75px solid ${T.border}`,
      }}>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh digest"
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: 12,
            color: T.primary, padding: 0,
          }}
        >
          <RefreshCw
            size={12}
            style={{
              animation: refreshing ? 'digest-spin 800ms linear infinite' : 'none',
            }}
          />
          {refreshing ? 'Refreshing…' : 'Refresh digest'}
        </button>
        <span style={{ fontSize: 11, color: T.ink5 }}>
          {d.has_critical ? 'Next refresh in 30m' : 'Next refresh in 4h'}
        </span>
      </div>
      <style>{`@keyframes digest-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
