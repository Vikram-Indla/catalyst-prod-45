import { useState } from 'react';
import { ChevronRight, Check } from 'lucide-react';

/* ═══════════════════════════════════════
   AI Recap Tab V2 — Stage C (Seed Data)
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

const SEED_DATA: RecapItem[] = [
  {
    id: '1', category: 'recap', jira_key: 'BAU-5307', jira_url: '#',
    summary: 'Broken Auth Flow — Password OTP Navigation',
    ai_body_text: '<strong>Eng. Khalid Al-Otaibi</strong> deployed the fix and marked this ready for testing. The OTP back-click loop is resolved in staging. <strong>Yazeed Daraz</strong> is the assigned QA reviewer; no sign-off yet.',
    ai_action_text: 'Nudge Yazeed Daraz to begin QA sign-off today — this blocks the auth release window.',
    timestamp: '2h ago', actors: ['Eng. Khalid Al-Otaibi', 'Yazeed Daraz'],
  },
  {
    id: '2', category: 'recap', jira_key: 'BAU-5246', jira_url: '#',
    summary: 'Tab Component Issue — BETA & PROD',
    ai_body_text: '<strong>Eng. Sara Al-Ghamdi</strong> verified the fix and <strong>Dr. Ahmed Al-Rashid</strong> approved the merge. Deployed across both environments with no regression reported.',
    ai_action_text: 'Close ticket and mark DONE — no further action needed.',
    timestamp: '5h ago', actors: ['Eng. Sara Al-Ghamdi', 'Dr. Ahmed Al-Rashid'],
  },
  {
    id: '3', category: 'recap', jira_key: 'BAU-5304', jira_url: '#',
    summary: 'OTP Messaging — Removal per Feedback',
    ai_body_text: 'Message removed as requested by <strong>Yazeed Daraz</strong>. Team notified and pending testing confirmation. The underlying account creation flow remains open with no owner assigned.',
    ai_action_text: 'Assign ownership of the account creation flow discussion before end of day.',
    timestamp: '6h ago', actors: ['Yazeed Daraz'],
  },
  {
    id: '4', category: 'suggestion', jira_key: 'BAU-5280', jira_url: '#',
    summary: 'Create Account — Design Consistency',
    ai_body_text: '<strong>Yazeed Daraz</strong> flagged 4 unresolved Figma delta points on the Create Account section. No response from <strong>Eng. Lama Al-Zahrani</strong> (front-end lead) in 18 hours. Parallel activity on <span style="color:var(--cp-primary);font-weight:600">BAU-5304</span> makes this a compounding risk.',
    ai_action_text: 'Schedule a 15-min sync between Yazeed Daraz and Eng. Lama Al-Zahrani today to resolve the Figma deltas.',
    timestamp: '1d ago', actors: ['Yazeed Daraz', 'Eng. Lama Al-Zahrani'],
  },
  {
    id: '5', category: 'suggestion', jira_key: 'SAU-0877', jira_url: '#',
    summary: 'is_dismissed Column Missing — NotifyHub',
    ai_body_text: 'This defect has had zero activity for 3 days and is not assigned. It directly blocks the toast dismiss behaviour — a user-visible regression. No release cycle has pulled it in.',
    ai_action_text: 'Assign to Eng. Faisal Al-Harbi and pull into the current release cycle immediately.',
    timestamp: '3d ago', actors: [],
  },
  {
    id: '6', category: 'done', jira_key: 'BAU-5307', jira_url: '#',
    summary: '', ai_body_text: '', ai_action_text: '', timestamp: '',
    done_text: 'Fix deployed by <strong>Eng. Khalid Al-Otaibi</strong> — auth OTP loop resolved, awaiting QA sign-off.',
    actors: ['Eng. Khalid Al-Otaibi'],
  },
  {
    id: '7', category: 'done', jira_key: 'BAU-5246', jira_url: '#',
    summary: '', ai_body_text: '', ai_action_text: '', timestamp: '',
    done_text: 'Tab component merged by <strong>Dr. Ahmed Al-Rashid</strong> across BETA and PROD.',
    actors: ['Dr. Ahmed Al-Rashid'],
  },
  {
    id: '8', category: 'done', jira_key: 'BAU-5304', jira_url: '#',
    summary: '', ai_body_text: '', ai_action_text: '', timestamp: '',
    done_text: 'OTP message removed per <strong>Yazeed Daraz</strong> feedback — team notified.',
    actors: ['Yazeed Daraz'],
  },
];

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

  const recapItems = SEED_DATA.filter(i => i.category === 'recap');
  const suggestionItems = SEED_DATA.filter(i => i.category === 'suggestion');
  const doneItems = SEED_DATA.filter(i => i.category === 'done');

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
      <div style={{ marginTop: 8 }}>
        <SectionBlock
          label="SUGGESTIONS FOR TODAY"
          dotColor={T.warning}
          countBg={T.warningLight}
          countText={T.warningText}
          items={suggestionItems}
          borderColor="#D97706"
        />
      </div>

      {/* Completed Today — collapsible */}
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
    </div>
  );
}
