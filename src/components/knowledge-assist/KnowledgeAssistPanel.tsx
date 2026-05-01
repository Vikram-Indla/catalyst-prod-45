import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Mic, Send, RefreshCw, Loader2 } from 'lucide-react';
import { KAItemDetailPanel } from './KAItemDetailPanel';
import { useUserContext } from '../home/hooks/useUserContext';
import { ProjectBriefingView } from '../home/ProjectBriefingView';
import { QueryResultRenderer } from '../home/QueryResultRenderers';
import { processPersonalizedQuery, type QueryResult } from '../home/PersonalizedQueryProcessor';

type ViewState = 'land' | 'chat';

const F = {
  inter: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
  sora: "'Sora', sans-serif",
};

export function KnowledgeAssistPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data: userCtx, isLoading: userLoading, refetch: refetchUser } = useUserContext();

  const [view, setView] = useState<ViewState>('land');
  const [input, setInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text?: string; result?: QueryResult }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setView('land');
      setInput('');
      setChatMessages([]);
      setSelectedItemKey(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages, isProcessing]);

  const handleRefresh = useCallback(() => {
    refetchUser();
    setView('land');
    setChatMessages([]);
  }, [refetchUser]);

  const handleSend = useCallback(async (text?: string) => {
    const q = (text || input).trim();
    if (!q || !userCtx || isProcessing) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Check for item key pattern
    if (/^[A-Z]+-\d+$/i.test(q)) {
      setView('chat');
      setChatMessages(prev => [...prev, { role: 'user', text: q }]);
      setSelectedItemKey(q.toUpperCase());
      return;
    }

    setView('chat');
    setChatMessages(prev => [...prev, { role: 'user', text: q }]);
    setIsProcessing(true);

    try {
      const result = await processPersonalizedQuery(q, userCtx);
      setChatMessages(prev => [...prev, { role: 'assistant', result }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', result: { type: 'error', title: 'Something went wrong', message: 'Please try again.' } }]);
    } finally {
      setIsProcessing(false);
    }
  }, [input, userCtx, isProcessing]);

  const handleFollowUp = useCallback((query: string) => {
    handleSend(query);
  }, [handleSend]);

  const handleItemClick = useCallback((key: string) => {
    setSelectedItemKey(key);
  }, []);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }, []);

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

  // Effective role for header display
  const effectiveRole = userCtx
    ? (userCtx.role === 'admin' || userCtx.role === 'authenticated' ? 'Team Member' : userCtx.role)
    : '';

  return (
    <>
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

      <div
        className="knowledge-assist-panel"
        role="complementary"
        aria-label="Knowledge Assist"
        style={{
          position: 'fixed', top: 48, right: 0, bottom: 0,
          width: '50vw', minWidth: 480, maxWidth: 960,
          background: 'var(--bg-1)',
          borderLeft: '1px solid rgba(15,23,42,0.12)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.06)',
          zIndex: 50, display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0,0,0.2,1)',
          fontFamily: F.inter,
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--divider)',
          flexShrink: 0, background: 'var(--bg-app)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {view === 'chat' && (
              <button onClick={() => { setView('land'); setChatMessages([]); }} className="ka-icon-btn"
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--divider)', background: 'var(--bg-app)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span style={{ fontSize: 14, color: 'var(--fg-3)' }}>←</span>
              </button>
            )}
            {/* CATY AI icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: 'var(--cp-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
                <line x1="50" y1="50" x2="22" y2="22" stroke="rgba(255,255,255,0.45)" strokeWidth="4" strokeLinecap="round"/>
                <line x1="50" y1="50" x2="78" y2="22" stroke="rgba(255,255,255,0.45)" strokeWidth="4" strokeLinecap="round"/>
                <line x1="50" y1="50" x2="22" y2="78" stroke="rgba(255,255,255,0.45)" strokeWidth="4" strokeLinecap="round"/>
                <line x1="50" y1="50" x2="78" y2="78" stroke="rgba(255,255,255,0.45)" strokeWidth="4" strokeLinecap="round"/>
                <circle cx="22" cy="22" r="10" fill="white" opacity="0.9"/>
                <circle cx="78" cy="22" r="10" fill="white" opacity="0.9"/>
                <circle cx="22" cy="78" r="10" fill="white" opacity="0.9"/>
                <circle cx="78" cy="78" r="10" fill="white" opacity="0.9"/>
                <circle cx="50" cy="50" r="16" fill="white"/>
                <circle cx="50" cy="50" r="8" fill="var(--ds-text-brand, var(--ds-text-brand, #2563EB))"/>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.01em', fontFamily: F.sora }}>
                Knowledge Assist
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--fg-3)', fontFamily: F.inter }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cp-blue)', flexShrink: 0, animation: 'ka-pulse 2s infinite' }} />
                {userCtx ? `${effectiveRole} · Live` : 'Connecting...'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={handleRefresh} title="Refresh data" aria-label="Refresh" className="ka-icon-btn"
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--divider)', background: 'var(--bg-app)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 80ms' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; }}
            >
              <RefreshCw size={15} strokeWidth={2} color="#8B8FA3" />
            </button>
            <button onClick={onClose} aria-label="Close" className="ka-icon-btn"
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--divider)', background: 'var(--bg-app)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 80ms' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; }}
            >
              <X size={15} strokeWidth={2} color="#8B8FA3" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div ref={scrollRef} className="ka-scroll-area" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* ═══ LOADING ═══ */}
          {userLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 40 }}>
              <Loader2 size={24} color="#4C6EF5" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}

          {/* ═══ BRIEFING VIEW (NEW: hierarchy-driven, project-grouped) ═══ */}
          {!userLoading && view === 'land' && userCtx && (
            <ProjectBriefingView
              onItemClick={handleItemClick}
              onPresetClick={q => handleSend(q)}
            />
          )}

          {/* ═══ CHAT VIEW ═══ */}
          {!userLoading && view === 'chat' && (
            <div style={{ padding: '16px 24px', flex: 1 }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  {msg.role === 'user' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', animation: 'ka-msg-in 200ms ease' }}>
                      <div style={{
                        maxWidth: '85%', padding: '10px 16px',
                        borderRadius: '8px 8px 3px 8px', background: 'var(--cp-blue)',
                        color: 'var(--ds-surface, var(--ds-surface, #FFFFFF))', fontSize: 13, fontWeight: 500, lineHeight: 1.5,
                        fontFamily: F.inter,
                      }}>{msg.text}</div>
                    </div>
                  )}
                  {msg.role === 'assistant' && msg.result && (
                    <QueryResultRenderer
                      result={msg.result}
                      onItemClick={handleItemClick}
                      onFollowUp={handleFollowUp}
                    />
                  )}
                </div>
              ))}

              {isProcessing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', animation: 'ka-msg-in 200ms ease' }}>
                  <Loader2 size={16} color="#4C6EF5" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: F.inter }}>Searching your projects...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{ borderTop: '1px solid var(--divider)', padding: '16px 20px', flexShrink: 0, background: 'var(--bg-app)' }}>
          <div
            style={{
              display: 'flex', alignItems: 'flex-end', gap: 8,
              background: 'var(--bg-1)', border: '1.5px solid #ECEEF2',
              borderRadius: 12, padding: '12px 16px', minHeight: 52,
              transition: 'border-color 200ms, box-shadow 200ms',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--cp-blue)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76,110,245,0.12)';
              e.currentTarget.style.background = 'var(--bg-app)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--divider)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.background = 'var(--bg-1)';
            }}
          >
            <button
              onClick={toggleListening}
              aria-label={isListening ? 'Stop listening' : 'Voice input'}
              className="ka-icon-btn"
              style={{
                width: 36, height: 50, borderRadius: 8, flexShrink: 0,
                border: 'none', background: isListening ? 'rgba(207,19,34,0.10)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Mic size={18} strokeWidth={2} color={isListening ? '#CF1322' : '#8B8FA3'} />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask about your work, team, or projects..."
              aria-label="Ask a question"
              rows={1}
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontSize: 14, color: 'var(--fg-1)', fontFamily: F.inter,
                resize: 'none', minHeight: 32, lineHeight: 1.5,
                padding: '4px 0', boxShadow: 'none',
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isProcessing}
              aria-label="Send message"
              className="ka-icon-btn"
              style={{
                width: 36, height: 50, borderRadius: 8, flexShrink: 0,
                border: 'none',
                background: input.trim() ? 'var(--cp-blue)' : 'rgba(15,23,42,0.06)',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 80ms',
              }}
            >
              <Send size={18} strokeWidth={2} color={input.trim() ? 'var(--ds-surface, var(--ds-surface, #FFFFFF))' : '#8B8FA3'} />
            </button>
          </div>
        </div>

        {/* Item Detail Panel */}
        {selectedItemKey && (
          <KAItemDetailPanel
            issueKey={selectedItemKey}
            onClose={() => setSelectedItemKey(null)}
          />
        )}

        <style>{`
          @keyframes ka-overlay-in { from { opacity: 0 } to { opacity: 1 } }
          @keyframes ka-msg-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
          @keyframes ka-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
          .ka-icon-btn:focus-visible { outline: 2px solid #4C6EF5; outline-offset: 2px; }
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
