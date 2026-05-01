/**
 * QA Assistant Widget — TestHub AI Chat Panel
 * Reuses CATY AI V7 design system (ring-fenced CSS)
 * Renders AI responses with proper markdown formatting.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Minus, RefreshCw, Send, Paperclip } from 'lucide-react';
import { HubIcon } from '@/components/caty-ai/constants';
import '@/components/caty-ai/CatyWidget.css';
import '@/styles/caty.css';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isHtml?: boolean;
}

interface QAAssistantWidgetProps {
  onClose?: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/testhub-qa-ai`;

export function QAAssistantWidget({ onClose }: QAAssistantWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (type: 'user' | 'assistant', content: string, isHtml = false) => {
    setMessages(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      content,
      timestamp: new Date(),
      isHtml,
    }]);
  };

  const updateLastAssistantMessage = (content: string, isHtml = false) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.type === 'assistant') {
        return prev.map((m, i) => i === prev.length - 1 ? { ...m, content, isHtml } : m);
      }
      return [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'assistant' as const,
        content,
        timestamp: new Date(),
        isHtml,
      }];
    });
  };

  const streamChat = async (userMessage: string) => {
    try {
      const allMessages = [
        ...messages.map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content })),
        { role: 'user', content: userMessage }
      ];

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          context: { module: 'TestHub', page: 'QA Assistant' }
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) return false;
        if (resp.status === 402) return false;
        throw new Error('Failed to start stream');
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      let streamDone = false;

      addMessage('assistant', '');

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            updateLastAssistantMessage(assistantContent, true);
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              updateLastAssistantMessage(assistantContent);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              updateLastAssistantMessage(assistantContent, true);
            }
          } catch { /* ignore */ }
        }
      }

      if (assistantContent) {
        updateLastAssistantMessage(assistantContent, true);
      }

      return true;
    } catch (error) {
      console.error('QA AI stream error:', error);
      return false;
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isTyping) return;
    setInputValue('');
    addMessage('user', text);
    setIsTyping(true);

    const success = await streamChat(text);
    if (!success) {
      addMessage('assistant', '<div class="caty-bubble"><p>Sorry, I encountered an issue. Please try again.</p></div>', true);
    }
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = useCallback(() => {
    setIsPanelOpen(false);
    onClose?.();
  }, [onClose]);

  const handleClearChat = () => {
    setMessages([]);
  };

  if (!isPanelOpen) return null;

  // Minimized state
  if (isMinimized) {
    return (
      <button
        className="caty-minimized-btn"
        onClick={() => setIsMinimized(false)}
        title="Open QA Assistant"
        aria-label="Open QA Assistant"
      >
        <div className="caty-minimized-icon">
          <HubIcon />
        </div>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="caty-backdrop-overlay"
        onClick={handleClose}
        aria-hidden="true"
        role="presentation"
      />

      {/* Panel */}
      <div className="caty-widget-container">
        <div className="caty-widget">
          <div className="caty-panel">
            {/* Header */}
            <header className="caty-header-fixed">
              <div className="caty-header-left">
                <div className="caty-header-icon">
                  <svg viewBox="0 0 100 100" fill="none">
                    <line x1="50" y1="50" x2="22" y2="22" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
                    <line x1="50" y1="50" x2="78" y2="22" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
                    <line x1="50" y1="50" x2="22" y2="78" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
                    <line x1="50" y1="50" x2="78" y2="78" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
                    <circle cx="22" cy="22" r="10" fill="white"/>
                    <circle cx="78" cy="22" r="10" fill="white"/>
                    <circle cx="22" cy="78" r="10" fill="white"/>
                    <circle cx="78" cy="78" r="10" fill="white"/>
                    <circle cx="50" cy="50" r="16" fill="white"/>
                    <circle cx="50" cy="50" r="8" fill="var(--ds-text-brand, #2563eb)"/>
                  </svg>
                </div>
                <div className="caty-header-text">
                  <span className="caty-header-title">CATY AI™</span>
                  <span className="caty-header-subtitle">
                    <span className="caty-status-dot"></span>
                    QA Assistant
                  </span>
                </div>
              </div>
              <div className="caty-header-actions">
                <button className="caty-header-btn" onClick={handleClearChat} title="Refresh chat">
                  <RefreshCw size={18} />
                </button>
                <button className="caty-header-btn" onClick={() => setIsMinimized(true)} title="Minimize">
                  <Minus size={18} />
                </button>
              </div>
            </header>

            {/* Messages */}
            <div className="caty-messages">
              {messages.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, margin: '0 auto 16px', background: 'var(--bg-1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 32, height: 32 }}>
                      <HubIcon />
                    </div>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-1)', marginBottom: 8 }}>
                    QA Assistant
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.5, maxWidth: 280, margin: '0 auto 24px' }}>
                    Ask me about test cases, cycles, defects, execution status, and coverage — all grounded in your TestHub data.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      'How many test cases are unassigned?',
                      'What is the current cycle status?',
                      'Show me a weekly execution summary',
                      'Which defects are still open?',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInputValue(suggestion);
                          addMessage('user', suggestion);
                          setIsTyping(true);
                          streamChat(suggestion).then(success => {
                            if (!success) {
                              addMessage('assistant', '<div class="caty-bubble"><p>Sorry, please try again.</p></div>', true);
                            }
                            setIsTyping(false);
                          });
                        }}
                        style={{
                          padding: '10px 16px',
                          border: '1px solid var(--divider)',
                          borderRadius: 12,
                          backgroundColor: 'var(--bg-app)',
                          fontSize: 13,
                          color: 'var(--fg-2)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 150ms',
                        }}
                        onMouseEnter={e => {
                          (e.target as HTMLButtonElement).style.borderColor = 'var(--cp-blue)';
                          (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-1)';
                        }}
                        onMouseLeave={e => {
                          (e.target as HTMLButtonElement).style.borderColor = 'var(--divider)';
                          (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-app)';
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <div key={msg.id} className={`caty-message ${msg.type}`}>
                      {msg.type === 'assistant' && (
                        <div className="caty-avatar assistant">
                          <HubIcon />
                        </div>
                      )}
                      <div className="caty-msg-body">
                        {msg.type === 'assistant' ? (
                          <div className="caty-bubble caty-enterprise-prose">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="caty-bubble">
                            <p>{msg.content}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="caty-message assistant">
                      <div className="caty-avatar assistant">
                        <HubIcon />
                      </div>
                      <div className="caty-msg-body">
                        <div className="caty-thinking">
                          <div className="caty-thinking-header">
                            <svg className="caty-thinking-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                            </svg>
                            <span>Analyzing your question...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="caty-input-area">
              <div className="caty-input-wrapper">
                <button className="caty-input-btn" aria-label="Attach file">
                  <Paperclip size={22} />
                </button>
                <div className="caty-input-field">
                  <textarea
                    value={inputValue}
                    onChange={(e) => {
                      const textarea = e.target;
                      textarea.style.height = 'auto';
                      textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
                      setInputValue(textarea.value);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about test cases, defects, coverage..."
                    rows={1}
                    aria-label="Message input"
                  />
                </div>
                <button
                  className="caty-send-btn"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
                  aria-label="Send message"
                >
                  <Send size={22} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
