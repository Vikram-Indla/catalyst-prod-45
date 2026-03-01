import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Plus, Sparkles, Mic, Send, ClipboardList, AlertTriangle,
  Clock, User, Users
} from 'lucide-react';
import { useKBQuery } from '@/hooks/useKnowledgeBase';
import { useAuth } from '@/hooks/useAuth';
import { KBResponseRenderer } from '@/components/kb/KBResponseRenderer';
import { matchMockResponse } from './KAChatResponses';
import type { KBQueryResponse } from '@/services/knowledgeBase';

/* ── Types ── */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  response?: KBQueryResponse;
  mockResponse?: React.ReactNode;
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

/* ── Presets ── */
const YOUR_WORK = [
  {
    icon: ClipboardList, iconBg: 'rgba(37,99,235,0.10)', iconColor: '#2563EB',
    main: "What are Vikram's open items?", hint: '12 active across 3 projects', ai: false,
  },
  {
    icon: AlertTriangle, iconBg: 'rgba(220,38,38,0.10)', iconColor: '#DC2626',
    main: 'What items are blocked?', hint: '10 blocked — 7 accessibility', ai: true,
  },
  {
    icon: Clock, iconBg: 'rgba(13,148,136,0.10)', iconColor: '#0F766E',
    main: 'SLA breach predictions', hint: 'AI analysis of at-risk items', ai: true,
  },
];

const YOUR_TEAM = [
  {
    icon: User, iconBg: 'rgba(217,119,6,0.10)', iconColor: '#B45309',
    main: 'What is Wahid working on?', hint: 'Mobile Developer · 100%', ai: false,
  },
  {
    icon: Users, iconBg: 'rgba(124,58,237,0.10)', iconColor: '#7C3AED',
    main: 'Team capacity & workload', hint: 'Resource balancing analysis', ai: true,
  },
];

/* ══════════════════════════════════════════════════════════════════ */

export function KnowledgeAssistPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { response, isLoading, error, askQuestion, sendFeedback, reset } = useKBQuery();

  const [view, setView] = useState<ViewState>('land');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const [barsVisible, setBarsVisible] = useState(false);

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Vikram';
  const name = firstName(fullName);

  // Animate risk bars on mount
  useEffect(() => {
    if (isOpen && view === 'land') {
      const t = setTimeout(() => setBarsVisible(true), 150);
      return () => clearTimeout(t);
    }
    setBarsVisible(false);
  }, [isOpen, view]);

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

  const handleSend = useCallback(async (text?: string) => {
    const q = (text || input).trim();
    if (!q || isLoading) return;
    setInput('');
    if (view === 'land') setView('chat');
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: q }]);

    // Check for mock response first
    const mock = matchMockResponse(q);
    if (mock) {
      // Small delay for realism
      setTimeout(() => {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', mockResponse: mock }]);
      }, 600);
      return;
    }

    pendingRef.current = true;
    await askQuestion({ query: q, language: 'en', input_method: 'keyboard', user_name: fullName });
  }, [input, isLoading, view, fullName, askQuestion]);

  const handleNewChat = useCallback(() => {
    setView('land');
    setMessages([]);
    setInput('');
    reset();
  }, [reset]);

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
  const PresetCard = ({ p }: { p: typeof YOUR_WORK[0] }) => {
    const Icon = p.icon;
    return (
      <button
        onClick={() => handleSend(p.main)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          padding: '10px 16px', background: 'transparent',
          border: '0.75px solid rgba(15,23,42,0.12)', borderRadius: 6,
          cursor: 'pointer', textAlign: 'left', transition: 'all 150ms',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(15,23,42,0.04)';
          e.currentTarget.style.borderColor = 'rgba(15,23,42,0.20)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(15,23,42,0.12)';
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 6, background: p.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={20} strokeWidth={2} color={p.iconColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>
              {p.main}
            </span>
            {p.ai && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#7C3AED',
                background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)',
                borderRadius: 9999, padding: '1px 6px', lineHeight: '14px',
                fontFamily: "'Inter', sans-serif",
              }}>AI</span>
            )}
          </div>
          <span style={{ fontSize: 11, fontWeight: 400, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>
            {p.hint}
          </span>
        </div>
      </button>
    );
  };

  /* ── Risk bar ── */
  const RiskBar = ({ label, pct, gradient }: { label: string; pct: number; gradient: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{
        width: 90, fontSize: 11, fontWeight: 500, color: '#334155', textAlign: 'right',
        fontFamily: "'Inter', sans-serif",
      }}>{label}</span>
      <div style={{ flex: 1, height: 16, background: '#F1F5F9', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2, background: gradient,
          width: barsVisible ? `${pct}%` : '0%',
          transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      <span style={{
        width: 32, fontSize: 11, color: '#64748B', textAlign: 'right',
        fontFamily: "'JetBrains Mono', monospace",
      }}>{pct}%</span>
    </div>
  );

  /* ── Source line ── */
  const SourceLine = () => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '8px 0',
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#16A34A' }} />
      <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
        Verified against indexed sources · Cited responses
      </span>
    </div>
  );

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, top: 48,
            background: 'rgba(15,23,42,0.30)', zIndex: 49,
            animation: 'ka-overlay-in 200ms ease',
          }}
        />
      )}

      {/* Panel */}
      <div
        data-v={view}
        style={{
          position: 'fixed', top: 48, right: 0, bottom: 0,
          width: 540, background: '#FFFFFF',
          borderLeft: '0.75px solid rgba(15,23,42,0.12)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.06)',
          zIndex: 50, display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0,0,0.2,1)',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* ── Header 48px ── */}
        <div style={{
          height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', borderBottom: '0.75px solid rgba(15,23,42,0.12)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              position: 'relative', width: 8, height: 8,
            }}>
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%', background: '#2563EB',
              }} />
              <span style={{
                position: 'absolute', inset: -3, borderRadius: '50%',
                border: '1.5px solid rgba(37,99,235,0.4)',
                animation: 'ka-ring-pulse 2s infinite',
              }} />
            </span>
            <span style={{
              fontSize: 14, fontWeight: 650, color: '#0F172A',
              letterSpacing: '-0.02em', fontFamily: "'Sora', sans-serif",
            }}>Knowledge Assist</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={handleNewChat}
              title="New chat"
              style={{
                width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Plus size={16} strokeWidth={2} color="#64748B" />
            </button>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <X size={16} strokeWidth={2} color="#64748B" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
        >
          {/* ═══ LANDING STATE ═══ */}
          {view === 'land' && (
            <div style={{ padding: '32px 24px 16px' }}>
              {/* Greeting */}
              <h1 style={{
                fontSize: 24, fontWeight: 700, color: '#0F172A',
                letterSpacing: '-0.02em', margin: 0,
                fontFamily: "'Sora', sans-serif",
              }}>
                {getGreeting()}, {name}
              </h1>
              <p style={{
                fontSize: 13, color: '#64748B', margin: '6px 0 0', fontWeight: 400,
              }}>
                Your knowledge briefing is ready.
              </p>

              {/* AI Insight Banner */}
              <div style={{
                marginTop: 24,
                background: 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(37,99,235,0.05))',
                border: '1px solid rgba(124,58,237,0.12)', borderRadius: 6,
                padding: '16px 20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Sparkles size={14} strokeWidth={2} color="#7C3AED" style={{
                    animation: 'ka-sparkle 3s ease-in-out infinite',
                  }} />
                  <span style={{
                    fontSize: 11, fontWeight: 650, color: '#7C3AED',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    fontFamily: "'Inter', sans-serif",
                  }}>AI INSIGHT</span>
                </div>
                <p style={{
                  fontSize: 13, lineHeight: 1.6, color: '#334155', margin: 0,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  <strong style={{ color: '#0F172A', fontWeight: 650 }}>3 items at risk of breaching SLA</strong>
                  {' — BAU-5074 (15h, deferred), SIMP-3245 (5d, blocked on Figma mismatch). Consider reassigning or escalating before Sunday standup.'}
                </p>
              </div>

              {/* Stats Grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
                marginTop: 20,
              }}>
                {[
                  { value: '12', label: 'Open Items', color: '#0F172A' },
                  { value: '3', label: 'Blocked', color: '#DC2626' },
                  { value: '5', label: 'At Risk', color: '#D97706' },
                  { value: '97%', label: 'SLA Met', color: '#16A34A' },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: '#F8FAFC',
                    border: '0.75px solid rgba(15,23,42,0.12)', borderRadius: 6,
                    padding: 12, textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: 18, fontWeight: 500, color: s.color,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: 'tabular-nums',
                    }}>{s.value}</div>
                    <div style={{
                      fontSize: 11, color: '#64748B', marginTop: 2,
                      fontFamily: "'Inter', sans-serif",
                    }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Risk Heatmap */}
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Sparkles size={12} strokeWidth={2} color="#94A3B8" />
                  <span style={{
                    fontSize: 11, fontWeight: 650, color: '#94A3B8',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    fontFamily: "'Inter', sans-serif",
                  }}>Team Risk Heatmap</span>
                </div>
                <RiskBar label="Accessibility" pct={78} gradient="linear-gradient(90deg, #DC2626, #F87171)" />
                <RiskBar label="Mobile FE" pct={52} gradient="linear-gradient(90deg, #D97706, #FBBF24)" />
                <RiskBar label="Integration" pct={25} gradient="linear-gradient(90deg, #16A34A, #4ADE80)" />
              </div>

              {/* YOUR WORK */}
              <div style={{ marginTop: 28 }}>
                <span style={{
                  fontSize: 11, fontWeight: 650, color: '#94A3B8',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  fontFamily: "'Inter', sans-serif",
                }}>YOUR WORK</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {YOUR_WORK.map((p, i) => <PresetCard key={i} p={p} />)}
                </div>
              </div>

              {/* YOUR TEAM */}
              <div style={{ marginTop: 24 }}>
                <span style={{
                  fontSize: 11, fontWeight: 650, color: '#94A3B8',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  fontFamily: "'Inter', sans-serif",
                }}>YOUR TEAM</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {YOUR_TEAM.map((p, i) => <PresetCard key={i} p={p} />)}
                </div>
              </div>

              {/* Source Line */}
              <div style={{ marginTop: 24 }}>
                <SourceLine />
              </div>
            </div>
          )}

          {/* ═══ CHAT STATE ═══ */}
          {view === 'chat' && (
            <div style={{ padding: '16px 24px', flex: 1 }}>
              {messages.map(msg => {
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} style={{
                      display: 'flex', justifyContent: 'flex-end', marginBottom: 8,
                      animation: 'ka-msg-in 200ms ease',
                    }}>
                      <div style={{
                        maxWidth: '85%', padding: '10px 16px',
                        borderRadius: '8px 8px 3px 8px', background: '#2563EB',
                        color: '#FFFFFF', fontSize: 13, fontWeight: 500, lineHeight: 1.5,
                        fontFamily: "'Inter', sans-serif",
                      }}>{msg.content}</div>
                    </div>
                  );
                }
                // Assistant message — mock or real
                return (
                  <div key={msg.id} style={{ marginBottom: 16, animation: 'ka-msg-in 200ms ease' }}>
                    {msg.mockResponse ? msg.mockResponse : (
                      msg.response && (
                        <KBResponseRenderer
                          response={msg.response}
                          language="en"
                          feedbackGiven={msg.feedbackGiven}
                          onFeedback={(helpful) => handleFeedback(msg.id, msg.logId, helpful)}
                        />
                      )
                    )}
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

        {/* ── Input Area (sticky bottom) ── */}
        <div style={{
          borderTop: '0.75px solid rgba(15,23,42,0.12)',
          padding: '12px 20px', flexShrink: 0,
        }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', height: 36,
              border: '1px solid rgba(15,23,42,0.14)', borderRadius: 4,
              overflow: 'hidden', transition: 'all 150ms',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#2563EB';
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.18)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(15,23,42,0.14)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <button
              onClick={toggleListening}
              style={{
                width: 28, height: 28, margin: '0 4px', borderRadius: 4,
                border: 'none', background: isListening ? 'rgba(220,38,38,0.10)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 150ms',
              }}
              onMouseEnter={e => { if (!isListening) e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
              onMouseLeave={e => { if (!isListening) e.currentTarget.style.background = 'transparent'; }}
            >
              <Mic size={16} strokeWidth={2} color={isListening ? '#DC2626' : '#64748B'} />
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask anything…"
              style={{
                flex: 1, height: '100%', border: 'none', outline: 'none',
                background: 'transparent', fontSize: 13, color: '#0F172A',
                fontFamily: "'Inter', sans-serif",
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              style={{
                width: 28, height: 28, margin: '0 4px', borderRadius: 4,
                border: 'none',
                background: input.trim() ? 'rgba(37,99,235,0.60)' : 'rgba(15,23,42,0.06)',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 150ms',
              }}
            >
              <Send size={16} strokeWidth={2} color={input.trim() ? '#FFFFFF' : '#94A3B8'} />
            </button>
          </div>
          <SourceLine />
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
          @keyframes ka-sparkle {
            0%,100% { transform: scale(1) rotate(0deg); }
            50% { transform: scale(1.15) rotate(15deg); }
          }
        `}</style>
      </div>
    </>
  );
}

export default KnowledgeAssistPanel;
