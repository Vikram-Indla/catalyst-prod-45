/**
 * Caty AI V7 — Main Widget Component
 * Powered by Lovable AI Gateway (Gemini 3 Flash)
 */

import React, { useState, useEffect, useRef } from 'react';
import { CatyContext } from './types';
import { useCatySession } from './useCatySession';
import { useCatyToast } from './useCatyToast';
import { CatyHeader } from './CatyHeader';
import { CatyContextBar } from './CatyContextBar';
import { CatyMessageComponent } from './CatyMessage';
import { CatyThinking } from './CatyThinking';
import { CatyInputArea } from './CatyInputArea';
import { CatySuggestionsBar } from './CatySuggestionsBar';
import { CatyEmpty } from './CatyEmpty';
import { CatyHistoryPanel } from './CatyHistoryPanel';
import { RESPONSES } from './responses';
import './caty-ai-v7.css';
import './caty-ai-v7-overrides.css';
import './CatyOverrides.css';

interface CatyWidgetProps {
  initialContext?: CatyContext;
  onAction?: (action: string) => void;
  onClose?: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/caty-ai-chat`;

export function CatyWidget({ initialContext, onAction, onClose }: CatyWidgetProps) {
  const defaultContext: CatyContext = {
    department: 'Delivery Department',
    period: 'Q1 2026',
    view: 'Utilization View',
  };

  const {
    messages,
    addMessage,
    updateLastAssistantMessage,
    saveSession,
    loadSession,
    getSessions,
    clearHistory,
    context,
  } = useCatySession(initialContext || defaultContext);

  const { showToast } = useCatyToast();
  const [isTyping, setIsTyping] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [failedQueries, setFailedQueries] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Connection restored');
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) saveSession();
  }, [messages, saveSession]);

  useEffect(() => {
    (window as any).catyAction = (action: string) => {
      onAction?.(action);
      showToast('Action initiated');
    };
    return () => {
      delete (window as any).catyAction;
    };
  }, [onAction, showToast]);

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
          context: {
            department: context.department,
            period: context.period,
            view: context.view
          }
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          showToast('Rate limit exceeded, please try again later.');
          return false;
        }
        if (resp.status === 402) {
          showToast('Usage limit reached. Please add credits.');
          return false;
        }
        throw new Error('Failed to start stream');
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      let streamDone = false;

      // Create initial assistant message
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
              updateLastAssistantMessage(assistantContent);
            }
          } catch { /* ignore */ }
        }
      }

      return true;
    } catch (error) {
      console.error('Stream error:', error);
      return false;
    }
  };

  const handleSend = async (text: string) => {
    addMessage('user', text);
    setIsTyping(true);

    const success = await streamChat(text);
    
    if (!success) {
      // Fallback to keyword matching if AI fails
      processQueryFallback(text);
    }
    
    setIsTyping(false);
  };

  const processQueryFallback = (text: string) => {
    const l = text.toLowerCase();
    let responded = false;

    if (l.includes('forecast') || l.includes('q2')) {
      addMessage('assistant', RESPONSES.forecast(context.department, 'Q2 2026'), true);
      responded = true;
    } else if (l.includes('expiring') || l.includes('contract')) {
      addMessage('assistant', RESPONSES.contracts(), true);
      responded = true;
    } else if (l.includes('.net') || l.includes('available') || l.includes('replacement')) {
      addMessage('assistant', RESPONSES.resources(), true);
      responded = true;
    }

    if (!responded) {
      addMessage('assistant', RESPONSES.fallback(text));
      setFailedQueries(prev => prev + 1);
      if (failedQueries >= 2) {
        setTimeout(() => {
          addMessage('assistant', RESPONSES.escalation(), true);
        }, 800);
        setFailedQueries(0);
      }
    } else {
      setFailedQueries(0);
    }
  };

  const handleEscalate = () => {
    addMessage('assistant', RESPONSES.escalation(), true);
  };

  return (
    <div className="caty-widget">
      <div className="caty-panel">
        {!isOnline && (
          <div className="caty-offline">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            </svg>
            <span>Connection lost. Attempting to reconnect...</span>
          </div>
        )}

        <CatyHeader
          onHistoryClick={() => setIsHistoryOpen(true)}
          onEscalateClick={handleEscalate}
          onMinimizeClick={() => onClose?.()}
          isOnline={isOnline}
        />

        <CatyContextBar context={context} />

        <div className="caty-messages">
          {messages.length === 0 ? (
            <CatyEmpty onSuggestionClick={handleSend} />
          ) : (
            <>
              {messages.map(msg => (
                <CatyMessageComponent key={msg.id} message={msg} />
              ))}
              {isTyping && <CatyThinking />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <CatySuggestionsBar
          suggestions={[
            { text: 'View Expiring Contracts', variant: 'alert', onClick: () => handleSend('Show expiring contracts') },
            { text: 'Find .NET Resources', onClick: () => handleSend('Find available .NET developers') },
            { text: 'Q2 Forecast', onClick: () => handleSend('Show Q2 capacity forecast') },
            { text: 'Connect to Specialist', variant: 'escalate', onClick: handleEscalate },
          ]}
        />

        <CatyInputArea onSend={handleSend} disabled={!isOnline || isTyping} />

        <CatyHistoryPanel
          isOpen={isHistoryOpen}
          sessions={getSessions()}
          onClose={() => setIsHistoryOpen(false)}
          onLoad={id => {
            loadSession(id);
            setIsHistoryOpen(false);
            showToast('Conversation loaded');
          }}
          onClear={() => {
            clearHistory();
            showToast('History cleared');
          }}
        />
      </div>
    </div>
  );
}
