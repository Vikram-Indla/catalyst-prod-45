import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, AlertCircle, RefreshCw, MessageSquarePlus } from 'lucide-react';
import { useKBQuery } from '@/hooks/useKnowledgeBase';
import { useAuth } from '@/hooks/useAuth';
import { KBResponseRenderer } from './KBResponseRenderer';
import { KBInputArea } from './KBInputArea';
import { supabase } from '@/integrations/supabase/client';

import type { KBQueryResponse } from '@/services/knowledgeBase';

type Lang = 'en';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  response?: KBQueryResponse;
  logId?: string;
  feedbackGiven?: boolean;
}

const BRIEFING_MESSAGES = [
  'Your queries are matched against multiple sources — Jira data, ministry regulations, and project documentation — with answers traced back to their origin for full accountability.',
  'Answers include source citations so you can trace every fact back to its origin document.',
  'Answers include source citations so you can trace every fact back to its origin document.',
  '25 knowledge domains are indexed and searchable. Ask about licensing, permits, compliance, releases, or any Catalyst module.',
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] || fullName;
}

export function KBPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { response, isLoading, error, askQuestion, sendFeedback, reset } = useKBQuery();

  const [lang, setLang] = useState<Lang>('en');
  const [input, setInput] = useState('');
  const [isVoice, setIsVoice] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const [briefingIndex] = useState(() => Math.floor(Math.random() * BRIEFING_MESSAGES.length));

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
  const firstName = getFirstName(fullName);
  const isRTL = false;
  const [dynamicChips, setDynamicChips] = useState<string[]>([]);
  const [usedChips, setUsedChips] = useState<Set<string>>(new Set());
  const [chipGeneration, setChipGeneration] = useState(0);

  // Load smart data-driven chips — focused on THIS week's and LAST week's real activity
  const loadChips = useCallback(async () => {
    try {
      const chips: string[] = [];

      // Saudi work week: Sun–Thu. Calculate this week's Sunday and last week's Sunday.
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun
      const thisSunday = new Date(now);
      thisSunday.setDate(now.getDate() - dayOfWeek);
      thisSunday.setHours(0, 0, 0, 0);
      const lastSunday = new Date(thisSunday);
      lastSunday.setDate(thisSunday.getDate() - 7);
      const thisWeekISO = thisSunday.toISOString();
      const lastWeekISO = lastSunday.toISOString();

      // 1) Person most active THIS week (most recently updated items)
      const { data: weekItems, error: weekErr } = await supabase
        .from('ph_issues')
        .select('assignee_display_name')
        .gte('jira_updated_at', thisWeekISO)
        .not('assignee_display_name', 'is', null)
        .limit(200);
      if (weekErr) throw weekErr;

      if (weekItems && weekItems.length > 0) {
        const counts: Record<string, number> = {};
        for (const i of weekItems) counts[i.assignee_display_name] = (counts[i.assignee_display_name] || 0) + 1;
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const topPerson = sorted[0]?.[0]?.split(' ')[0];
        const secondPerson = sorted[1]?.[0]?.split(' ')[0];
        if (topPerson) chips.push(`What is ${topPerson} working on?`);
        if (secondPerson) chips.push(`${secondPerson}'s open items`);
      }

      // 2) Most recently updated ticket THIS week
      const offset = chipGeneration % 3;
      const { data: recentTickets, error: ticketErr } = await supabase
        .from('ph_issues')
        .select('issue_key')
        .gte('jira_updated_at', thisWeekISO)
        .not('issue_key', 'is', null)
        .order('jira_updated_at', { ascending: false })
        .range(offset, offset);
      if (ticketErr) throw ticketErr;

      if (recentTickets && recentTickets[0]) {
        chips.push(`Status of ${recentTickets[0].issue_key}`);
      }

      // 3) Time-contextual aggregation chip
      const contextChips = [
        'What items are blocked?',
        'Who has the most items?',
        'How many open bugs?',
        'What items are overdue?',
      ];
      chips.push(contextChips[chipGeneration % contextChips.length]);

      if (chips.length > 0) setDynamicChips(chips.slice(0, 4));
    } catch { /* no chips on failure */ }
  }, [chipGeneration]);

  useEffect(() => { loadChips(); }, [loadChips]);

  // Speech recognition
  const toggleListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition is not supported. Please use Chrome or Edge.'); return; }
    if (isListening && recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); return; }

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('');
      setInput(transcript);
      setIsVoice(true);
      if (event.results[event.results.length - 1].isFinal) setIsListening(false);
    };
    recognition.start();
  }, [isListening, lang]);

  // Scroll on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  // Handle response
  useEffect(() => {
    if (response && pendingRef.current) {
      pendingRef.current = false;
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', response }]);
    }
  }, [response]);

  const handleSend = useCallback(async (text?: string) => {
    const q = (text || input).trim();
    if (!q || isLoading) return;
    setInput('');
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: q }]);
    pendingRef.current = true;

    // Track used chips and refresh when all are consumed
    if (dynamicChips.includes(q)) {
      setUsedChips((prev) => {
        const next = new Set(prev).add(q);
        if (next.size >= dynamicChips.length) {
          // All chips used — trigger refresh with new data
          setTimeout(() => {
            setUsedChips(new Set());
            setChipGeneration((g) => g + 1);
          }, 500);
        }
        return next;
      });
    }

    await askQuestion({ query: q, language: lang, input_method: isVoice ? 'voice' : 'keyboard', user_name: fullName });
  }, [input, isLoading, lang, isVoice, fullName, askQuestion, dynamicChips]);

  const handleFeedback = useCallback((msgId: string, logId: string | undefined, helpful: boolean) => {
    if (logId) sendFeedback(logId, helpful);
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, feedbackGiven: true } : m)));
  }, [sendFeedback]);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setInput('');
    reset();
  }, [reset]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, top: 48,
            background: 'rgba(0,0,0,0.15)',
            zIndex: 49,
            animation: 'kb-overlay-in 200ms ease',
          }}
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 48, right: 0, bottom: 0,
          width: 624,
          background: 'var(--cp-bg-page, var(--bg-app))',
          borderLeft: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
          boxShadow: 'var(--cp-shadow-overlay, 0px 8px 12px rgba(30,31,33,0.15), 0px 0px 1px rgba(30,31,33,0.31))',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          fontFamily: "var(--cp-font-body, 'Inter', system-ui, sans-serif)",
        }}
      >
        {/* ── Header (64px) ── */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 var(--cp-space-3, 24px)', borderBottom: '0.75px solid var(--cp-border-subtle, rgba(15,23,42,0.06))',
          background: 'var(--cp-bg-surface, var(--bg-1))', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cp-primary-60, var(--cp-blue))', animation: 'kb-status-pulse 3s infinite' }} />
            <span style={{ fontSize: 'var(--cp-type-body, 14px)', fontWeight: 'var(--cp-weight-bold, 650)', color: 'var(--cp-text-primary, var(--fg-1))', letterSpacing: 'var(--cp-tracking-tight, -0.02em)', fontFamily: 'var(--cp-font-heading, Sora, sans-serif)' }}>Intelligence</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={handleClearChat}
              title="New conversation"
              style={{
                width: 32, height: 32, borderRadius: 'var(--cp-radius-md, 4px)', border: 'none', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 150ms',
                opacity: messages.length > 0 ? 1 : 0.4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cp-interact-hover, rgba(15,23,42,0.04))'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <MessageSquarePlus size={16} color="var(--cp-text-tertiary, rgba(237,237,237,0.40))" />
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 'var(--cp-radius-md, 4px)', border: 'none', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cp-interact-hover, rgba(15,23,42,0.04))'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <X size={16} color="var(--cp-text-tertiary, rgba(237,237,237,0.40))" />
            </button>
          </div>
        </div>

        {/* ── Chat area ── */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: 'auto', padding: '0 var(--cp-space-3, 24px)', display: 'flex', flexDirection: 'column' }}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Error banner */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginTop: 16,
              background: 'var(--cp-danger-5, rgba(248,113,113,0.06))', border: '1px solid var(--cp-danger-20, #FECACA)', borderRadius: 'var(--cp-radius-md, 4px)', fontSize: 'var(--cp-type-caption-md, 12px)', color: 'var(--cp-danger-60, var(--sem-danger))',
            }}>
              <AlertCircle size={14} />
              <span style={{ flex: 1 }}>{error}</span>
              <button onClick={() => reset()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <RefreshCw size={13} color="var(--cp-danger-60, #DC2626)" />
              </button>
            </div>
          )}

          {/* Welcome state */}
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 48, flex: 1 }}>
              <p style={{ fontSize: 'var(--cp-type-heading-sm, 20px)', fontWeight: 'var(--cp-weight-bold, 650)', color: 'var(--cp-text-primary, var(--fg-1))', margin: 0, fontFamily: 'var(--cp-font-heading, Sora, sans-serif)' }}>
                {getGreeting()}, {firstName}
              </p>
              <p style={{ fontSize: 'var(--cp-type-body, 14px)', color: 'var(--cp-text-tertiary, var(--fg-3))', marginTop: 8, fontWeight: 'var(--cp-weight-regular, 400)' }}>
                How can I help?
              </p>

              {/* Intelligence Briefing Card */}
              <div style={{
                marginTop: 28, textAlign: isRTL ? 'right' : 'left',
                background: 'linear-gradient(135deg, var(--cp-bg-surface, var(--bg-1)) 0%, var(--cp-primary-5, var(--cp-blue-wash)) 100%)',
                border: '1px solid var(--cp-primary-10, #DBEAFE)', borderRadius: 'var(--cp-radius-lg, 6px)', padding: '20px 24px',
              }}>
                <p style={{
                  fontSize: 'var(--cp-type-caption, 11px)', fontWeight: 'var(--cp-weight-bold, 650)', color: 'var(--cp-primary-60, var(--cp-blue))', letterSpacing: '1.5px',
                  textTransform: 'uppercase', margin: 0, fontFamily: 'var(--cp-font-heading, Sora, sans-serif)',
                }}>INTELLIGENCE BRIEFING</p>
                <div style={{ width: 24, height: 1.5, background: 'var(--cp-primary-60, var(--cp-blue))', margin: '8px 0 12px', borderRadius: 1 }} />
                <p style={{
                  fontSize: 'var(--cp-type-body-sm, 13px)', color: 'var(--cp-text-secondary, var(--fg-2))', lineHeight: 'var(--cp-leading-relaxed, 1.6)', margin: 0,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}>{BRIEFING_MESSAGES[briefingIndex]}</p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ paddingTop: messages.length > 0 ? 16 : 0, paddingBottom: 16 }}>
            {messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} style={{
                    display: 'flex', justifyContent: isRTL ? 'flex-start' : 'flex-end',
                    marginBottom: 8, animation: 'kb-msg-in 200ms ease',
                  }}>
                    <div style={{
                      maxWidth: '85%', padding: '10px 16px',
                      borderRadius: '14px 14px 4px 14px', background: 'var(--cp-primary-60, var(--cp-blue))',
                      color: 'var(--cp-text-inverse, var(--bg-app))', fontSize: 'var(--cp-type-body, 14px)', fontWeight: 'var(--cp-weight-regular, 400)', lineHeight: 'var(--cp-leading-normal, 1.5)',
                    }}>{msg.content}</div>
                  </div>
                );
              }
              return (
                <div key={msg.id} style={{
                  marginBottom: 16, animation: 'kb-msg-in 200ms ease',
                }}
                  onMouseEnter={(e) => {
                    const meta = e.currentTarget.querySelector('.kb-response-meta') as HTMLElement;
                    if (meta) meta.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const meta = e.currentTarget.querySelector('.kb-response-meta') as HTMLElement;
                    if (meta) meta.style.opacity = '0';
                  }}
                >
                  {msg.response && (
                    <KBResponseRenderer
                      response={msg.response}
                      language={lang}
                      feedbackGiven={msg.feedbackGiven}
                      onFeedback={(helpful) => handleFeedback(msg.id, msg.logId, helpful)}
                    />
                  )}
                </div>
              );
            })}

            {/* Loading dots */}
            {isLoading && (
              <div style={{ display: 'flex', gap: 5, padding: '12px 0', animation: 'kb-msg-in 200ms ease' }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: 'var(--cp-primary-60, var(--cp-blue))',
                    animation: 'kb-dot-bounce 1.2s infinite', animationDelay: `${i * 150}ms`,
                  }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Input area ── */}
        <KBInputArea
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          isLoading={isLoading}
          lang={lang}
          isListening={isListening}
          onToggleListening={toggleListening}
          chips={dynamicChips.filter(c => !usedChips.has(c))}
        />

        {/* Keyframes */}
        <style>{`
          @keyframes kb-dot-bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-6px); }
          }
          @keyframes kb-msg-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes kb-overlay-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes kb-status-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </>
  );
}

export default KBPanel;
