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
  '25 knowledge domains are indexed and searchable. Ask about licensing, permits, compliance, sprints, or any Catalyst module.',
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

  // Load smart data-driven chips using real names & ticket keys
  const loadChips = useCallback(async () => {
    try {
      const chips: string[] = [];

      const { data: people } = await supabase
        .from('profiles')
        .select('full_name')
        .not('full_name', 'is', null)
        .limit(20);

      const shuffled = (people || []).sort(() => Math.random() - 0.5);
      const person1 = shuffled[0]?.full_name?.split(' ')[0];
      const person2 = shuffled[1]?.full_name?.split(' ')[0];

      // Get a random recent ticket (offset by generation to vary)
      const { data: recentTicket } = await supabase
        .from('ph_issues')
        .select('issue_key, summary')
        .not('issue_key', 'is', null)
        .order('jira_updated_at', { ascending: false })
        .range(chipGeneration % 5, chipGeneration % 5)
        .limit(1)
        .single();

      if (person1) chips.push(`What is ${person1} working on?`);
      if (recentTicket) chips.push(`Status of ${recentTicket.issue_key}`);
      if (person2) chips.push(`${person2}'s open items`);
      chips.push('Who has the most items?');

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
          width: 520,
          background: '#FFFFFF',
          borderLeft: '1px solid #E4E4E7',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.08), -2px 0 8px rgba(0,0,0,0.04)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* ── Header (64px) ── */}
        <div style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', borderBottom: '1px solid #F4F4F5', background: '#FAFAFA', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB', animation: 'kb-status-pulse 3s infinite' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#18181B', letterSpacing: '-0.3px' }}>Intelligence</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={handleClearChat}
              title="New conversation"
              style={{
                width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 150ms',
                opacity: messages.length > 0 ? 1 : 0.4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F4F4F5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <MessageSquarePlus size={16} color="#71717A" />
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F4F4F5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <X size={16} color="#71717A" />
            </button>
          </div>
        </div>

        {/* ── Chat area ── */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: 'auto', padding: '0 24px', display: 'flex', flexDirection: 'column' }}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Error banner */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginTop: 16,
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#DC2626',
            }}>
              <AlertCircle size={14} />
              <span style={{ flex: 1 }}>{error}</span>
              <button onClick={() => reset()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <RefreshCw size={13} color="#DC2626" />
              </button>
            </div>
          )}

          {/* Welcome state */}
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 60, flex: 1 }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#18181B', margin: 0 }}>
                {getGreeting()}, {firstName}
              </p>
              <p style={{ fontSize: 14, color: '#71717A', marginTop: 8, fontWeight: 400 }}>
                How can I help?
              </p>

              {/* Intelligence Briefing Card */}
              <div style={{
                marginTop: 32, textAlign: isRTL ? 'right' : 'left',
                background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
                border: '1px solid #DBEAFE', borderRadius: 12, padding: '20px 24px',
              }}>
                <p style={{
                  fontSize: 10, fontWeight: 700, color: '#2563EB', letterSpacing: '1.5px',
                  textTransform: 'uppercase', margin: 0,
                }}>INTELLIGENCE BRIEFING</p>
                <div style={{ width: 24, height: 1.5, background: '#2563EB', margin: '8px 0 12px', borderRadius: 1 }} />
                <p style={{
                  fontSize: 13.5, color: '#374151', lineHeight: 1.65, margin: 0,
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
                      maxWidth: '85%', padding: '12px 18px',
                      borderRadius: '16px 16px 4px 16px', background: '#2563EB',
                      color: '#FFFFFF', fontSize: 14, fontWeight: 400, lineHeight: 1.5,
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
                    width: 6, height: 6, borderRadius: '50%', background: '#2563EB',
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
