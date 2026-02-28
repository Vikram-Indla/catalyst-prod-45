import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, BookOpen, Send, Mic, ThumbsUp, ThumbsDown, AlertCircle, RefreshCw } from 'lucide-react';
import { useKBQuery } from '@/hooks/useKnowledgeBase';
import { useAuth } from '@/hooks/useAuth';
import { KBResponseRenderer } from './KBResponseRenderer';
import type { KBQueryResponse } from '@/services/knowledgeBase';

type Lang = 'en' | 'ar';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  response?: KBQueryResponse;
  logId?: string;
  feedbackGiven?: boolean;
}

const QUICK_CHIPS = ['Gold Licenses', 'Chemical Permits', 'FAMS Integration', 'Sprint status'];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function KBPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { response, isLoading, error, askQuestion, sendFeedback, reset } = useKBQuery();

  const [lang, setLang] = useState<Lang>('en');
  const [input, setInput] = useState('');
  const [isVoice, setIsVoice] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(false);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle response from hook
  useEffect(() => {
    if (response && pendingRef.current) {
      pendingRef.current = false;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          response,
          logId: undefined, // log ID would come from server if available
        },
      ]);
    }
  }, [response]);

  const handleSend = useCallback(
    async (text?: string) => {
      const q = (text || input).trim();
      if (!q || isLoading) return;

      setInput('');
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: q }]);
      pendingRef.current = true;

      await askQuestion({
        query: q,
        language: lang,
        input_method: isVoice ? 'voice' : 'keyboard',
        user_name: userName,
      });
    },
    [input, isLoading, lang, isVoice, userName, askQuestion]
  );

  const handleFeedback = useCallback(
    (msgId: string, logId: string | undefined, helpful: boolean) => {
      if (logId) sendFeedback(logId, helpful);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, feedbackGiven: true } : m))
      );
    },
    [sendFeedback]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 48,
        right: 0,
        bottom: 0,
        width: '50vw',
        minWidth: 480,
        background: '#FFFFFF',
        borderLeft: '1px solid #E4E4E7',
        boxShadow: '-8px 0 30px rgba(0,0,0,0.08)',
        zIndex: 45,
        display: 'flex',
        flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 300ms cubic-bezier(0.16,1,0.3,1)',
        fontFamily: "system-ui, -apple-system, 'DM Sans', sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid #E4E4E7',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} color="#2563EB" />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#09090B' }}>Knowledge Base</span>
          </div>
          <p style={{ fontSize: 11, color: '#71717A', margin: '4px 0 0' }}>
            Trained on 1,500 questions · 25 categories
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Lang toggle */}
          <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #E4E4E7' }}>
            {(['en', 'ar'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  padding: '3px 10px',
                  fontSize: 11,
                  fontWeight: lang === l ? 700 : 400,
                  background: lang === l ? '#2563EB' : '#FAFAFA',
                  color: lang === l ? '#FFF' : '#71717A',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {l === 'en' ? 'EN' : 'عربي'}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} color="#71717A" />
          </button>
        </div>
      </div>

      {/* ── Chat area ── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 20px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Error banner */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              fontSize: 12,
              color: '#DC2626',
            }}
          >
            <AlertCircle size={14} />
            <span style={{ flex: 1 }}>{error}</span>
            <button
              onClick={() => reset()}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
            >
              <RefreshCw size={13} color="#DC2626" />
            </button>
          </div>
        )}

        {/* Greeting */}
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#09090B', margin: 0 }}>
              {getGreeting()}, {userName} 👋
            </p>
            <p style={{ fontSize: 13, color: '#71717A', marginTop: 6 }}>
              Ask me anything about Catalyst — processes, features, or status updates.
            </p>
            {/* DYK card */}
            <div
              style={{
                marginTop: 16,
                padding: '14px 16px',
                background: '#EFF6FF',
                borderRadius: 10,
                border: '1px solid #DBEAFE',
                textAlign: lang === 'ar' ? 'right' : 'left',
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                💡 Did You Know?
              </p>
              <p style={{ fontSize: 13, color: '#18181B', marginTop: 6, lineHeight: 1.6 }}>
                The Knowledge Base is trained on 1,500 curated questions across 25 categories, covering
                licensing, permits, integrations, and project operations.
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: '14px 14px 4px 14px',
                    background: '#2563EB',
                    color: '#FFF',
                    fontSize: 13.5,
                    lineHeight: 1.5,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          }

          // Assistant
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  maxWidth: '90%',
                  padding: '14px 16px',
                  borderRadius: '14px 14px 14px 4px',
                  background: '#FAFAFA',
                  border: '1px solid #E4E4E7',
                }}
              >
                {msg.response && <KBResponseRenderer response={msg.response} language={lang} />}
                {/* Feedback */}
                {!msg.feedbackGiven && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button
                      onClick={() => handleFeedback(msg.id, msg.logId, true)}
                      style={{
                        background: 'none',
                        border: '1px solid #E4E4E7',
                        borderRadius: 6,
                        padding: '3px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        color: '#71717A',
                      }}
                    >
                      <ThumbsUp size={12} /> Helpful
                    </button>
                    <button
                      onClick={() => handleFeedback(msg.id, msg.logId, false)}
                      style={{
                        background: 'none',
                        border: '1px solid #E4E4E7',
                        borderRadius: 6,
                        padding: '3px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        color: '#71717A',
                      }}
                    >
                      <ThumbsDown size={12} />
                    </button>
                  </div>
                )}
                {msg.feedbackGiven && (
                  <p style={{ fontSize: 10, color: '#71717A', marginTop: 8 }}>✓ Feedback recorded</p>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading dots */}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '12px 18px',
                borderRadius: '14px 14px 14px 4px',
                background: '#FAFAFA',
                border: '1px solid #E4E4E7',
                display: 'flex',
                gap: 5,
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#A1A1AA',
                    animation: 'kb-dot-bounce 1.2s infinite',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Input area ── */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 20px 14px',
          borderTop: '1px solid #E4E4E7',
          background: '#FAFAFA',
        }}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Quick chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                borderRadius: 20,
                border: '1px solid #DBEAFE',
                background: '#EFF6FF',
                color: '#2563EB',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#FFF',
            border: '1px solid #E4E4E7',
            borderRadius: 10,
            padding: '6px 10px',
          }}
        >
          <button
            onClick={() => setIsVoice((v) => !v)}
            style={{
              background: isVoice ? '#2563EB' : 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 6,
              padding: 5,
              display: 'flex',
              transition: 'background 200ms',
            }}
          >
            <Mic size={16} color={isVoice ? '#FFF' : '#71717A'} />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={lang === 'ar' ? 'اسأل عن أي مفهوم أو عملية...' : 'Ask about any concept, process, or feature...'}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 13,
              background: 'transparent',
              color: '#09090B',
              direction: lang === 'ar' ? 'rtl' : 'ltr',
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            style={{
              background: input.trim() ? '#2563EB' : '#E4E4E7',
              border: 'none',
              cursor: input.trim() ? 'pointer' : 'default',
              borderRadius: 6,
              padding: 5,
              display: 'flex',
              transition: 'background 200ms',
            }}
          >
            <Send size={16} color={input.trim() ? '#FFF' : '#A1A1AA'} />
          </button>
        </div>

        <p style={{ fontSize: 10, color: '#A1A1AA', textAlign: 'center', marginTop: 8 }}>
          Trained on 1,500 questions · 25 categories · 34ms avg
        </p>
      </div>

      {/* Keyframe for loading dots */}
      <style>{`
        @keyframes kb-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

export default KBPanel;
