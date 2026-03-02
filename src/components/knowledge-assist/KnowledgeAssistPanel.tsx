import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X, Mic, Send, RefreshCw, Clock, ArrowUpRight,
  FilePlus, Layers, Bug, AlertOctagon, ShieldAlert, RotateCcw,
  CheckCircle, ClipboardCheck, TrendingUp, Rocket,
  FolderOpen, BarChart3, Activity, AlertTriangle, Users, ArrowRightLeft,
} from 'lucide-react';
import { useKBQuery } from '@/hooks/useKnowledgeBase';
import { useAuth } from '@/hooks/useAuth';
import { KBResponseRenderer } from '@/components/kb/KBResponseRenderer';

import type { KBQueryResponse } from '@/services/knowledgeBase';
import type { LucideIcon } from 'lucide-react';

/* ── Types ── */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  response?: KBQueryResponse;
  logId?: string;
  feedbackGiven?: boolean;
}

type ViewState = 'land' | 'chat';

/* ── Helpers ── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function firstName(name: string) { return name.split(' ')[0] || name; }

/* ── Preset Pool ── */
interface Preset {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  main: string;
  hint: string;
}

/* ═══ WHAT'S NEW pool ═══ */
const WHATS_NEW_POOL: Preset[] = [
  { icon: FilePlus, iconBg: '#DBEAFE', iconColor: '#1D4ED8', main: 'New stories created this sprint', hint: 'Recently added stories across projects' },
  { icon: Layers, iconBg: '#EDE9FE', iconColor: '#6D28D9', main: 'New epics this month', hint: 'Epics created in the last 6 weeks' },
  { icon: Bug, iconBg: '#FEE2E2', iconColor: '#B91C1C', main: 'New defects logged this week', hint: 'Defects reported recently' },
  { icon: AlertOctagon, iconBg: '#FEE2E2', iconColor: '#B91C1C', main: 'Production incidents this week', hint: 'Recent production incidents' },
  { icon: ShieldAlert, iconBg: '#FEF3C7', iconColor: '#92400E', main: 'Items blocked this week', hint: 'Newly blocked work items' },
  { icon: RotateCcw, iconBg: '#FEF3C7', iconColor: '#92400E', main: 'Re-opened items this week', hint: 'Items that bounced back' },
];

/* ═══ WHAT'S CLOSING pool ═══ */
const WHATS_CLOSING_POOL: Preset[] = [
  { icon: CheckCircle, iconBg: '#D1FAE5', iconColor: '#065F46', main: 'Items closed this week', hint: 'Items moved to Done recently' },
  { icon: ClipboardCheck, iconBg: '#CCFBF1', iconColor: '#0F766E', main: 'Items ready for QA', hint: 'Items awaiting validation' },
  { icon: TrendingUp, iconBg: '#D1FAE5', iconColor: '#065F46', main: 'Sprint velocity this week', hint: 'Story points delivered' },
  { icon: Rocket, iconBg: '#DBEAFE', iconColor: '#1D4ED8', main: 'Deployments this week', hint: 'Recent releases to production' },
];

/* ═══ PROJECT SPOTLIGHT pool ═══ */
const SPOTLIGHT_POOL: Preset[] = [
  { icon: FolderOpen, iconBg: '#DBEAFE', iconColor: '#1D4ED8', main: 'Most active project this week', hint: 'Highest activity project' },
  { icon: BarChart3, iconBg: '#DBEAFE', iconColor: '#1D4ED8', main: 'Senaei BAU sprint status', hint: 'Current sprint breakdown' },
  { icon: Activity, iconBg: '#FEF3C7', iconColor: '#92400E', main: 'SIMP project health', hint: 'Project health overview' },
  { icon: AlertTriangle, iconBg: '#FEE2E2', iconColor: '#B91C1C', main: 'Cross-project blockers', hint: 'Blocked items across projects' },
  { icon: Users, iconBg: '#EDE9FE', iconColor: '#6D28D9', main: 'Team workload distribution', hint: 'Team capacity overview' },
  { icon: ArrowRightLeft, iconBg: '#CCFBF1', iconColor: '#0F766E', main: 'Handoff queue this week', hint: 'Items pending review or handoff' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const F = {
  inter: "'Inter', -apple-system, sans-serif",
  sora: "'Sora', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

/* ══════════════════════════════════════════════════════════════════ */

export function KnowledgeAssistPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { response, isLoading, error, askQuestion, sendFeedback, reset } = useKBQuery();

  const [view, setView] = useState<ViewState>('land');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [whatsNewPresets, setWhatsNewPresets] = useState<Preset[]>([]);
  const [whatsClosingPresets, setWhatsClosingPresets] = useState<Preset[]>([]);
  const [spotlightPresets, setSpotlightPresets] = useState<Preset[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingRef = useRef(false);
  const recognitionRef = useRef<any>(null);

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Vikram';
  const name = firstName(fullName);

  const rotatePresets = useCallback(() => {
    setWhatsNewPresets(shuffle(WHATS_NEW_POOL).slice(0, 3));
    setWhatsClosingPresets(shuffle(WHATS_CLOSING_POOL).slice(0, 2));
    setSpotlightPresets(shuffle(SPOTLIGHT_POOL).slice(0, 2));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setView('land');
      setInput('');
      setMessages([]);
      reset();
      pendingRef.current = false;
      rotatePresets();
    }
  }, [isOpen]);

  useEffect(() => {
    if (response && pendingRef.current) {
      pendingRef.current = false;
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', response }]);
    }
  }, [response]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const q = (text || input).trim();
    if (!q || isLoading) return;
    setInput('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    if (view === 'land') setView('chat');

    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: q }]);
    pendingRef.current = true;
    await askQuestion({ query: q, language: 'en', input_method: 'keyboard', user_name: fullName });
  }, [input, isLoading, view, fullName, askQuestion]);

  const handleNewChat = useCallback(() => {
    setView('land');
    setMessages([]);
    setInput('');
    reset();
    rotatePresets();
  }, [reset, rotatePresets]);

  const handleFeedback = useCallback((msgId: string, logId: string | undefined, helpful: boolean) => {
    if (logId) sendFeedback(logId, helpful);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedbackGiven: true } : m));
  }, [sendFeedback]);

  // Voice
  const toggleListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (isListening && recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); return; }
    const r = new SR();
    r.lang = 'en-US'; r.interimResults = true; r.continuous = false;
    recognitionRef.current = r;
    r.onstart = () => setIsListening(true);
    r.onend = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setInput(t);
      if (e.results[e.results.length - 1].isFinal) setIsListening(false);
    };
    r.start();
  }, [isListening]);

  /* ── Preset card renderer ── */
  const PresetCard = ({ p }: { p: Preset }) => {
    const Icon = p.icon;
    return (
      <button
        onClick={() => handleSend(p.main)}
        className="ka-icon-btn"
        style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          padding: '14px 16px', background: 'transparent',
          border: '1.5px solid rgba(15,23,42,0.08)', borderRadius: 10,
          cursor: 'pointer', textAlign: 'left',
          transition: 'all 150ms',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#F8FAFC';
          e.currentTarget.style.borderColor = 'rgba(15,23,42,0.16)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(15,23,42,0.08)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div style={{
          width: 40, height: 40, minWidth: 40, borderRadius: 8, background: p.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={20} strokeWidth={2} color={p.iconColor} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: F.inter, display: 'block' }}>
            {p.main}
          </span>
          <span style={{ fontSize: 11, fontWeight: 400, color: '#64748B', fontFamily: F.inter }}>
            {p.hint}
          </span>
        </div>
      </button>
    );
  };

  /* ── Section label ── */
  const SectionLabel = ({ children }: { children: string }) => (
    <span style={{
      fontSize: 11, fontWeight: 700, color: '#475569',
      textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: F.inter,
    }}>{children}</span>
  );

  /* ── Stat Tile (delta format) ── */
  const StatTile = ({ value, label, color, onClick }: { value: string; label: string; color: string; onClick?: () => void }) => (
    <button
      onClick={onClick}
      style={{
        border: '1.5px solid rgba(15,23,42,0.08)', borderRadius: 8,
        padding: '14px 16px', textAlign: 'left', background: '#FFFFFF',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 150ms',
      }}
      onMouseEnter={onClick ? e => { e.currentTarget.style.borderColor = 'rgba(15,23,42,0.16)'; e.currentTarget.style.transform = 'translateY(-1px)'; } : undefined}
      onMouseLeave={onClick ? e => { e.currentTarget.style.borderColor = 'rgba(15,23,42,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; } : undefined}
    >
      <div style={{
        fontFamily: F.mono, fontSize: 22, fontWeight: 600,
        fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, color,
      }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', marginTop: 2, fontFamily: F.inter }}>
        {label}
      </div>
    </button>
  );

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          aria-hidden="true"
          style={{
            position: 'fixed', inset: 0, top: 48,
            background: 'rgba(15,23,42,0.30)', zIndex: 49,
            animation: 'ka-overlay-in 200ms ease',
          }}
        />
      )}

      {/* Panel — 50vw */}
      <div
        className="knowledge-assist-panel"
        data-v={view}
        role="complementary"
        aria-label="Knowledge Assist"
        style={{
          position: 'fixed', top: 48, right: 0, bottom: 0,
          width: '50vw', minWidth: 480, maxWidth: 960,
          background: '#FFFFFF',
          borderLeft: '1px solid rgba(15,23,42,0.12)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.06)',
          zIndex: 50, display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0,0,0.2,1)',
          fontFamily: F.inter,
        }}
      >
        {/* ── Header — simplified ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid rgba(15,23,42,0.12)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Blue dot with pulse */}
            <div style={{ position: 'relative', width: 8, height: 8 }}>
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%', background: '#2563EB',
              }} />
              <span style={{
                position: 'absolute', inset: -3, borderRadius: '50%', border: '1.5px solid #2563EB',
                animation: 'ka-ring-pulse 2s ease-out infinite', opacity: 0.5,
              }} />
            </div>
            <span style={{
              fontSize: 15, fontWeight: 700, color: '#0F172A',
              letterSpacing: '-0.01em', fontFamily: F.sora,
            }}>
              Knowledge Assist
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={handleNewChat} title="Re-roll presets" aria-label="Refresh" className="ka-icon-btn"
              style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid rgba(15,23,42,0.08)', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 80ms' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <RefreshCw size={16} strokeWidth={2} color="#64748B" aria-hidden="true" />
            </button>
            <button onClick={onClose} aria-label="Close Knowledge Assist" className="ka-icon-btn"
              style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid rgba(15,23,42,0.08)', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 80ms' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <X size={16} strokeWidth={2} color="#64748B" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div ref={scrollRef} className="ka-scroll-area" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* ═══ LANDING STATE ═══ */}
          {view === 'land' && (
            <div style={{ padding: '28px 24px 16px' }}>
              {/* 1. Greeting */}
              <h1 style={{
                fontSize: 24, fontWeight: 700, color: '#0F172A',
                letterSpacing: '-0.02em', margin: 0, fontFamily: F.sora,
              }}>
                {getGreeting()}, {name}
              </h1>
              <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 0', fontWeight: 400 }}>
                Your knowledge briefing is ready.
              </p>

              {/* 2. This Week Pulse — 4 delta tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 20 }}>
                <StatTile value="+8 New" label="stories this week" color="#1D4ED8" onClick={() => handleSend('New stories created this sprint')} />
                <StatTile value="3 Blocked" label="this week" color="#DC2626" onClick={() => handleSend('Items blocked this week')} />
                <StatTile value="5 Re-opened" label="this week" color="#D97706" onClick={() => handleSend('Re-opened items this week')} />
                <StatTile value="12 Closed" label="this week" color="#16A34A" onClick={() => handleSend('Items closed this week')} />
              </div>

              {/* 3. WHAT'S NEW */}
              <div style={{ marginTop: 28 }}>
                <SectionLabel>WHAT'S NEW</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {whatsNewPresets.map(p => <PresetCard key={p.main} p={p} />)}
                </div>
              </div>

              {/* 4. WHAT'S CLOSING */}
              <div style={{ marginTop: 24 }}>
                <SectionLabel>WHAT'S CLOSING</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {whatsClosingPresets.map(p => <PresetCard key={p.main} p={p} />)}
                </div>
              </div>

              {/* 5. PROJECT SPOTLIGHT */}
              <div style={{ marginTop: 24 }}>
                <SectionLabel>PROJECT SPOTLIGHT</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {spotlightPresets.map(p => <PresetCard key={p.main} p={p} />)}
                </div>
              </div>

              {/* 6. Source line */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '16px 0 0' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#16A34A' }} />
                <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: F.inter }}>
                  Live data · Last 2 weeks
                </span>
              </div>
            </div>
          )}

          {/* ═══ CHAT STATE ═══ */}
          {view === 'chat' && (
            <div style={{ padding: '16px 24px', flex: 1 }}>
              {messages.map(msg => {
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, animation: 'ka-msg-in 200ms ease' }}>
                      <div style={{
                        maxWidth: '85%', padding: '10px 16px',
                        borderRadius: '8px 8px 3px 8px', background: '#2563EB',
                        color: '#FFFFFF', fontSize: 13, fontWeight: 500, lineHeight: 1.5,
                        fontFamily: F.inter,
                      }}>{msg.content}</div>
                    </div>
                  );
                }
                return (
                  <div key={msg.id} style={{ marginBottom: 16, animation: 'ka-msg-in 200ms ease' }}>
                    {msg.response ? (
                      <KBResponseRenderer
                        response={msg.response}
                        language="en"
                        feedbackGiven={msg.feedbackGiven}
                        onFeedback={(helpful) => handleFeedback(msg.id, msg.logId, helpful)}
                        onExtend={(query) => handleSend(query)}
                      />
                    ) : null}
                  </div>
                );
              })}
              {isLoading && (
                <div style={{ display: 'flex', gap: 5, padding: '12px 0' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#2563EB',
                      animation: 'ka-dot-bounce 1.2s infinite', animationDelay: `${i * 150}ms`,
                    }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Input Area ── */}
        <div style={{ borderTop: '1px solid rgba(15,23,42,0.12)', padding: '16px 20px', flexShrink: 0, background: '#FFFFFF' }}>
          <div
            style={{
              display: 'flex', alignItems: 'flex-end', gap: 8,
              background: '#F8FAFC', border: '1.5px solid rgba(15,23,42,0.14)',
              borderRadius: 12, padding: '12px 16px', minHeight: 52,
              transition: 'border-color 200ms, box-shadow 200ms',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#2563EB';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
              e.currentTarget.style.background = '#FFFFFF';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(15,23,42,0.14)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.background = '#F8FAFC';
            }}
          >
            <button
              onClick={toggleListening}
              aria-label={isListening ? 'Stop listening' : 'Voice input'}
              className="ka-icon-btn"
              style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                border: 'none', background: isListening ? 'rgba(220,38,38,0.10)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Mic size={18} strokeWidth={2} color={isListening ? '#DC2626' : '#64748B'} aria-hidden="true" />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask anything…"
              aria-label="Ask a question"
              rows={1}
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontSize: 14, color: '#0F172A', fontFamily: F.inter,
                resize: 'none', minHeight: 32, lineHeight: 1.5,
                padding: '4px 0', boxShadow: 'none', appearance: 'none' as any,
                WebkitAppearance: 'none' as any,
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="ka-icon-btn"
              style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                border: 'none',
                background: input.trim() ? '#2563EB' : 'rgba(15,23,42,0.06)',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 80ms',
              }}
            >
              <Send size={18} strokeWidth={2} color={input.trim() ? '#FFFFFF' : '#94A3B8'} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Keyframes */}
        <style>{`
          @keyframes ka-overlay-in { from { opacity: 0 } to { opacity: 1 } }
          @keyframes ka-msg-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
          @keyframes ka-dot-bounce { 0%,80%,100% { transform: translateY(0) } 40% { transform: translateY(-6px) } }
          @keyframes ka-ring-pulse {
            0% { opacity: 0.5; transform: scale(1); }
            100% { opacity: 0; transform: scale(2.2); }
          }
          .ka-icon-btn:focus-visible {
            outline: 2px solid #2563EB;
            outline-offset: 2px;
          }
          .ka-scroll-area::-webkit-scrollbar { width: 4px; }
          .ka-scroll-area::-webkit-scrollbar-track { background: transparent; }
          .ka-scroll-area::-webkit-scrollbar-thumb { background: rgba(15,23,42,0.18); border-radius: 4px; }
          .ka-scroll-area::-webkit-scrollbar-thumb:hover { background: rgba(15,23,42,0.28); }
        `}</style>
      </div>
    </>
  );
}

export default KnowledgeAssistPanel;
