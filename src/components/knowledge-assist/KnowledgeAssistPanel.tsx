import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X, Plus, Mic, Send, RefreshCw,
  ClipboardList, AlertTriangle, Clock, User, Users,
  RotateCcw, FileSearch, CalendarDays, TrendingUp, ArrowRightLeft,
} from 'lucide-react';
import { HubIcon } from '@/components/caty-ai/constants';
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

const WORK_POOL: Preset[] = [
  { icon: ClipboardList, iconBg: '#DBEAFE', iconColor: '#1D4ED8', main: "What are Vikram's open items?", hint: 'Active items across projects' },
  { icon: AlertTriangle, iconBg: '#FEE2E2', iconColor: '#B91C1C', main: 'What items are blocked?', hint: 'Blocked work items' },
  { icon: RotateCcw, iconBg: '#DBEAFE', iconColor: '#1D4ED8', main: 'Show re-opened items this week', hint: 'Recently re-opened items' },
  { icon: FileSearch, iconBg: '#CCFBF1', iconColor: '#0F766E', main: 'What did I report this sprint?', hint: 'Items you reported' },
  { icon: Clock, iconBg: '#FEF3C7', iconColor: '#92400E', main: 'Show deferred items', hint: 'Items pushed to next sprint' },
  { icon: CalendarDays, iconBg: '#EDE9FE', iconColor: '#6D28D9', main: 'What changed since yesterday?', hint: 'Recent updates across projects' },
];

const TEAM_POOL: Preset[] = [
  { icon: User, iconBg: '#FEF3C7', iconColor: '#92400E', main: 'What is Wahid working on?', hint: 'View active work items' },
  { icon: User, iconBg: '#CCFBF1', iconColor: '#0F766E', main: 'What is Nada working on?', hint: 'View active work items' },
  { icon: User, iconBg: '#DBEAFE', iconColor: '#1D4ED8', main: 'What is Raza working on?', hint: 'View active work items' },
  { icon: User, iconBg: '#EDE9FE', iconColor: '#6D28D9', main: 'What is Yousif working on?', hint: 'View active work items' },
  { icon: Users, iconBg: '#FEE2E2', iconColor: '#B91C1C', main: 'Team capacity & workload', hint: 'Resource balancing overview' },
  { icon: ArrowRightLeft, iconBg: '#CCFBF1', iconColor: '#0F766E', main: 'Who has bandwidth this week?', hint: 'Available team members' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ══════════════════════════════════════════════════════════════════ */

export function KnowledgeAssistPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { response, isLoading, error, askQuestion, sendFeedback, reset } = useKBQuery();

  const [view, setView] = useState<ViewState>('land');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [workPresets, setWorkPresets] = useState<Preset[]>([]);
  const [teamPresets, setTeamPresets] = useState<Preset[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingRef = useRef(false);
  const recognitionRef = useRef<any>(null);

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Vikram';
  const name = firstName(fullName);

  const rotatePresets = useCallback(() => {
    setWorkPresets(shuffle(WORK_POOL).slice(0, 3));
    setTeamPresets(shuffle(TEAM_POOL).slice(0, 2));
  }, []);

  // Reset panel state every time it opens
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

  // Handle response
  useEffect(() => {
    if (response && pendingRef.current) {
      pendingRef.current = false;
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', response }]);
    }
  }, [response]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  // Auto-grow textarea
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px'; // max ~4 lines
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
          <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif", display: 'block' }}>
            {p.main}
          </span>
          <span style={{ fontSize: 11, fontWeight: 400, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>
            {p.hint}
          </span>
        </div>
      </button>
    );
  };

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

      {/* Panel — 40vw */}
      <div
        className="knowledge-assist-panel"
        data-v={view}
        role="complementary"
        aria-label="Knowledge Assist"
        style={{
          position: 'fixed', top: 48, right: 0, bottom: 0,
          width: '40vw', minWidth: 480, maxWidth: 720,
          background: '#FFFFFF',
          borderLeft: '1px solid rgba(15,23,42,0.12)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.06)',
          zIndex: 50, display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0,0,0.2,1)',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* ── Header — CATY-style ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid rgba(15,23,42,0.12)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Blue logo container */}
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: '#2563EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <div style={{ width: 24, height: 24 }}>
                <HubIcon />
              </div>
            </div>
            <div>
              <div style={{
                fontSize: 15, fontWeight: 700, color: '#0F172A',
                letterSpacing: '-0.01em', fontFamily: "'Sora', sans-serif", lineHeight: 1.2,
              }}>
                Knowledge Assist<sup style={{ fontSize: 8, verticalAlign: 'super', marginLeft: 2 }}>™</sup>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>
                  Intelligent Work Assistant
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={handleNewChat} title="New chat" aria-label="New chat" className="ka-icon-btn"
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(15,23,42,0.10)', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 80ms' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <RefreshCw size={14} strokeWidth={2} color="#64748B" aria-hidden="true" />
            </button>
            <button onClick={onClose} aria-label="Close Knowledge Assist" className="ka-icon-btn"
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(15,23,42,0.10)', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 80ms' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <X size={14} strokeWidth={2} color="#64748B" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div ref={scrollRef} className="ka-scroll-area" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* ═══ LANDING STATE ═══ */}
          {view === 'land' && (
            <div style={{ padding: '32px 24px 16px' }}>
              {/* Greeting */}
              <h1 style={{
                fontSize: 24, fontWeight: 700, color: '#0F172A',
                letterSpacing: '-0.02em', margin: 0, fontFamily: "'Sora', sans-serif",
              }}>
                {getGreeting()}, {name}
              </h1>
              <p style={{ fontSize: 13, color: '#64748B', margin: '6px 0 0', fontWeight: 400 }}>
                Your knowledge briefing is ready.
              </p>

              {/* Quick Action Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 20 }}>
                {[
                  { icon: '📋', label: 'My items', color: '#2563EB', query: "What are my open items?" },
                  { icon: '🚫', label: 'Blocked', color: '#DC2626', query: "What items are blocked?" },
                  { icon: '🔄', label: 'Re-opened', color: '#D97706', query: "Show re-opened items this week" },
                ].map((s, i) => (
                  <button key={i} onClick={() => handleSend(s.query)} style={{
                    padding: 16, border: '1.5px solid rgba(15,23,42,0.10)', borderRadius: 8, background: '#FFFFFF',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(15,23,42,0.20)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(15,23,42,0.10)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ fontSize: 20, lineHeight: 1 }}>{s.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: s.color, marginTop: 6, fontFamily: "'Inter', sans-serif" }}>{s.label}</div>
                  </button>
                ))}
              </div>

              {/* YOUR WORK */}
              <div style={{ marginTop: 28 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', sans-serif",
                }}>YOUR WORK</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {workPresets.map((p, i) => <PresetCard key={p.main} p={p} />)}
                </div>
              </div>

              {/* YOUR TEAM */}
              <div style={{ marginTop: 24 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', sans-serif",
                }}>YOUR TEAM</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {teamPresets.map((p, i) => <PresetCard key={p.main} p={p} />)}
                </div>
              </div>

              {/* Source Line — landing only */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '16px 0 0' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#16A34A' }} />
                <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
                  Verified against indexed sources · Cited responses
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
                        fontFamily: "'Inter', sans-serif",
                      }}>{msg.content}</div>
                    </div>
                  );
                }
                // Assistant — RAG response
                return (
                  <div key={msg.id} style={{ marginBottom: 16, animation: 'ka-msg-in 200ms ease' }}>
                    {msg.response ? (
                      <KBResponseRenderer
                        response={msg.response}
                        language="en"
                        feedbackGiven={msg.feedbackGiven}
                        onFeedback={(helpful) => handleFeedback(msg.id, msg.logId, helpful)}
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

        {/* ── Input Area — taller, prominent ── */}
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
                fontSize: 14, color: '#0F172A', fontFamily: "'Inter', sans-serif",
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
          {/* NO source line here — only on landing */}
        </div>

        {/* Keyframes */}
        <style>{`
          @keyframes ka-overlay-in { from { opacity: 0 } to { opacity: 1 } }
          @keyframes ka-msg-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
          @keyframes ka-dot-bounce { 0%,80%,100% { transform: translateY(0) } 40% { transform: translateY(-6px) } }
          @keyframes ka-ring-pulse {
            0% { opacity: 1; transform: scale(1); }
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
          .ka-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0; }
        `}</style>
      </div>
    </>
  );
}

export default KnowledgeAssistPanel;
