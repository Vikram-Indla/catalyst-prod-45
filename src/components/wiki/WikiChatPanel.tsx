import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { page_id?: string; title?: string; confidence?: number; slug?: string }[];
  loading?: boolean;
}

export function WikiChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || sending) return;
    setInput('');
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: q };
    const loadingMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('kb-query', {
        body: { query: q, top_k: 5 },
      });
      if (error) throw error;
      const answer = data?.answer || data?.response || 'I couldn\'t find relevant information. Try rephrasing your question.';
      const sources = (data?.sources || data?.chunks || []).slice(0, 3).map((s: any) => ({
        page_id: s.page_id,
        title: s.title || s.source_title || 'Source',
        confidence: s.confidence || s.score,
        slug: s.slug,
      }));
      setMessages(prev => prev.map(m => m.id === loadingMsg.id ? { ...m, content: answer, sources, loading: false } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === loadingMsg.id ? { ...m, content: 'Sorry, something went wrong. Please try again.', loading: false } : m));
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 80, right: 24, width: 380, height: 520,
      background: isDark ? '#1A1A1A' : 'var(--cp-float)', borderRadius: 12, zIndex: 51,
      border: `0.75px solid ${border}`,
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: `0.75px solid ${border}`,
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--cp-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MessageCircle size={14} style={{ color: '#FFFFFF' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}>Ask Catalyst</div>
          <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>Knowledge assistant</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: 'var(--fg-3)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,23,42,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--fg-4)', fontSize: 12 }}>
            Ask anything about ministry regulations, processes, or policies.
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
          }}>
            <div style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 12.5, lineHeight: 1.5,
              background: m.role === 'user' ? 'var(--cp-blue)' : 'var(--cp-bd-zone)',
              color: m.role === 'user' ? '#FFFFFF' : 'var(--fg-1)',
            }}>
              {m.loading ? (
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--fg-3)' }} />
              ) : (
                <div className="prose prose-sm max-w-none" style={{ fontSize: 12.5 }}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
            {/* Sources */}
            {m.sources && m.sources.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {m.sources.map((s, i) => (
                  <div key={i} onClick={() => s.slug && navigate(`/wiki/${s.slug}`)}
                    style={{
                      fontSize: 10, color: 'var(--cp-blue)', cursor: s.slug ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>📄 {s.title}</span>
                    {s.confidence != null && (
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--fg-3)' }}>
                        {Math.round((s.confidence ?? 0) * 100)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px', borderTop: `0.75px solid ${border}`,
        display: 'flex', gap: 8, flexShrink: 0,
      }}>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          placeholder="Ask a question..."
          style={{
            flex: 1, height: 50, padding: '8px 12px', borderRadius: 8, fontSize: 12.5,
            border: `0.75px solid ${border}`, outline: 'none', fontFamily: 'Inter, sans-serif',
            background: isDark ? '#0A0A0A' : 'var(--bg-1)', color: isDark ? '#EDEDED' : undefined,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--cp-blue)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        <button onClick={handleSend} disabled={sending || !input.trim()} style={{
          width: 36, height: 50, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'var(--cp-blue)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: sending || !input.trim() ? 0.5 : 1,
        }}>
          <Send size={14} />
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
